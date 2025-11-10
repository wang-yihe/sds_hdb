from google import genai
from google.genai import types as gg_types
from PIL import Image
import io
import os
import sys
import base64

# --- 1) Auth: use GEMINI_API_KEY for the standalone Gemini API ---
# export GEMINI_API_KEY="your_key"  (macOS/Linux)
# setx GEMINI_API_KEY "your_key"    (Windows)
client = genai.Client()  # auto-reads GEMINI_API_KEY

prompt = "Keep the layout, brighten the scene slightly, and remove harsh noise."
input_path = "your_input.jpg"
output_path = "gemini_edited.png"

# --- 2) Read your local image and wrap it properly for the SDK ---
try:
    with open(input_path, "rb") as f:
        image_bytes = f.read()
except FileNotFoundError:
    print(f"Input file not found: {input_path}", file=sys.stderr)
    raise

# Either approach works:
# A) pass a PIL.Image
# ref_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

# B) pass a typed blob with a declared mime type (shown here)
ref_image_blob = gg_types.Blob(mime_type="image/jpeg", data=image_bytes)

# --- 3) Call Gemini 2.5 Flash Image for editing/fusion ---
try:
    resp = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[prompt, ref_image_blob],   # text + image
        config=gg_types.GenerateContentConfig(
            response_modalities=["Image"]   # be explicit: we want images back
        ),
    )
except Exception as e:
    print("API request failed:", e, file=sys.stderr)
    raise

# --- 4) Save image from response ---
def save_image_bytes(bts: bytes, path: str):
    img = Image.open(io.BytesIO(bts)).convert("RGB")
    img.save(path)
    print(f"Saved {path}")

saved = False
for part in getattr(resp, "parts", []) or []:
    # Preferred: convenience method (newer SDKs)
    if hasattr(part, "as_image"):
        try:
            img = part.as_image()  # returns a PIL.Image
            img.save(output_path)
            print(f"Saved {output_path} (via part.as_image())")
            saved = True
            break
        except Exception as e:
            print("part.as_image() failed:", e, file=sys.stderr)

    # Fallback: inline_data with base64-encoded bytes
    inline = getattr(part, "inline_data", None)
    if inline and getattr(inline, "data", None):
        try:
            bts = base64.b64decode(inline.data)
            save_image_bytes(bts, output_path)
            saved = True
            break
        except Exception as e:
            print("Failed to decode inline_data:", e, file=sys.stderr)

# Extra fallbacks (rare)
if not saved:
    print("No image found in response. Full response for debugging:")
    try:
        print(resp)
    except Exception:
        print(repr(resp))

import torch
from diffusers import (
    StableDiffusionXLImg2ImgPipeline,
    StableDiffusionXLControlNetPipeline,
    ControlNetModel,
)
import numpy as np
import cv2
# -------------------------------
# Model IDs (SDXL base + ControlNet Canny for SDXL)
# -------------------------------
SDXL_BASE = "stabilityai/stable-diffusion-xl-base-1.0"
CONTROLNET_CANNY_SDXL = "diffusers/controlnet-canny-sdxl-1.0"  # SDXL Canny ControlNet

# Pick device
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

# -------------------------------
# Load pipelines once (global)
# -------------------------------
pipe_img2img = StableDiffusionXLImg2ImgPipeline.from_pretrained(
    SDXL_BASE,
    torch_dtype=DTYPE,
    use_safetensors=True
).to(DEVICE)

controlnet = ControlNetModel.from_pretrained(
    CONTROLNET_CANNY_SDXL,
    torch_dtype=DTYPE,
    use_safetensors=True
)
pipe_control = StableDiffusionXLControlNetPipeline.from_pretrained(
    SDXL_BASE,
    controlnet=controlnet,
    torch_dtype=DTYPE,
    use_safetensors=True
).to(DEVICE)


def _canny_edge_pil(pil_img: Image.Image, low: int = 100, high: int = 200) -> Image.Image:
    """
    Create a 3-channel Canny edge map from a PIL image for ControlNet conditioning.
    """
    arr = np.array(pil_img.convert("RGB"))
    edges = cv2.Canny(arr, threshold1=low, threshold2=high)
    edges_rgb = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
    return Image.fromarray(edges_rgb)


def _preserve_size(pil_img: Image.Image, max_side: int = 1024) -> Image.Image:
    """
    SDXL works well around 1024. To keep composition, we only downscale (never upscale).
    """
    w, h = pil_img.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return pil_img


def refine_with_sdxl_controlnet(
    gemini_image: Image.Image,
    prompt: str,
    denoise_strength: float = 0.2,   # lower = more preservation; try 0.15–0.30
    guidance_scale: float = 3.0,     # lower = less stylization; 2–4 for "cleanup"
    use_controlnet: bool = True,
    canny_low: int = 80,
    canny_high: int = 180,
    steps: int = 30,
):
    """
    Refine/denoise the Gemini image without changing its structure.
    - Use low 'strength' to keep composition.
    - Use ControlNet(Canny) edges to "lock" geometry/edges, if enabled.
    Returns a PIL.Image
    """
    # 1) Keep a reasonable size (don’t upscale; optional but practical)
    base_img = _preserve_size(gemini_image, max_side=1024)

    if use_controlnet:
        # 2) Build control image (edges) so SDXL follows existing structure
        control_img = _canny_edge_pil(base_img, low=canny_low, high=canny_high)

        result = pipe_control(
            prompt=prompt,
            image=base_img,                 # img2img initial image
            control_image=control_img,      # structural guide
            strength=float(denoise_strength),
            guidance_scale=float(guidance_scale),
            num_inference_steps=int(steps)
        )
    else:
        # Plain img2img (gentle cleanup)
        result = pipe_img2img(
            prompt=prompt,
            image=base_img,
            strength=float(denoise_strength),
            guidance_scale=float(guidance_scale),
            num_inference_steps=int(steps)
        )

    return result.images[0]