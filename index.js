const axios = require('axios');
require('dotenv').config();
const fs = require('fs');

// কনফিগারেশন
const config = {
  apiKey: process.env.OPENROUTER_API_KEY,
  model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.SITE_URL || "https://example.com",
    "X-Title": process.env.SITE_NAME || "BanglaArticleGenerator"
  }
};

// টপিক জেনারেটর
async function generateTopic() {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: config.model,
        messages: [{
          role: "user",
          content: "টেকনোলজি, বিজ্ঞান বা ডিজিটাল জীবনধারা সম্পর্কিত একটি আকর্ষণীয় ও সাম্প্রতিক টপিকের নাম দিন শুধুমাত্র (কোন অতিরিক্ত ব্যাখ্যা ছাড়া, শুধু টপিকের নাম)"
        }],
        max_tokens: 50,
        temperature: 0.8
      },
      { headers: config.headers }
    );

    const topic = response.data.choices[0].message.content
      .replace(/["।]/g, '')
      .trim();

    console.log("✅ টপিক জেনারেট করা হয়েছে:", topic);
    return topic;

  } catch (error) {
    console.error("টপিক জেনারেট করতে ব্যর্থ:", error.message);
    throw new Error("টপিক জেনারেট করতে সমস্যা হয়েছে");
  }
}

// আর্টিকেল জেনারেটর
async function generateArticle(topic) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: config.model,
        messages: [{
          role: "user",
          content: `"${topic}" সম্পর্কে একটি বিস্তারিত বাংলা আর্টিকেল লিখুন (৩০০-৫০০ শব্দ)। গঠন:
          ১. আকর্ষণীয় শিরোনাম
          ২. ভূমিকা (সমস্যা বা প্রাসঙ্গিকতা)
          ৩. মূল বিষয়বস্তু (উপ-শিরোনাম সহ)
          ৪. ব্যবহারিক প্রয়োগ/উদাহরণ
          ৫. উপসংহার
          ৬. পাঠকদের জন্য প্রশ্ন`
        }],
        max_tokens: 1500,
        temperature: 0.7
      },
      { headers: config.headers, timeout: 30000 }
    );

    const article = response.data.choices[0].message.content;
    console.log("📝 আর্টিকেল জেনারেট করা হয়েছে");
    return article;

  } catch (error) {
    console.error("আর্টিকেল জেনারেট করতে ব্যর্থ:", error.message);
    throw new Error("আর্টিকেল তৈরি করতে সমস্যা হয়েছে");
  }
}

// ফাইল হিসেবে সেভ করা
function saveToFile(topic, article) {
  const filename = `article_${Date.now()}.txt`;
  const content = `টপিক: ${topic}\n\n${article}`;
  
  fs.writeFileSync(filename, content);
  console.log(`💾 ফাইল হিসেবে সেভ করা হয়েছে: ${filename}`);
  return filename;
}

// মূল এক্সিকিউশন ফাংশন
async function runGenerator() {
  try {
    console.log("🚀 বাংলা আর্টিকেল জেনারেটর শুরু হচ্ছে...\n");
    
    // টপিক জেনারেট
    const topic = await generateTopic();
    
    // আর্টিকেল জেনারেট
    const article = await generateArticle(topic);
    
    // কনসোলে প্রদর্শন
    console.log("\n======================");
    console.log(`📢 টপিক: ${topic}`);
    console.log("----------------------");
    console.log(article);
    console.log("======================\n");
    
    // ফাইল হিসেবে সেভ
    const savedFile = saveToFile(topic, article);
    
    return {
      topic: topic,
      article: article,
      file: savedFile
    };
    
  } catch (error) {
    console.error("\n❌ প্রধান ফাংশনে ত্রুটি:", error.message);
    process.exit(1);
  }
}

// প্রোগ্রাম শুরু
(async () => {
  await runGenerator();
})();