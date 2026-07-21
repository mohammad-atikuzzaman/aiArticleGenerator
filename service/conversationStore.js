import { config } from "../config/aiConfig.js";
import { createEmbedding } from "./embeddingService.js";
import { getMongoCollection } from "./mongoClient.js";

const MAX_MESSAGES_PER_USER = 60;
const RECENT_MESSAGES_PER_REPLY = 6;
const RELEVANT_MESSAGES_PER_REPLY = 4;

let vectorSearchUnavailable = false;

async function getCollection() {
  return getMongoCollection(config.mongodbConversationsCollection);
}

function normalizeMessage(message) {
  return {
    role: message.role,
    text: message.text,
    createdAt: message.createdAt?.toISOString?.() || message.createdAt,
  };
}

async function getRecentMessages(collection, userId) {
  const messages = await collection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(RECENT_MESSAGES_PER_REPLY)
    .project({ _id: 0, role: 1, text: 1, createdAt: 1 })
    .toArray();

  return messages.reverse().map(normalizeMessage);
}

async function getRelevantMessages(collection, userId, userMessage) {
  if (vectorSearchUnavailable || !userMessage) {
    return [];
  }

  try {
    const safeQuery = String(userMessage).slice(0, 1000);
    const queryVector = await createEmbedding(safeQuery);
    const messages = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: config.mongodbConversationVectorIndex,
            path: "embedding",
            queryVector,
            numCandidates: 50,
            limit: RELEVANT_MESSAGES_PER_REPLY,
            filter: { userId, hasEmbedding: true },
          },
        },
        {
          $project: {
            _id: 0,
            role: 1,
            text: 1,
            createdAt: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray();

    return messages.map(normalizeMessage);
  } catch (error) {
    vectorSearchUnavailable = true;
    console.warn(
      "MongoDB vector search unavailable. Falling back to recent messages only:",
      error.message
    );
    return [];
  }
}

async function trimOldMessages(collection, userId) {
  const oldMessages = await collection
    .find({ userId })
    .sort({ createdAt: -1 })
    .skip(MAX_MESSAGES_PER_USER)
    .project({ _id: 1 })
    .toArray();

  if (oldMessages.length) {
    await collection.deleteMany({
      _id: { $in: oldMessages.map((message) => message._id) },
    });
  }
}

export async function getConversationContext(userId, userMessage = "") {
  if (!config.mongodbUri) {
    console.warn("MONGODB_URI is not set. Skipping conversation memory retrieval.");
    return { recentMessages: [], relevantMemories: [] };
  }
  const collection = await getCollection();

  const [recentMessages, relevantMemories] = await Promise.all([
    getRecentMessages(collection, userId),
    getRelevantMessages(collection, userId, userMessage),
  ]);

  const recentKeys = new Set(
    recentMessages.map((message) => `${message.role}:${message.text}`)
  );

  return {
    recentMessages,
    relevantMemories: relevantMemories.filter(
      (message) => !recentKeys.has(`${message.role}:${message.text}`)
    ),
  };
}

export async function addConversationMessage(userId, role, text, metadata = {}) {
  if (!config.mongodbUri) {
    console.warn("MONGODB_URI is not set. Skipping saving conversation message.");
    return;
  }
  const collection = await getCollection();
  const createdAt = new Date();
  
  const safeText = String(text || "").trim();
  const truncatedText = safeText.length > 1000 ? safeText.slice(0, 1000) + "..." : safeText;
  const shouldEmbed = role === "user" && truncatedText.length >= 12;
  const embedding = shouldEmbed ? await createEmbedding(truncatedText) : null;

  await collection.insertOne({
    userId,
    role,
    text: truncatedText,
    hasEmbedding: Boolean(embedding),
    ...(embedding ? { embedding } : {}),
    createdAt,
    ...metadata,
  });

  await trimOldMessages(collection, userId);
}

export async function getLastHumanInteractionTime(userId) {
  if (!config.mongodbUri) {
    return null;
  }
  try {
    const collection = await getCollection();
    const lastMessage = await collection.findOne(
      { userId, isHumanAdmin: true },
      { sort: { createdAt: -1 } }
    );
    return lastMessage ? new Date(lastMessage.createdAt) : null;
  } catch (error) {
    console.error("Failed to fetch last human interaction time:", error.message);
    return null;
  }
}
