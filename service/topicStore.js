import { getMongoCollection } from "./mongoClient.js";
import { config } from "../config/aiConfig.js";

async function getCollection() {
  return getMongoCollection(config.mongodbTopicsCollection);
}

export async function addTopics(topicsArray) {
  if (!Array.isArray(topicsArray) || topicsArray.length === 0) {
    return;
  }
  const collection = await getCollection();
  const docs = topicsArray.map((topic) => ({
    topic,
    used: false,
    createdAt: new Date(),
    usedAt: null,
  }));
  await collection.insertMany(docs);
}

export async function getNextTopicFromDb() {
  const collection = await getCollection();
  
  // Atomically find and mark the oldest unused topic
  const nextDoc = await collection.findOneAndUpdate(
    { used: false },
    { $set: { used: true, usedAt: new Date() } },
    { sort: { createdAt: 1 }, returnDocument: "after" }
  );
  
  if (!nextDoc) {
    return null;
  }
  
  // Get remaining unused topics count
  const remaining = await collection.countDocuments({ used: false });
  
  return {
    topic: nextDoc.topic,
    remaining,
  };
}

export async function getUnusedTopicCount() {
  const collection = await getCollection();
  return collection.countDocuments({ used: false });
}
