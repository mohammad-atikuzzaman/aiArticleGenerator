import { getMongoCollection } from "./mongoClient.js";
import { syncKnowledgeBase } from "./knowledgeStore.js";
import { config } from "../config/aiConfig.js";

export async function initDatabase() {
  console.log("Initializing database connection and indexes...");
  
  if (!config.mongodbUri) {
    console.warn("MONGODB_URI is not set. Database integration is disabled.");
    return false;
  }

  try {
    // 1. Initialize message dedupe indexes
    const dedupeCollection = await getMongoCollection(config.mongodbMessageDedupeCollection);
    await Promise.all([
      dedupeCollection.createIndex({ messageId: 1 }, { unique: true }),
      dedupeCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })
    ]);

    // 2. One short-lived reply buffer per active Messenger user.
    const pendingRepliesCollection = await getMongoCollection(config.mongodbPendingRepliesCollection);
    await Promise.all([
      pendingRepliesCollection.createIndex({ userId: 1 }, { unique: true }),
      pendingRepliesCollection.createIndex({ status: 1, hasPendingMessages: 1, replyAt: 1 }),
      pendingRepliesCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);

    // 3. Initialize conversation store indexes
    const conversationsCollection = await getMongoCollection(config.mongodbConversationsCollection);
    await Promise.all([
      conversationsCollection.createIndex({ userId: 1, createdAt: -1 }),
      conversationsCollection.createIndex({ userId: 1, role: 1, createdAt: -1 }),
      conversationsCollection.createIndex({ userId: 1, hasEmbedding: 1, createdAt: -1 }),
    ]);

    // 4. Initialize post log store indexes
    const postLogsCollection = await getMongoCollection(config.mongodbPostLogsCollection);
    await Promise.all([
      postLogsCollection.createIndex({ status: 1, createdAt: -1 }),
      postLogsCollection.createIndex({ topic: 1, createdAt: -1 }),
      postLogsCollection.createIndex({ createdAt: -1 }),
    ]);

    // 5. Initialize knowledge store indexes
    const knowledgeCollection = await getMongoCollection(config.mongodbKnowledgeCollection);
    await Promise.all([
      knowledgeCollection.createIndex({ key: 1 }, { unique: true }),
      knowledgeCollection.createIndex({ source: 1, active: 1 }),
      knowledgeCollection.createIndex({ title: "text", text: "text" }) // For local/fallback BM25 matching
    ]);

    // 6. Initialize topics collection indexes
    const topicsCollection = await getMongoCollection(config.mongodbTopicsCollection);
    await Promise.all([
      topicsCollection.createIndex({ used: 1, createdAt: 1 }),
    ]);

    // 7. Run static knowledge base sync once on startup
    await syncKnowledgeBase();
    console.log("Database initialized successfully.");
    return true;
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    throw error;
  }
}
