// server/index.js (CommonJS, robust + fallbacks)
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Replicate = require("replicate");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); // allow bigger images

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// quick health checks
app.get("/ping", (_req, res) => res.json({ ok: true, hasToken: !!process.env.REPLICATE_API_TOKEN }));

// dataURL -> Buffer
function dataUrlToBuffer(dataUrl) {
  const i = dataUrl.indexOf(",");
  if (i === -1) return null;
  return Buffer.from(dataUrl.slice(i + 1), "base64");
}

// Try a list of known inpainting models, first that works wins
const MODELS = [
  // 1) runwayml (older but widely referenced)
  "runwayml/stable-diffusion-inpainting:latest",
  // 2) stability-ai SD 2.0 inpainting
  "stability-ai/stable-diffusion-2-inpainting:latest",
  // 3) stability-ai SD 1.5 inpainting (some forks use this name)
  "stability-ai/stable-diffusion-inpainting:latest",
];

async function callReplicate(model, imageBuf, maskBuf, prompt, num) {
  return replicate.run(model, {
    input: {
      image: imageBuf,            // Buffers are OK with the SDK; it uploads them
      mask: maskBuf,
      prompt,
      num_outputs: num,
      guidance_scale: 7.5,
      num_inference_steps: 50,
    },
  });
}

app.post("/inpaint", async (req, res) => {
  try {
    const { image, mask, prompt = "plausibly fill the selected area", num = 3 } = req.body;
    if (!image || !mask) return res.status(400).send("Missing image or mask");

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(401).send("Missing REPLICATE_API_TOKEN");
    }

    const imageBuf = dataUrlToBuffer(image);
    const maskBuf = dataUrlToBuffer(mask);
    if (!imageBuf || !maskBuf) return res.status(400).send("Bad image/mask format");

    let lastErr = null;
    for (const model of MODELS) {
      try {
        console.log("Trying model:", model);
        const output = await callReplicate(model, imageBuf, maskBuf, prompt, num);
        // Replicate usually returns array of URLs
        if (Array.isArray(output) && output.length) {
          return res.json({ model, images: output });
        }
        // Some models return { output: [...] }
        if (output?.output && Array.isArray(output.output)) {
          return res.json({ model, images: output.output });
        }
        lastErr = new Error("Unknown output format from model");
      } catch (e) {
        lastErr = e;
        console.error(`Model failed (${model}):`, e?.message || e);
        // try next model
      }
    }

    console.error("All models failed. Last error:", lastErr?.message || lastErr);
    return res.status(500).send(lastErr?.message || "Inpaint failed");
  } catch (err) {
    console.error("Inpaint error (outer):", err?.message || err);
    return res.status(500).send(err?.message || "Inpaint failed");
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));