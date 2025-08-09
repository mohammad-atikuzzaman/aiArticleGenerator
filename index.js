import cron from "node-cron";
import { generateTopic } from "./service/generateTopic.js";
import { generateArticle } from "./service/generateArticle.js";
import { generateImage } from "./service/generateImage.js";
import { createPublicPost } from "./utills/facebookPoster.js";

async function runGenerator() {
  try {
    console.log("Starting new cycle at:", new Date().toLocaleString());
    const topic = await generateTopic();
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

// (async () => {
//   await runGenerator();
// })();

cron.schedule(
  "0 8 * * *",
  async () => {
    console.log(" Cron job triggered at: 8:30 AM");
    await runGenerator();
  },
  {
    timezone: "Asia/Dhaka",
  }
);

console.log("Background worker started. Waiting for scheduled jobs...");
setInterval(() => {}, 1000 * 60 * 60);

process.on("SIGTERM", () => {
  console.log("SIGTERM received, exiting gracefully...");
  process.exit(0);
});
