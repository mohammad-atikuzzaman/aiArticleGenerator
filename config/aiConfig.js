import dotenv from "dotenv";
dotenv.config();

export const config = {
  hgKey: process.env.HUGGINGFACE_API_KEY,
  apiKey: process.env.OPENROUTER_API_KEY,
  model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.SITE_URL || "https://atikuzzaman.vercel.app",
    "X-Title": process.env.SITE_NAME || "Atikuzzaman",
  },
};
