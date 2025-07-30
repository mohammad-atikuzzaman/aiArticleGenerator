import axios from "axios";
import { config } from "../config/aiConfig.js";


export async function generateArticle(topic) {
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

    const article = response.data.choices[0]?.message?.content;
    console.log("Article has been Generated", article);
    return article;

  } catch (error) {
    console.error("Article generation failed:", error.message);
    throw new Error("Something went wrong to generate article");
  }
}
