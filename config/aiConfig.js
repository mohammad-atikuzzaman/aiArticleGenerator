import dotenv from "dotenv";
dotenv.config();

export const config = {
  apiKey: process.env.OPENROUTER_API_KEY,
  model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.SITE_URL || "https://atikuzzaman.vercel.app",
    "X-Title": process.env.SITE_NAME || "Atikuzzaman",
  },
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  imgbbApiKey: process.env.IMGBB_API_KEY,
  fbAccessToken: process.env.FB_PAGE_ACCESS_TOKEN,
  fbPageId: process.env.FB_PAGE_ID,
};
