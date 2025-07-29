const env= require("dotenv")
const axios = require("axios");

env.config()
// 🔹 1. Your tech topics array
const topics = [
  "Web Development",
  "Javascript",
  "Html",
  "CSS",
  "TypeScript",
  "React JS",
  "Next JS",
  "Programming",
  "Node JS",
  "Express JS",
  "DataBase",
  "MongoDB",
  "MySQL"
];

// 🔹 2. Pick a random topic
function getRandomTopic(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 🔹 3. Generate content using OpenRouter
async function generatePostContent() {
  const topic = getRandomTopic(topics);
  console.log("🎯 Randomly Selected Topic:", topic);

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        messages: [
          {
            role: "user",
            content: `Create an engaging Facebook post about "${topic}" with these guidelines:
            1. Start with a compelling hook or question
            2. Use storytelling elements (anecdote, metaphor, or real-world example)
            3. Keep it conversational and relatable
            4. Include 1-2 emojis for visual appeal
            5. End with a thought-provoking question or call-to-action
            6. Aim for 5-7 lines maximum
            7. Target tech-savvy professionals aged 25-45
            
            Example structure:
            [Hook/Question] 
            [Story/Example] 
            [Key Insight] 
            [CTA/Question]
            
            Topic: "${topic}"`
          }
        ],
        temperature: 0.7, // Adds some creativity
        max_tokens: 300 // Allows for longer, more detailed posts
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.SITE_URL || "https://example.com",
          "X-Title": process.env.SITE_NAME || "AutoPostAI"
        }
      }
    );

    const content = response.data.choices[0].message.content;
    console.log("\n📝 Generated Post:\n", content);
    return content;
  } catch (error) {
    console.error("Error:", error?.response?.data || error.message);
    return null;
  }
}

// 🔹 4. Run the content generation
generatePostContent();
