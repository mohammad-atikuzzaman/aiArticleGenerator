import fs from "fs/promises";
import path from "path";

const HISTORY_FILE = path.join(process.cwd(), "conversationHistory.json");
const MAX_MESSAGES_PER_USER = 30;
const CONTEXT_MESSAGES_PER_REPLY = 10;

async function loadAllConversations() {
  try {
    const data = await fs.readFile(HISTORY_FILE, "utf-8");
    const conversations = JSON.parse(data);
    return conversations && typeof conversations === "object" ? conversations : {};
  } catch {
    return {};
  }
}

async function saveAllConversations(conversations) {
  await fs.writeFile(
    HISTORY_FILE,
    JSON.stringify(conversations, null, 2),
    "utf-8"
  );
}

export async function getConversationContext(userId) {
  const conversations = await loadAllConversations();
  const messages = conversations[userId]?.messages || [];
  return messages.slice(-CONTEXT_MESSAGES_PER_REPLY);
}

export async function addConversationMessage(userId, role, text) {
  const conversations = await loadAllConversations();
  const current = conversations[userId] || { messages: [] };

  current.messages.push({
    role,
    text,
    createdAt: new Date().toISOString(),
  });

  current.messages = current.messages.slice(-MAX_MESSAGES_PER_USER);
  current.updatedAt = new Date().toISOString();
  conversations[userId] = current;

  await saveAllConversations(conversations);
}
