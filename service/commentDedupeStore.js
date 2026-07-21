import { config } from "../config/aiConfig.js";
import { getMongoCollection } from "./mongoClient.js";

async function getCollection() {
  return getMongoCollection(config.mongodbCommentDedupeCollection);
}

export async function rememberIncomingComment(commentId, postId, commenterId) {
  const collection = await getCollection();

  try {
    await collection.insertOne({
      commentId,
      postId,
      commenterId,
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

// Keep a failed event eligible for a later retry instead of permanently
// suppressing it because the Graph API or AI provider had a temporary error.
export async function forgetIncomingComment(commentId) {
  const collection = await getCollection();
  await collection.deleteOne({ commentId });
}
