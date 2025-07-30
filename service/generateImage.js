import { config } from "../config/aiConfig.js";

export async function generateImage(data) {
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.huggingfaceApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fs = await import("fs");

    // Ensure images folder exists
    if (!fs.existsSync('./images')) {
      fs.mkdirSync('./images');
    }

    const filePath = `./images/${data.inputs}.png`;
    fs.writeFileSync(filePath, buffer);

    console.log(`Image saved as ${filePath}`);
    return filePath;

  } catch (error) {
    console.error("Error generating image:", error.message);
    return null;
  }
}
