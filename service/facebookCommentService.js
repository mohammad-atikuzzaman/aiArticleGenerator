import axios from "axios";
import { config } from "../config/aiConfig.js";

const GRAPH_API_VERSION = "v23.0";
const POST_CONTEXT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHED_POSTS = 100;
const postContextCache = new Map();

function cachePostContext(postId, text) {
  postContextCache.set(postId, { text, expiresAt: Date.now() + POST_CONTEXT_CACHE_TTL_MS });
  if (postContextCache.size > MAX_CACHED_POSTS) {
    postContextCache.delete(postContextCache.keys().next().value);
  }
}

export async function getFacebookPostContext(postId) {
  const cached = postContextCache.get(postId);
  if (cached?.expiresAt > Date.now()) {
    console.log(`Using cached Facebook post context for ${postId}.`);
    return cached.text;
  }

  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${postId}`;
  console.log(`Requesting Facebook post context: ${postId}`);
  const response = await axios.get(endpoint, {
    params: {
      fields: "message,story,permalink_url",
      access_token: config.fbAccessToken,
    },
  });

  const postText = [response.data.message, response.data.story]
    .filter(Boolean)
    .join("\n")
    .trim();

  cachePostContext(postId, postText || "No post text is available.");
  return postText || "No post text is available.";
}

export async function replyToFacebookComment(commentId, text) {
  const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${commentId}/comments`;
  console.log(`Posting public Facebook reply to comment ${commentId}.`);
  const response = await axios.post(
    endpoint,
    { message: text },
    {
      params: { access_token: config.fbAccessToken },
      headers: { "Content-Type": "application/json" },
    }
  );

  console.log(`Facebook comment reply API succeeded for ${commentId}.`);
  return response.data;
}
