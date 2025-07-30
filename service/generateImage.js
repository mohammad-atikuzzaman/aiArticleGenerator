import axios from 'axios';
import fs from 'fs'

const API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5";
const API_TOKEN = "api key"; // Replace with your token

async function generateImage(prompt) {
  try {
    const response = await axios.post(
      API_URL,
      { inputs: prompt },
      {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
        responseType: 'arraybuffer', // To handle binary image data
      }
    );

    // Save the image
    
    fs.writeFileSync('generated-image.png', response.data);
    console.log("Image generated successfully!");
  } catch (error) {
    console.error("Error generating image:", error.response?.data || error.message);
  }
}

// Example usage
generateImage("A futuristic city at night, cyberpunk style");