import cron from "node-cron";
import { createServer } from "http";
import { generateMonthlyTopics } from "./service/generateMonthlyTopics.js";
import { generateArticle } from "./service/generateArticle.js";
import { generateMessengerReply } from "./service/generateMessengerReply.js";
import {
  addConversationMessage,
  getConversationContext,
} from "./service/conversationStore.js";
import {
  claimNextDueReply,
  completeClaim,
  pauseUserReplies,
  queueUserMessage,
  releaseClaim,
  wasPausedAfterClaim,
} from "./service/pendingReplyStore.js";
import { rememberIncomingMessage } from "./service/messageDedupeStore.js";
import { createPostLog, updatePostLog } from "./service/postLogStore.js";
import { config } from "./config/aiConfig.js";
import { createPublicPost } from "./utills/facebookPoster.js";
import { sendMessengerReply } from "./utills/messengerResponder.js";
import { initDatabase } from "./service/dbInit.js";
import { addTopics, getNextTopicFromDb } from "./service/topicStore.js";

const TIMEZONE = "Asia/Dhaka";
const DAILY_POST_TIME = "0 21 * * *";
const WEBHOOK_PATH = "/webhook";
const botSentMessageIds = new Set();
let pendingReplyWorkerRunning = false;

async function getNextTopic() {
  let result = await getNextTopicFromDb();

  if (!result) {
    console.log("No topics available in database. Generating 30 service-focused Bangla topics...");
    const topics = await generateMonthlyTopics();
    await addTopics(topics);
    console.log(`Successfully generated and saved ${topics.length} topics to database.`);
    result = await getNextTopicFromDb();
  }

  return result;
}

async function runGenerator() {
  let postLogId = null;

  try {
    postLogId = await createPostLog({
      status: "started",
      startedAt: new Date(),
      timezone: TIMEZONE,
    });

    console.log(
      "Starting new text post cycle at:",
      new Date().toLocaleString("en-US", { timeZone: TIMEZONE })
    );

    const { topic, remaining } = await getNextTopic();

    console.log(`Selected topic for today: ${topic}`);
    console.log(`Remaining topics in queue for future days: ${remaining}`);
    await updatePostLog(postLogId, {
      status: "topic_selected",
      topic,
      remainingTopics: remaining,
    });

    const article = await generateArticle(topic);

    if (!article) {
      console.warn("Article missing. Skipping Facebook post.");
      await updatePostLog(postLogId, {
        status: "skipped",
        reason: "Article missing",
        finishedAt: new Date(),
      });
      return;
    }

    await updatePostLog(postLogId, {
      status: "article_generated",
      article,
    });

    console.log(`
topic: ${topic}
article: ${article}`);

    const facebookResponse = await createPublicPost(article);
    await updatePostLog(postLogId, {
      status: "posted",
      facebookResponse,
      finishedAt: new Date(),
    });
  } catch (error) {
    console.error("Problem in main function:", error.message);
    await updatePostLog(postLogId, {
      status: "failed",
      error: error.message,
      finishedAt: new Date(),
    });
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain" });
  response.end(text);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();

      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function processMessagingEvent(event) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const message = event.message;

  if (!senderId || !message) {
    return;
  }

  // Intercept human admin replies (echo events)
  if (message.is_echo || senderId === config.pageid) {
    const actualUserId = recipientId;
    const messageText = message.text?.trim();
    const messageId = message.mid;

    if (messageId && botSentMessageIds.has(messageId)) {
      // This echo is from our own bot/app. Ignore it since it's already saved during reply generation.
      botSentMessageIds.delete(messageId);
      return;
    }

    if (actualUserId && messageText) {
      console.log(`Human admin reply detected. Saving to conversation memory for user ${actualUserId}: ${messageText}`);
      await addConversationMessage(actualUserId, "assistant", messageText, { isHumanAdmin: true });
      await pauseUserReplies(actualUserId);
    }
    return;
  }

  const messageId = message.mid || `${senderId}:${event.timestamp || Date.now()}`;

  if (!(await rememberIncomingMessage(messageId, senderId))) {
    console.log(`Duplicate Messenger event ignored: ${messageId}`);
    return;
  }

  const messageText = message.text?.trim();

  if (!messageText) {
    console.log(`Non-text Messenger event ignored: ${messageId}`);
    return;
  }

  await queueUserMessage(senderId, messageText, messageId);
  console.log(`Queued Messenger message from ${senderId} for consolidated reply.`);
}

async function processPendingReply(job) {
  const messageText = job.messages.map((message) => message.text).join("\n").trim();
  if (!messageText) {
    await completeClaim(job);
    return;
  }

  try {
    const conversationContext = await getConversationContext(job.userId, messageText);
    const reply = await generateMessengerReply(messageText, conversationContext);

    // Give a newly-arrived human admin message priority over an in-flight job.
    if (await wasPausedAfterClaim(job.userId, job.claimedAt)) {
      console.log(`Pending reply for ${job.userId} deferred because a human admin took over.`);
      await releaseClaim(job, 0);
      return;
    }

    const sentResult = await sendMessengerReply(job.userId, reply);
    if (!sentResult?.message_id) {
      throw new Error("Messenger did not return a message ID.");
    }

    botSentMessageIds.add(sentResult.message_id);
    setTimeout(() => botSentMessageIds.delete(sentResult.message_id), 120000);

    // Delivery succeeded. Do not retry the message just because storing its
    // optional long-term memory has a temporary problem.
    try {
      await addConversationMessage(job.userId, "user", messageText);
      await addConversationMessage(job.userId, "assistant", reply);
    } catch (error) {
      console.error(`Could not save Messenger conversation for ${job.userId}:`, error.message);
    }

    try {
      await completeClaim(job);
    } catch (error) {
      // The message has already reached Messenger. Retrying this claim could
      // send a duplicate reply, so leave it for operational cleanup instead.
      console.error(`Could not finalize Messenger reply for ${job.userId}:`, error.message);
      return;
    }
    console.log(`Sent consolidated Messenger reply to ${job.userId}.`);
  } catch (error) {
    console.error(`Pending Messenger reply failed for ${job.userId}:`, error.message);
    await releaseClaim(job);
  }
}

async function runPendingReplyWorker() {
  if (pendingReplyWorkerRunning) {
    return;
  }

  pendingReplyWorkerRunning = true;
  try {
    const jobs = [];
    for (let index = 0; index < config.messengerReplyConcurrency; index += 1) {
      const job = await claimNextDueReply();
      if (!job) break;
      jobs.push(processPendingReply(job));
    }
    await Promise.all(jobs);
  } catch (error) {
    console.error("Pending reply worker failed:", error.message);
  } finally {
    pendingReplyWorkerRunning = false;
  }
}

function startPendingReplyWorker() {
  if (!config.mongodbUri) {
    console.warn("Pending Messenger reply worker is disabled because MONGODB_URI is not set.");
    return;
  }

  setInterval(runPendingReplyWorker, config.messengerReplyPollMs);
  void runPendingReplyWorker();
  console.log(`Messenger reply worker started (debounce: ${config.messengerReplyDebounceMs / 1000}s).`);
}

async function handleWebhookPost(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body);
    console.log("Webhook POST received payload:", JSON.stringify(payload, null, 2));

    sendText(response, 200, "EVENT_RECEIVED");

    if (payload.object !== "page") {
      console.log("Ignoring non-page object event:", payload.object);
      return;
    }

    const events = payload.entry.flatMap((entry) => entry.messaging || []);
    // Preserve Messenger's event order. This matters when an admin handoff and
    // a user message arrive in the same webhook payload.
    for (const event of events) {
      await processMessagingEvent(event);
    }
  } catch (error) {
    console.error("Webhook POST handling failed:", error.message);

    if (!response.headersSent) {
      sendText(response, 400, "Bad Request");
    }
  }
}

function handleWebhookVerification(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === config.fbVerifyToken) {
    console.log("Facebook webhook verified successfully.");
    sendText(response, 200, challenge);
    return;
  }

  console.warn("Facebook webhook verification failed.");
  sendText(response, 403, "Forbidden");
}

function startWebhookServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === WEBHOOK_PATH && request.method === "GET") {
      handleWebhookVerification(request, response);
      return;
    }

    if (url.pathname === WEBHOOK_PATH && request.method === "POST") {
      await handleWebhookPost(request, response);
      return;
    }

    if (url.pathname === "/" && request.method === "GET") {
      sendJson(response, 200, {
        status: "ok",
        webhook: WEBHOOK_PATH,
        dailyPost: "9:00 PM Asia/Dhaka",
      });
      return;
    }

    sendText(response, 404, "Not Found");
  });

  server.listen(config.port, () => {
    console.log(`Webhook server running on port ${config.port}. Path: ${WEBHOOK_PATH}`);
  });

  return server;
}

// for run the main generator function manually
// (async () => {
//   await runGenerator();
// })();

cron.schedule(
  DAILY_POST_TIME,
  async () => {
    console.log("Daily 9:00 PM post job triggered.");
    await runGenerator();
  },
  {
    timezone: TIMEZONE,
  }
);

console.log("Background worker started. Text posts are scheduled daily at 9:00 PM Asia/Dhaka.");

// Initialize Database connection, warm up indexes, and populate local knowledge cache
await initDatabase().catch((err) => {
  console.error("Initial database configuration failed. Verification indexes and cache might not be fully configured:", err.message);
});

startPendingReplyWorker();

const webhookServer = startWebhookServer();

process.on("SIGTERM", () => {
  console.log("SIGTERM received, exiting gracefully...");
  webhookServer.close(() => process.exit(0));
});
