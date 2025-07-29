import { generateTopic } from "./service/generateTopic.js";
import { generateArticle } from "./service/generateArticle.js";

async function runGenerator() {
  try {
    const topic = await generateTopic();
    const article = await generateArticle(topic);
    
    
    const content =  {
      topic: topic,
      article: article,
    };
    
    console.log(content);

    return content
    
  } catch (error) {
    console.error("Problem in main function:", error.message);
    process.exit(1);
  }
}

// প্রোগ্রাম শুরু
(async () => {
  await runGenerator();
})();