import axios from "axios";
import { config } from "../config/aiConfig.js";

function getSendApiEndpoint() {
  return `https://graph.facebook.com/${config.graphApiVersion}/me/messages`;
}

export async function sendMessengerReply(recipientId, text) {
  try {
    const response = await axios.post(
      getSendApiEndpoint(),
      {
        recipient: {
          id: recipientId,
        },
        messaging_type: "RESPONSE",
        message: {
          text,
        },
      },
      {
        params: {
          access_token: config.fbAccessToken,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Messenger reply sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Messenger reply.", error.message);

    if (error.response) {
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return null;
  }
}
