import { randomUUID } from "node:crypto";
import { config } from "../config/aiConfig.js";
import { getMongoCollection } from "./mongoClient.js";

const PENDING_REPLY_TTL_MS = 24 * 60 * 60 * 1000;

async function getCollection() {
  return getMongoCollection(config.mongodbPendingRepliesCollection);
}

function expiryDate(now = new Date()) {
  return new Date(now.getTime() + PENDING_REPLY_TTL_MS);
}

/**
 * Adds a user message to that user's short-lived reply buffer. There is only
 * one buffer document per user, regardless of how many messages they send.
 */
export async function queueUserMessage(userId, text, messageId) {
  const now = new Date();
  const replyAt = new Date(now.getTime() + config.messengerReplyDebounceMs);
  const message = { id: messageId, text, receivedAt: now };
  const collection = await getCollection();

  await collection.updateOne(
    { userId },
    [
      {
        $set: {
          userId: { $ifNull: ["$userId", userId] },
          createdAt: { $ifNull: ["$createdAt", now] },
          messages: {
            $slice: [
              { $concatArrays: [{ $ifNull: ["$messages", []] }, [message]] },
              -config.messengerPendingMessageLimit,
            ],
          },
          // Do not interrupt a reply already being generated. The new message
          // stays in the buffer and will be handled by the next job.
          status: {
            $cond: [
              { $eq: [{ $ifNull: ["$status", "pending"] }, "processing"] },
              "processing",
              "pending",
            ],
          },
          hasPendingMessages: true,
          replyAt: {
            $cond: [
              { $gt: [{ $ifNull: ["$pausedUntil", new Date(0)] }, replyAt] },
              "$pausedUntil",
              replyAt,
            ],
          },
          updatedAt: now,
          expiresAt: expiryDate(now),
        },
      },
    ],
    { upsert: true }
  );
}

/** Records the 10-minute human-admin handoff without creating chat history. */
export async function pauseUserReplies(userId) {
  const now = new Date();
  const pausedUntil = new Date(now.getTime() + config.messengerAdminPauseMs);
  const collection = await getCollection();

  await collection.updateOne(
    { userId },
    {
      $setOnInsert: {
        userId,
        messages: [],
        status: "idle",
        hasPendingMessages: false,
        createdAt: now,
      },
      $set: {
        pausedUntil,
        updatedAt: now,
        expiresAt: expiryDate(now),
      },
      // A pending reply must not run before the latest human handoff expires.
      $max: { replyAt: pausedUntil },
    },
    { upsert: true }
  );
}

/**
 * Atomically claims one due reply. A separate claim prevents two scheduler
 * runs (or future app instances) from replying to the same user at once.
 */
export async function claimNextDueReply() {
  const now = new Date();
  const collection = await getCollection();
  const candidate = await collection.findOne(
    {
      status: "pending",
      hasPendingMessages: true,
      replyAt: { $lte: now },
    },
    { sort: { replyAt: 1 } }
  );

  if (!candidate) {
    return null;
  }

  if (candidate.pausedUntil && candidate.pausedUntil > now) {
    await collection.updateOne(
      { _id: candidate._id, status: "pending" },
      { $set: { replyAt: candidate.pausedUntil, updatedAt: now } }
    );
    return null;
  }

  const claimId = randomUUID();
  const job = await collection.findOneAndUpdate(
    {
      _id: candidate._id,
      status: "pending",
      hasPendingMessages: true,
      replyAt: { $lte: now },
      $or: [{ pausedUntil: { $exists: false } }, { pausedUntil: { $lte: now } }],
    },
    {
      $set: {
        status: "processing",
        hasPendingMessages: false,
        claimId,
        claimedAt: now,
        leaseUntil: new Date(now.getTime() + config.messengerReplyLeaseMs),
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  return job || null;
}

export async function wasPausedAfterClaim(userId, claimedAt) {
  const collection = await getCollection();
  const state = await collection.findOne(
    { userId },
    { projection: { pausedUntil: 1 } }
  );
  return Boolean(state?.pausedUntil && state.pausedUntil > claimedAt);
}

export async function releaseClaim(job, retryDelayMs = config.messengerReplyRetryMs) {
  const collection = await getCollection();
  const now = new Date();
  await collection.updateOne(
    { _id: job._id, status: "processing", claimId: job.claimId },
    {
      $set: {
        status: "pending",
        hasPendingMessages: true,
        replyAt: new Date(now.getTime() + retryDelayMs),
        updatedAt: now,
      },
      $unset: { claimId: "", claimedAt: "", leaseUntil: "" },
    }
  );
}

/** Removes only the messages included in this claim, preserving newer ones. */
export async function completeClaim(job) {
  const claimedMessageIds = job.messages.map((message) => message.id);
  const collection = await getCollection();
  const now = new Date();

  await collection.updateOne(
    { _id: job._id, status: "processing", claimId: job.claimId },
    [
      {
        $set: {
          messages: {
            $filter: {
              input: "$messages",
              as: "message",
              cond: { $not: [{ $in: ["$$message.id", claimedMessageIds] }] },
            },
          },
        },
      },
      {
        $set: {
          hasPendingMessages: { $gt: [{ $size: "$messages" }, 0] },
          status: {
            $cond: [{ $gt: [{ $size: "$messages" }, 0] }, "pending", "idle"],
          },
          replyAt: {
            $cond: [{ $gt: [{ $size: "$messages" }, 0] }, "$replyAt", null],
          },
          updatedAt: now,
          lastReplyAt: now,
          expiresAt: expiryDate(now),
        },
      },
      { $unset: ["claimId", "claimedAt", "leaseUntil"] },
    ]
  );
}
