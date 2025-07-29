import { config } from "../config/aiConfig.js";
import axios from "axios";


export async function generateTopic() {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: config.model,
        messages: [{
          role: "user",
          content: "Give me an interesting and recent topic related to technology, programming, or digital lifestyle. (No extra explanation, just the topic name)"
        }],
        max_tokens: 50,
        temperature: 0.8
      },
      { headers: config.headers }
    );

    const topic = response.data.choices[0].message.content
      .replace(/["।]/g, '')
      .trim();

    console.log("Topic Generated:", topic);
    return topic;

  } catch (error) {
    console.error("Topic generation failed:", error.message);
    throw new Error("There are problem to generate topic");
  }
}