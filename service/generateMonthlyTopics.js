import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/aiConfig.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function generateMonthlyTopics() {
  try {
    const model = genAI.getGenerativeModel({ model: config.model });

    const prompt = `Generate exactly 30 unique Bangla topic ideas for Facebook posts.

Context:
- I am a web developer selling web development, business website, landing page, ecommerce, automation, performance optimization, and maintenance services.
- The posts should educate Bangla-speaking business owners, startup founders, freelancers, and small companies about web development and technology.
- Each topic should naturally create demand for my services without sounding spammy.

Rules:
- Return ONLY a valid JSON array of strings.
- Every string must be in Bangla.
- Keep each topic specific and practical.
- Mix educational, problem-aware, trust-building, and soft-selling angles.
- Do not include markdown formatting, numbering, explanations, or code fences.

Example: ["আপনার ব্যবসার জন্য দ্রুত লোডিং ওয়েবসাইট কেন জরুরি", "ল্যান্ডিং পেজ কীভাবে বেশি ক্লায়েন্ট আনতে সাহায্য করে"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

    const topics = JSON.parse(text);

    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error("Invalid output format from Gemini");
    }

    return topics.slice(0, 30);
  } catch (error) {
    console.error("Monthly topic generation failed:", error.message);
    throw new Error("There was a problem generating the 30 topics");
  }
}
