import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/aiConfig.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export async function generateArticle(topic) {
  try {
    const model = genAI.getGenerativeModel({ model: config.model });
    
    const prompt = `"${topic}" সম্পর্কে একটি বিস্তারিত বাংলা আর্টিকেল লিখুন (৩০০-৫০০ শব্দ)। গঠন:
          ১. আকর্ষণীয় শিরোনাম
          ২. ভূমিকা (সমস্যা বা প্রাসঙ্গিকতা)
          ৩. মূল বিষয়বস্তু (উপ-শিরোনাম সহ)
          ৪. ব্যবহারিক প্রয়োগ/উদাহরণ
          ৫. উপসংহার
          ৬. পাঠকদের জন্য প্রশ্ন`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const article = response.text();
    
    return article;
  } catch (error) {
    console.error("Article generation failed:", error.message);
    throw new Error("Something went wrong to generate article");
  }
}
