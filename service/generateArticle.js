import { config } from "../config/aiConfig.js";
import { genAI, withRetry } from "./aiClient.js";

export async function generateArticle(topic) {
  try {
    const model = genAI.getGenerativeModel({ model: config.model });

    const prompt = `আপনি একজন অভিজ্ঞ বাংলা কনটেন্ট রাইটার এবং ওয়েব ডেভেলপমেন্ট কনসালট্যান্ট।

বিষয়: "${topic}"

এই বিষয়ের উপর একটি Facebook text post লিখুন।

লক্ষ্য:
- Bangla-speaking business owner, startup founder, freelancer, এবং small company decision-maker-দের educate করা।
- Web development, technology, website performance, online presence, automation, ecommerce, landing page, maintenance ইত্যাদি বিষয়ে practical knowledge দেওয়া।
- লেখার শেষে খুব natural ভাবে আমার web development/service নেওয়ার জন্য soft call-to-action রাখা।

Style:
- সম্পূর্ণ পোস্ট বাংলায় হবে।
- Tone হবে helpful, confident, professional, কিন্তু খুব বেশি salesy না।
- 180-300 শব্দের মধ্যে রাখুন।
- ছোট paragraph ব্যবহার করুন, যাতে Facebook-এ পড়তে সহজ হয়।
- শুরুতে attention-grabbing hook দিন।
- 3-5টি practical point দিন।
- শেষে একটি soft CTA দিন, যেমন: "আপনার ব্যবসার জন্য এমন ওয়েবসাইট দরকার হলে কথা বলতে পারেন।"
- Markdown heading, code block, বা অতিরিক্ত explanation দেবেন না।
- কোনো image prompt বা image description লিখবেন না।`;

    const result = await withRetry(() => model.generateContent(prompt));
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Article generation failed:", error.message);
    throw new Error("Something went wrong to generate article");
  }
}
