import axios from "axios";
import { config } from "../config/aiConfig.js";

export async function createPublicPost(article, image) {
  try {
    const endpoint = `https://graph.facebook.com/v23.0/${config.pageid}/photos?access_token=${config.fbAccessToken}`;

    const postData = {
      message: article,
      url: image,
    };
    console.log("from createPublicPost.js", postData);
    
    const response = await axios.post(endpoint, postData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Facebook post response:", response.data);
  } catch (error) {
    console.error("Failed to post to Facebook.".error.message);

    if (error.response) {
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}
