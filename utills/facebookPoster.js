import axios from "axios";
import { config } from "../config/aiConfig.js";

export async function createPublicPost(article, image) {
  const endpoint = `https://graph.facebook.com/v23.0/${config.pageid}/photos?access_token=${config.fbAccessToken}`;

  const postData = {
    message: article,
    url: image,
  };

  const response = await axios.post(endpoint, postData, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  console.log(response.data);
}

