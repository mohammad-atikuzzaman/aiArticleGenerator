import cron from "node-cron";
import { createServer } from "http";
import { generateMonthlyTopics } from "./service/generateMonthlyTopics.js";
import fs from "fs/promises";
import path from "path";
import { generateArticle } from "./service/generateArticle.js";
import { generateMessengerReply } from "./service/generateMessengerReply.js";
import {
  addConversationMessage,
  getConversationContext,
} from "./service/conversationStore.js";
import { config } from "./config/aiConfig.js";
import { createPublicPost } from "./utills/facebookPoster.js";
import { sendMessengerReply } from "./utills/messengerResponder.js";

const TOPICS_FILE = path.join(process.cwd(), "topics.json");
const TIMEZONE = "Asia/Dhaka";
const DAILY_POST_TIME = "0 21 * * *";
const WEBHOOK_PATH = "/webhook";
const MESSAGE_DEDUPE_TTL_MS = 1000 * 60 * 60;
const processedMessageIds = new Map();

async function loadTopics() {
  try {
    const data = await fs.readFile(TOPICS_FILE, "utf-8");
    const topics = JSON.parse(data);
    return Array.isArray(topics) ? topics : [];
  } catch {
    console.log("topics.json not found or invalid. Initializing empty list.");
    return [];
  }
}

async function saveTopics(topics) {
  await fs.writeFile(TOPICS_FILE, JSON.stringify(topics, null, 2), "utf-8");
}

async function getNextTopic() {
  let topics = await loadTopics();

  if (topics.length === 0) {
    console.log("No topics available. Generating 30 service-focused Bangla topics...");
    topics = await generateMonthlyTopics();
    await saveTopics(topics);
    console.log(`Successfully generated and saved ${topics.length} topics to topics.json`);
  }

  const topic = topics.shift();
  await saveTopics(topics);

  return { topic, remaining: topics.length };
}

async function runGenerator() {
  try {
    console.log(
      "Starting new text post cycle at:",
      new Date().toLocaleString("en-US", { timeZone: TIMEZONE })
    );

    const { topic, remaining } = await getNextTopic();

    console.log(`Selected topic for today: ${topic}`);
    console.log(`Remaining topics in queue for future days: ${remaining}`);

    const article = await generateArticle(topic);

    if (!article) {
      console.warn("Article missing. Skipping Facebook post.");
      return;
    }

    console.log(`
topic: ${topic}
article: ${article}`);

    await createPublicPost(article);
  } catch (error) {
    console.error("Problem in main function:", error.message);
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

function rememberMessage(messageId) {
  const now = Date.now();

  for (const [id, expiresAt] of processedMessageIds) {
    if (expiresAt <= now) {
      processedMessageIds.delete(id);
    }
  }

  if (processedMessageIds.has(messageId)) {
    return false;
  }

  processedMessageIds.set(messageId, now + MESSAGE_DEDUPE_TTL_MS);
  return true;
}

async function processMessagingEvent(event) {
  const senderId = event.sender?.id;
  const message = event.message;

  if (!senderId || senderId === config.pageid || !message || message.is_echo) {
    return;
  }

  const messageId = message.mid || `${senderId}:${event.timestamp || Date.now()}`;

  if (!rememberMessage(messageId)) {
    console.log(`Duplicate Messenger event ignored: ${messageId}`);
    return;
  }

  const messageText = message.text?.trim();

  if (!messageText) {
    console.log(`Non-text Messenger event ignored: ${messageId}`);
    return;
  }

  const conversationContext = await getConversationContext(senderId);
  const reply = await generateMessengerReply(messageText, conversationContext);

  await addConversationMessage(senderId, "user", messageText);
  await addConversationMessage(senderId, "assistant", reply);
  await sendMessengerReply(senderId, reply);
}

async function handleWebhookPost(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body);

    sendText(response, 200, "EVENT_RECEIVED");

    if (payload.object !== "page") {
      return;
    }

    const events = payload.entry.flatMap((entry) => entry.messaging || []);
    await Promise.all(events.map(processMessagingEvent));
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

const webhookServer = startWebhookServer();

process.on("SIGTERM", () => {
  console.log("SIGTERM received, exiting gracefully...");
  webhookServer.close(() => process.exit(0));
});
