import { config } from "../config/aiConfig.js";

const HORDE_API_BASE = "https://aihorde.net/api/v2";
const ANON_API_KEY = "gyU_LA6nswk_bt0cl83Ogg";

// AI Horde dynamically lowers resolution limits during heavy demand.
// 512x512 is the base SD resolution and always accepted by the anon key.
const SAFE_WIDTH = 512;
const SAFE_HEIGHT = 512;
const SAFE_STEPS = 20;

export async function generateImage(data) {
  try {
    const prompt = data.inputs || "beautiful scenery";

    // Step 1: Submit generation job
    const submitResponse = await fetch(`${HORDE_API_BASE}/generate/async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_API_KEY,
      },
      body: JSON.stringify({
        prompt: prompt,
        models: ["stable_diffusion"], // anon key works reliably with SD
        params: {
          width: SAFE_WIDTH,         // ✅ 512 — safe under any anon limit
          height: SAFE_HEIGHT,       // ✅ 512 — safe under any anon limit
          steps: SAFE_STEPS,         // ✅ 20 — well under 50 step limit
          cfg_scale: 7.5,
          sampler_name: "k_euler_a", // ✅ no step penalty with this sampler
          n: 1,
        },
      }),
    });

    if (!submitResponse.ok) {
      const err = await submitResponse.text();
      throw new Error(
        `Horde submit failed: HTTP ${submitResponse.status} - ${err}`
      );
    }

    const submitResult = await submitResponse.json();
    const jobId = submitResult.id || submitResult._id;

    if (!jobId) {
      throw new Error("No job ID returned from Horde");
    }

    console.log(`Job submitted: ${jobId}. Waiting...`);

    // Step 2: Poll status (max ~10 min, 5s interval)
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 120;
    const pollInterval = 5000; // 5 seconds

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(
        `${HORDE_API_BASE}/generate/status/${jobId}`,
        {
          headers: { apikey: ANON_API_KEY },
        }
      );

      if (!statusResponse.ok) {
        throw new Error(
          `Status check failed: HTTP ${statusResponse.status}`
        );
      }

      const statusResult = await statusResponse.json();

      if (statusResult.done) {
        if (
          statusResult.generations &&
          statusResult.generations.length > 0
        ) {
          imageUrl = statusResult.generations[0].img; // ✅ correct field is "img", not "url"
        }
        break;
      }

      if (statusResult.faulted || statusResult.cancelled) {
        throw new Error(
          `Job failed: ${statusResult.state || "unknown error"}`
        );
      }

      attempts++;
      console.log(
        `Polling... attempt ${attempts}/${maxAttempts} - done: ${statusResult.done}, queue: ${statusResult.queue_position ?? "?"}`
      );
    }

    if (!imageUrl) {
      throw new Error("Timeout: Image generation took too long or failed");
    }

    console.log(`Generated image URL: ${imageUrl}`);

    // Step 3: Upload to imgbb for a stable permanent URL
    const imageFetch = await fetch(imageUrl);
    if (!imageFetch.ok) throw new Error("Failed to fetch generated image");

    const arrayBuffer = await imageFetch.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const uploadResponse = await fetch(
      `https://api.imgbb.com/1/upload?key=${config.imgbbApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          image: base64Image,
          name: data.inputs
            ? data.inputs.substring(0, 50)
            : "generated_image",
        }),
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadResult.success) {
      console.warn("imgbb upload failed, using direct Horde URL");
      return imageUrl; // fallback to direct Horde URL
    }

    return uploadResult.data.url;
  } catch (error) {
    console.error(
      "Error generating/uploading image with AI Horde:",
      error.message
    );
    return null;
  }
}