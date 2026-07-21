import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/aiConfig.js";

export const genAI = new GoogleGenerativeAI(config.geminiApiKey);

/**
 * Executes an async function with exponential backoff retry on transient failure or rate limits.
 */
export async function withRetry(fn, { maxRetries = 3, initialDelayMs = 1000 } = {}) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      const isTransientError =
        error.status === 429 ||
        (error.status >= 500 && error.status < 600) ||
        error.message?.includes("429") ||
        error.message?.includes("503") ||
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNRESET";

      if (attempt >= maxRetries || !isTransientError) {
        throw error;
      }

      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(`API call failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
