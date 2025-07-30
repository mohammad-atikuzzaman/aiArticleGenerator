import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { config } from "../config/aiConfig.js";


export async function 
postToFacebook(articleText, imagePath) {
  try {
    const form = new FormData();
    form.append("caption", articleText);
    form.append("access_token", config.fbAccessToken);
    form.append("source", fs.createReadStream(path.resolve(imagePath)));

    const url = `https://graph.facebook.com/${config.fbPageId}/photos`;

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log("Posted to Facebook:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to post on Facebook:", error.response?.data || error.message);
    throw error;
  }
}
