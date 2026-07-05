import axios from "axios";
import { config } from "../config/aiConfig.js";

export async function createPublicPost(article) {
  try {
    const endpoint = `https://graph.facebook.com/v23.0/${config.pageid}/feed`;

    const response = await axios.post(
      endpoint,
      { message: article },
      {
        params: {
          access_token: config.fbAccessToken,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Facebook text post response:", response.data);
  } catch (error) {
    console.error("Failed to post to Facebook.", error.message);

    if (error.response) {
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}
