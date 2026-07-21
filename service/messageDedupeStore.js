import { config } from "../config/aiConfig.js";
import { getMongoCollection } from "./mongoClient.js";



async function getCollection() {
  return getMongoCollection(config.mongodbMessageDedupeCollection);
}


const botSentMessageMemory = new Set();

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

export async function rememberBotSentMessage(messageId) {
  if (!messageId) return;
  botSentMessageMemory.add(messageId);
  setTimeout(() => botSentMessageMemory.delete(messageId), 120000);

  if (!config.mongodbUri) return;

  try {
    const collection = await getCollection();
    await collection.insertOne({
      messageId: `bot_sent:${messageId}`,
      isBotSent: true,
      createdAt: new Date(),
    });
  } catch (error) {
    if (error.code !== 11000) {
      console.error("Failed to store bot sent message ID in DB:", error.message);
    }
  }
}

export async function isBotSentMessage(messageId) {
  if (!messageId) return false;
  if (botSentMessageMemory.has(messageId)) return true;

  if (!config.mongodbUri) return false;

  try {
    const collection = await getCollection();
    const doc = await collection.findOne({ messageId: `bot_sent:${messageId}` });
    return Boolean(doc);
  } catch (error) {
    console.error("Failed to check bot sent message ID from DB:", error.message);
    return false;
  }
}
