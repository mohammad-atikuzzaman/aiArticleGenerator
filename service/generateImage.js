async function query(data) {
  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer api_key`, // ✅ fixed extra `}`
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();

    // ✅ Save to file (Node.js) or show in browser (if frontend)
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // File system import only works in Node.js
    const fs = await import("fs");
    fs.writeFileSync("generated_image.png", buffer);
    console.log("✅ Image saved as generated_image.png");

  } catch (error) {
    console.error("❌ Error generating image:", error.message);
  }
}

query({
  inputs: "Astronaut riding a horse in a futuristic city",
});
