import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { config } from "../config/aiConfig.js";
import { createEmbedding } from "./embeddingService.js";
import { getMongoCollection } from "./mongoClient.js";

const KNOWLEDGE_BASE_FILE = path.join(process.cwd(), "knowledgeBase.json");
const KNOWLEDGE_RESULT_LIMIT = 5;

let vectorSearchUnavailable = false;
let cachedKnowledgeChunks = null;

async function getCollection() {
  return getMongoCollection(config.mongodbKnowledgeCollection);
}

function createHash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createChunk(key, title, text, tags = []) {
  return {
    key,
    title,
    text,
    tags,
    source: "knowledgeBase",
    active: true,
  };
}

function formatList(items) {
  return items.filter(Boolean).join(", ");
}

function buildKnowledgeChunks(knowledgeBase) {
  const chunks = [
    createChunk(
      "business-profile",
      "Business profile",
      `Business: ${knowledgeBase.business?.name}. Role: ${knowledgeBase.business?.owner_role}. Target customers: ${formatList(knowledgeBase.business?.target_customers || [])}. Language: ${knowledgeBase.business?.language}.`,
      ["business", "target_customer"]
    ),
    createChunk(
      "services",
      "Services",
      `Available services: ${formatList(knowledgeBase.services || [])}.`,
      ["service", "skill"]
    ),
    createChunk(
      "selling-points",
      "Selling points",
      `Selling points: ${formatList(knowledgeBase.selling_points || [])}.`,
      ["benefit", "trust"]
    ),
    createChunk(
      "process",
      "Working process",
      `Process: ${formatList(knowledgeBase.process || [])}.`,
      ["process", "delivery"]
    ),
    createChunk(
      "pricing-policy",
      "Pricing policy",
      knowledgeBase.pricing_policy || "",
      ["price", "budget"]
    ),
    createChunk(
      "lead-questions",
      "Lead questions",
      `Useful lead questions: ${formatList(knowledgeBase.lead_questions || [])}.`,
      ["lead", "question"]
    ),
    createChunk(
      "reply-style",
      "Reply style",
      `Tone: ${knowledgeBase.reply_style?.tone}. Length: ${knowledgeBase.reply_style?.length}. Rules: ${formatList(knowledgeBase.reply_style?.rules || [])}.`,
      ["style", "rules"]
    ),
    createChunk(
      "fallback-reply",
      "Fallback reply",
      knowledgeBase.fallback_reply || "",
      ["fallback"]
    ),
  ];

  return chunks.filter((chunk) => chunk.text.trim());
}

async function loadKnowledgeBase() {
  const data = await fs.readFile(KNOWLEDGE_BASE_FILE, "utf-8");
  return JSON.parse(data);
}

export async function syncKnowledgeBase() {
  const collection = await getCollection();
  const knowledgeBase = await loadKnowledgeBase();
  const chunks = buildKnowledgeChunks(knowledgeBase);
  const activeKeys = chunks.map((chunk) => chunk.key);

  await Promise.all(
    chunks.map(async (chunk) => {
      const contentHash = createHash(chunk.text);
      const existing = await collection.findOne(
        { key: chunk.key },
        { projection: { _id: 0, contentHash: 1 } }
      );

      if (existing?.contentHash === contentHash) {
        await collection.updateOne(
          { key: chunk.key },
          { $set: { active: true, updatedAt: new Date() } }
        );
        return;
      }

      const embedding = await createEmbedding(`${chunk.title}\n${chunk.text}`);
      await collection.updateOne(
        { key: chunk.key },
        {
          $set: {
            ...chunk,
            contentHash,
            embedding,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    })
  );

  await collection.updateMany(
    { source: "knowledgeBase", key: { $nin: activeKeys } },
    { $set: { active: false, updatedAt: new Date() } }
  );

  // Populate cache to avoid DB hits on subsequent requests when vector search is unavailable
  cachedKnowledgeChunks = await collection
    .find({ source: "knowledgeBase", active: true })
    .project({ _id: 0, title: 1, text: 1 })
    .toArray();
}

export async function getRelevantKnowledge(userMessage) {
  // If MongoDB URI is not set, immediately fallback to local knowledgeBase.json to avoid crashes
  if (!config.mongodbUri) {
    if (cachedKnowledgeChunks) {
      return cachedKnowledgeChunks.slice(0, KNOWLEDGE_RESULT_LIMIT);
    }
    try {
      const data = await fs.readFile(KNOWLEDGE_BASE_FILE, "utf-8");
      const knowledgeBase = JSON.parse(data);
      const chunks = buildKnowledgeChunks(knowledgeBase);
      cachedKnowledgeChunks = chunks;
      return chunks.slice(0, KNOWLEDGE_RESULT_LIMIT);
    } catch (err) {
      console.warn("Failed to read local knowledge base file:", err.message);
      return [];
    }
  }

  const collection = await getCollection();


  // If vector search is offline or user query is empty, use memory cache directly to save a DB roundtrip
  if (vectorSearchUnavailable || !userMessage?.trim()) {
    if (cachedKnowledgeChunks) {
      return cachedKnowledgeChunks.slice(0, KNOWLEDGE_RESULT_LIMIT);
    }
    const chunks = await collection
      .find({ source: "knowledgeBase", active: true })
      .sort({ key: 1 })
      .limit(KNOWLEDGE_RESULT_LIMIT)
      .project({ _id: 0, title: 1, text: 1 })
      .toArray();
    cachedKnowledgeChunks = chunks;
    return chunks;
  }

  try {
    const queryVector = await createEmbedding(userMessage);

    // Run vector search and text search in parallel
    const vectorSearchPromise = collection
      .aggregate([
        {
          $vectorSearch: {
            index: config.mongodbKnowledgeVectorIndex,
            path: "embedding",
            queryVector,
            numCandidates: 50,
            limit: KNOWLEDGE_RESULT_LIMIT * 2,
            filter: { source: "knowledgeBase", active: true },
          },
        },
        {
          $project: {
            _id: 0,
            title: 1,
            text: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ])
      .toArray()
      .catch((err) => {
        console.warn("Vector search failed in hybrid query:", err.message);
        return [];
      });

    const textSearchPromise = collection
      .find({
        source: "knowledgeBase",
        active: true,
        $text: { $search: userMessage },
      })
      .limit(KNOWLEDGE_RESULT_LIMIT * 2)
      .project({ _id: 0, title: 1, text: 1, score: { $meta: "textScore" } })
      .toArray()
      .catch((err) => {
        console.warn("Text search failed in hybrid query:", err.message);
        return [];
      });

    const [vectorDocs, textDocs] = await Promise.all([
      vectorSearchPromise,
      textSearchPromise,
    ]);

    if (vectorDocs.length === 0 && textDocs.length === 0) {
      if (cachedKnowledgeChunks) {
        return cachedKnowledgeChunks.slice(0, KNOWLEDGE_RESULT_LIMIT);
      }
      return collection
        .find({ source: "knowledgeBase", active: true })
        .sort({ key: 1 })
        .limit(KNOWLEDGE_RESULT_LIMIT)
        .project({ _id: 0, title: 1, text: 1 })
        .toArray();
    }

    // Combine results using Reciprocal Rank Fusion (RRF)
    const rrfScores = {};
    const docMap = new Map();
    const k = 60; // standard constant

    const addScores = (docs) => {
      docs.forEach((doc, idx) => {
        const docKey = `${doc.title}:${doc.text}`;
        docMap.set(docKey, doc);
        const rank = idx + 1;
        if (!rrfScores[docKey]) {
          rrfScores[docKey] = 0;
        }
        rrfScores[docKey] += 1 / (k + rank);
      });
    };

    addScores(vectorDocs);
    addScores(textDocs);

    const sortedKeys = Object.keys(rrfScores).sort(
      (a, b) => rrfScores[b] - rrfScores[a]
    );

    return sortedKeys.slice(0, KNOWLEDGE_RESULT_LIMIT).map((docKey) => {
      const { score, ...cleanDoc } = docMap.get(docKey);
      return cleanDoc;
    });

  } catch (error) {
    console.warn(
      "MongoDB knowledge hybrid search failed. Falling back to cache:",
      error.message
    );

    if (error.message.includes("vectorSearch") || error.message.includes("Vector")) {
      vectorSearchUnavailable = true;
    }

    if (cachedKnowledgeChunks) {
      return cachedKnowledgeChunks.slice(0, KNOWLEDGE_RESULT_LIMIT);
    }

    const chunks = await collection
      .find({ source: "knowledgeBase", active: true })
      .sort({ key: 1 })
      .limit(KNOWLEDGE_RESULT_LIMIT)
      .project({ _id: 0, title: 1, text: 1 })
      .toArray();
    cachedKnowledgeChunks = chunks;
    return chunks;
  }
}
