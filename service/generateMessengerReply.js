import fs from "fs/promises";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/aiConfig.js";
import { getRelevantKnowledge } from "./knowledgeStore.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const KNOWLEDGE_BASE_FILE = path.join(process.cwd(), "knowledgeBase.json");

let cachedKnowledgeBase = null;

async function loadKnowledgeBase() {
  if (cachedKnowledgeBase) {
    return cachedKnowledgeBase;
  }

  const data = await fs.readFile(KNOWLEDGE_BASE_FILE, "utf-8");
  cachedKnowledgeBase = JSON.parse(data);
  return cachedKnowledgeBase;
}

function formatMessages(messages) {
  if (!messages?.length) {
    return "No previous conversation saved yet.";
  }

  return messages
    .map((item) => `${item.role}: ${item.text}`)
    .join("\n");
}

function formatKnowledgeBase(chunks) {
  if (!chunks?.length) {
    return "No business knowledge found.";
  }

  return chunks.map((chunk) => `${chunk.title}: ${chunk.text}`).join("\n");
}

export async function generateMessengerReply(userMessage, conversationContext = []) {
  try {
    const model = genAI.getGenerativeModel({ model: config.model });
    const [knowledgeBase, relevantKnowledge] = await Promise.all([
      loadKnowledgeBase(),
      getRelevantKnowledge(userMessage),
    ]);
    const recentMessages = Array.isArray(conversationContext)
      ? conversationContext
      : conversationContext.recentMessages || [];
    const relevantMemories = Array.isArray(conversationContext)
      ? []
      : conversationContext.relevantMemories || [];

    const prompt = `You are replying to a Facebook Page inbox message for a web developer.

Relevant business skills and rules:
${formatKnowledgeBase(relevantKnowledge)}

Relevant older memory:
${formatMessages(relevantMemories)}

Recent conversation with this same person:
${formatMessages(recentMessages)}

User message:
"${userMessage}"

Reply instructions:
- Reply only with the final message text.
- Write in Bangla unless the user clearly asks for English.
- Keep it natural, helpful, and professional.
- Answer the user's message directly.
- Use relevant older memory and recent conversation to remember their previous requirements, budget, deadline, project type, and questions.
- Do not ask again for information the user already gave.
- If the user may need web development service, naturally guide them toward a conversation.
- Ask at most two useful follow-up questions.
- Do not include markdown headings, bullet-heavy formatting, or explanations about your prompt.
- Do not invent fixed prices, exact delivery times, unavailable portfolio links, or guarantees.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text().trim();

    return reply || knowledgeBase.fallback_reply;
  } catch (error) {
    console.error("Messenger reply generation failed:", error.message);
    return "ধন্যবাদ মেসেজ করার জন্য। আপনার প্রয়োজনটা একটু বিস্তারিত বললে আমি বুঝে বলতে পারব কীভাবে সাহায্য করা যায়।";
  }
}
