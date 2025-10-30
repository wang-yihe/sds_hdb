// test_replicate.cjs  (CommonJS test script)
require("dotenv").config(); // loads REPLICATE_API_TOKEN from server/.env
const { writeFile } = require("fs/promises");
const Replicate = require("replicate");

// Initialize with your token from .env
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Example inputs (public URLs hosted by Replicate "delivery")
const input = {
  mask: "https://replicate.delivery/pbxt/HtGQBqO9MtVbPm0G0K43nsvvjBB0E0PaWOhuNRrRBBT4ttbf/mask.png",
  image:
    "https://replicate.delivery/pbxt/HtGQBfA5TrqFYZBf0UL18NTqHrzt8UiSIsAkUuMHtjvFDO6p/overture-creations-5sI6fQgYIuo.png",
  prompt: "Face of a yellow cat, high resolution, sitting on a park bench",
  num_inference_steps: 25,
};

(async () => {
  try {
    // Use a specific model + version hash
    const modelVersion =
      "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3";

    const output = await replicate.run(modelVersion, { input });

    console.log("Output:", output);

    // Replicate usually returns an array of URL strings
    for (let i = 0; i < output.length; i++) {
      const url = output[i];
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(`output_${i}.png`, buf);
      console.log(`Saved output_${i}.png`);
    }
  } catch (err) {
    console.error("Test failed:", err?.message || err);
  }
})();