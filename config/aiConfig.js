import dotenv from "dotenv";
dotenv.config();

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  imgbbApiKey: process.env.IMGBB_API_KEY,
  fbAccessToken: process.env.FB_PAGE_ACCESS_TOKEN,
  pageid: process.env.FB_PAGE_ID,
  fbVerifyToken: process.env.FB_VERIFY_TOKEN,
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME || "aiArticleGenerator",
  mongodbConversationsCollection:
    process.env.MONGODB_CONVERSATIONS_COLLECTION || "conversation_messages",
  mongodbConversationVectorIndex:
    process.env.MONGODB_CONVERSATION_VECTOR_INDEX ||
    process.env.MONGODB_VECTOR_INDEX ||
    "conversation_embedding_index",
  mongodbKnowledgeCollection:
    process.env.MONGODB_KNOWLEDGE_COLLECTION || "knowledge_chunks",
  mongodbKnowledgeVectorIndex:
    process.env.MONGODB_KNOWLEDGE_VECTOR_INDEX || "knowledge_embedding_index",
  mongodbEmbeddingCacheCollection:
    process.env.MONGODB_EMBEDDING_CACHE_COLLECTION || "embedding_cache",
  mongodbPostLogsCollection:
    process.env.MONGODB_POST_LOGS_COLLECTION || "post_logs",
  mongodbMessageDedupeCollection:
    process.env.MONGODB_MESSAGE_DEDUPE_COLLECTION || "processed_messages",
  mongodbTopicsCollection:
    process.env.MONGODB_TOPICS_COLLECTION || "topics",
};
