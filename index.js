import { generateMonthlyTopics } from "./service/generateMonthlyTopics.js";
import fs from "fs/promises";
import path from "path";
import { generateArticle } from "./service/generateArticle.js";
import { createPublicPost } from "./utills/facebookPoster.js";

const TOPICS_FILE = path.join(process.cwd(), "topics.json");

async function loadTopics() {
  try {
    const data = await fs.readFile(TOPICS_FILE, "utf-8");
    const topics = JSON.parse(data);
    return Array.isArray(topics) ? topics : [];
  } catch {
    console.log("topics.json not found or invalid. Initializing empty list.");
    return [];
  }
}

async function saveTopics(topics) {
  await fs.writeFile(TOPICS_FILE, JSON.stringify(topics, null, 2), "utf-8");
}

async function getNextTopic() {
  let topics = await loadTopics();

  if (topics.length === 0) {
    console.log("No topics available. Generating 30 service-focused Bangla topics...");
    topics = await generateMonthlyTopics();
    await saveTopics(topics);
    console.log(`Successfully generated and saved ${topics.length} topics to topics.json`);
  }

  const topic = topics.shift();
  await saveTopics(topics);

  return { topic, remaining: topics.length };
}

async function runGenerator() {
  try {
    console.log("Starting new text post cycle at:", new Date().toLocaleString());

    const { topic, remaining } = await getNextTopic();

    console.log(`Selected topic for today: ${topic}`);
    console.log(`Remaining topics in queue for future days: ${remaining}`);

    const article = await generateArticle(topic);

    if (!article) {
      console.warn("Article missing. Skipping Facebook post.");
      return;
    }

    console.log(`
topic: ${topic}
article: ${article}`);

    await createPublicPost(article);
  } catch (error) {
    console.error("Problem in main function:", error.message);
  }
}

await runGenerator();
