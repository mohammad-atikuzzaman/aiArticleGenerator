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

export async function generateFacebookCommentReply(postText, commentText) {
  try {
    console.log("Generating AI decision for Facebook comment reply.");
    const model = genAI.getGenerativeModel({ model: config.model });
    const relevantKnowledge = await getRelevantKnowledge(`${postText}\n${commentText}`);

    const prompt = `You reply publicly to comments on a Facebook Page for a web developer.

Page post context:
"${postText}"

Visitor comment:
"${commentText}"

Relevant business skills and rules:
${formatKnowledgeBase(relevantKnowledge)}

Decide whether the visitor comment is genuinely about web-development services or the post's service offering. This includes questions or interest about websites, e-commerce, landing pages, apps, software, design, pricing, requirements, timeline, or starting a project.

If it is not service-related (for example only praise, greetings, emoji, unrelated chat, spam, or an unclear one-word reaction), reply with exactly: SKIP

If it is service-related, write only a concise public reply in Bangla unless the visitor clearly uses English. Be friendly and helpful, answer from the post context when possible, do not invent fixed prices or delivery times, and invite the visitor to inbox the Page for project-specific details. Do not use headings, hashtags, or markdown.`;

    const result = await model.generateContent(prompt);
    const reply = (await result.response).text().trim();
    if (!reply || reply.toUpperCase() === "SKIP") {
      console.log("AI classified Facebook comment as non-service-related.");
      return null;
    }

    console.log("AI classified Facebook comment as service-related.");
    return reply.slice(0, 1000);
  } catch (error) {
    console.error("Facebook comment reply generation failed:", error.message);
    return null;
  }
}
