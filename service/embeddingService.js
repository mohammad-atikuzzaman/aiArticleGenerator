import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/aiConfig.js";
import { getMongoCollection } from "./mongoClient.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

let cacheCollectionPromise = null;

function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function createEmbeddingKey(text) {
  return crypto
    .createHash("sha256")
    .update(`${config.embeddingModel}:${normalizeText(text)}`)
    .digest("hex");
}

async function getCacheCollection() {
  if (!cacheCollectionPromise) {
    cacheCollectionPromise = getMongoCollection(
      config.mongodbEmbeddingCacheCollection
    ).then(async (collection) => {
      await collection.createIndex({ key: 1 }, { unique: true });
      await collection.createIndex({ lastUsedAt: -1 });
      return collection;
    });
  }

  return cacheCollectionPromise;
}

export async function createEmbedding(text) {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return [];
  }

  const key = createEmbeddingKey(normalizedText);
  const collection = await getCacheCollection();
  const cached = await collection.findOne(
    { key },
    { projection: { _id: 0, embedding: 1 } }
  );

  if (cached?.embedding?.length) {
    await collection.updateOne({ key }, { $set: { lastUsedAt: new Date() } });
    return cached.embedding;
  }

  const model = genAI.getGenerativeModel({ model: config.embeddingModel });
  const result = await model.embedContent(normalizedText);
  const embedding = result.embedding.values;
  const now = new Date();

  try {
    await collection.insertOne({
      key,
      model: config.embeddingModel,
      textPreview: normalizedText.slice(0, 300),
      embedding,
      createdAt: now,
      lastUsedAt: now,
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const winner = await collection.findOne(
      { key },
      { projection: { _id: 0, embedding: 1 } }
    );
    return winner?.embedding || embedding;
  }

  return embedding;
}
