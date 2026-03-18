import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/aiConfig.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function generateMonthlyTopics() {
  try {
    const model = genAI.getGenerativeModel({ model: config.model });

    const prompt = `Generate exactly 30 unique, interesting, and trending topics related to programming, web development, or web automation. 
Return ONLY a valid JSON array of strings, where each string is a topic. 
Do not include markdown formatting (like \`\`\`json), just the raw JSON array. Example: ["Topic 1", "Topic 2"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up potential markdown formatting that Gemini might sometimes add despite instructions
    text = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

    const topics = JSON.parse(text);

    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error("Invalid output format from Gemini");
    }

    return topics;
  } catch (error) {
    console.error("Monthly topic generation failed:", error.message);
    throw new Error("There was a problem generating the 30 topics");
  }
}
