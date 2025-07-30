import { generateTopic } from "./service/generateTopic.js";
import { generateArticle } from "./service/generateArticle.js";
import { generateImage } from "./service/generateImage.js";

async function runGenerator() {
  try {
    const topic = await generateTopic();
    const article = await generateArticle(topic);
    const image = await generateImage(topic);
   
    const content = {
      topic,
      article,
      image
    };

    console.log("Image", image);

    return content;
  } catch (error) {
    console.error("Problem in main function:", error.message);
    process.exit(1);
  }
}

// প্রোগ্রাম শুরু
(async () => {
  await runGenerator();
})();
