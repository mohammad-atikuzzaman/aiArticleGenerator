import { config } from "../config/aiConfig.js";
import { getMongoCollection } from "./mongoClient.js";

const MESSAGE_DEDUPE_TTL_SECONDS = 60 * 60;

async function getCollection() {
  return getMongoCollection(config.mongodbMessageDedupeCollection);
}


export async function rememberIncomingMessage(messageId, senderId) {
  const collection = await getCollection();

  try {
    await collection.insertOne({
      messageId,
      senderId,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    if (error.code === 11000) {
      return false;
    }

    throw error;
  }
}
