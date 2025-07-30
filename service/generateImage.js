import fetch from "node-fetch";

async function generateImageBuffer(prompt) {
  const res = await fetch(
    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer huggingFace_api_key`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    }
  );

  const buffer = await res.buffer();
  return buffer;
}

async function uploadBufferToImgbb(buffer) {
  const imgbbApiKey = "imgbb_api_key";
  const base64Image = buffer.toString("base64");

  const formData = new URLSearchParams();
  formData.append("key", imgbbApiKey);
  formData.append("image", base64Image);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  return json?.data?.url;
}

export async function generateImage(prompt) {
  try {
    const buffer = await generateImageBuffer(
      prompt
    );
    console.log(buffer);
    const imageUrl = await uploadBufferToImgbb(buffer);
    return imageUrl;
  } catch (err) {
    console.error("Error:", err.message);
    throw new Error("Something wrong to generateImage")
  }
}

generateImage("A beautiful landscape with mountains and lake")
