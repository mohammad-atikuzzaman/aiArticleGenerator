import { generateTopic } from "./service/generateTopic.js";
import { generateArticle } from "./service/generateArticle.js";
import { generateImage } from "./service/generateImage.js";
import { postToFacebook } from "./utills/facebookPoster.js";

async function runGenerator() {
  try {
    const topic = await generateTopic();
    const article = await generateArticle(topic);
    const image = await generateImage({ inputs: topic });
   
    const content = {
      topic,
      article,
      image
    };

    await postToFacebook(article, image);

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
