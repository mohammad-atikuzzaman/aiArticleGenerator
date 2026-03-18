import dotenv from "dotenv";
dotenv.config();

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  imgbbApiKey: process.env.IMGBB_API_KEY,
  fbAccessToken: process.env.FB_PAGE_ACCESS_TOKEN,
  pageid: process.env.FB_PAGE_ID,
};
