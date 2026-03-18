import cron from "node-cron";
import { generateMonthlyTopics } from "./service/generateMonthlyTopics.js";
import fs from "fs/promises";
import path from "path";

const TOPICS_FILE = path.join(process.cwd(), "topics.json");
import { generateArticle } from "./service/generateArticle.js";
import { generateImage } from "./service/generateImage.js";
import { createPublicPost } from "./utills/facebookPoster.js";

async function runGenerator() {
  try {
    console.log("Starting new cycle at:", new Date().toLocaleString());

    let topics = [];
    try {
      const data = await fs.readFile(TOPICS_FILE, "utf-8");
      topics = JSON.parse(data);
    } catch (e) {
      console.log("topics.json not found or invalid. Initializing empty list.");
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      console.log("No topics available. Generating 30 new topics for the month...");
      topics = await generateMonthlyTopics();
      await fs.writeFile(TOPICS_FILE, JSON.stringify(topics, null, 2), "utf-8");
      console.log(`Successfully generated and saved ${topics.length} topics to topics.json`);
    }

    const topic = topics.shift();
    await fs.writeFile(TOPICS_FILE, JSON.stringify(topics, null, 2), "utf-8");

    console.log(`Selected topic for today: ${topic}`);
    console.log(`Remaining topics in queue for future days: ${topics.length}`);

    const [article, image] = await Promise.all([
      generateArticle(topic),
      generateImage({ inputs: topic }),
    ]);

    if (!article || !image) {
      console.warn("Article or image missing. Skipping Facebook post.");
      return;
    }
    console.log(`
    topic: ${topic}
    article: ${article}
    img: ${image}`);

    await createPublicPost(article, image);
  } catch (error) {
    console.error("Problem in main function:", error.message);
  }
}

(async () => {
  await runGenerator();
})();

// cron.schedule(
//   "0 8 * * *",
//   async () => {
//     console.log(" Cron job triggered at: 8:30 AM");
//     await runGenerator();
//   },
//   {
//     timezone: "Asia/Dhaka",
//   }
// );

console.log("Background worker started. Waiting for scheduled jobs...");
setInterval(() => { }, 1000 * 60 * 60);

process.on("SIGTERM", () => {
  console.log("SIGTERM received, exiting gracefully...");
  process.exit(0);
});
