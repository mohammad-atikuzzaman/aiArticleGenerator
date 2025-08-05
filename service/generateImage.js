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

    // Convert buffer to base64
    const base64Image = buffer.toString("base64");

    // Upload to imgbb
    const uploadResponse = await fetch(`https://api.imgbb.com/1/upload?key=${config.imgbbApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        image: base64Image,
        name: data.inputs || "generated_image"
      }),
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadResult.success) {
      throw new Error("Image upload failed");
    }

    const imageUrl = uploadResult.data.url;
    return imageUrl;

  } catch (error) {
    console.error("Error generating/uploading image:", error.message);
    return null;
  }
}
