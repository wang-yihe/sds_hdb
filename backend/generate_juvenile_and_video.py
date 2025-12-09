import os
import time
import base64
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv
from openai import OpenAI
from google import genai
from google.genai import types


# === CONFIG ===
BASE_DIR = Path(__file__).resolve().parent
IMAGE_PATH = BASE_DIR / "outputs" / "pic_to_vid" / "generated output 2.jpg"
OUTPUT_DIR = BASE_DIR / "outputs" / "pic_to_vid"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OPENAI_IMAGE_MODEL = "gpt-image-1"
VEO_MODEL = "models/veo-3.1-generate-preview"

MAX_WAIT_SEC = 120  # Stop Veo after 2 minutes to avoid runaway cost.


# --- PROMPTS ---
JUVENILE_PROMPT = (
    "Transform all existing plants in this image into juvenile versions of the same species. "
    "Reduce their height, leaf count, stem thickness, and canopy volume, but keep every plant "
    "in the exact same location and orientation. Do NOT add new plants, remove plants, or change species. "
    "Preserve all non-plant pixels exactly: buildings, hardscape, ground textures, paths, sky, lighting, shadows, "
    "and color tones must stay unchanged. Do not alter the camera angle or perspective. "
    "Only modify the plants so they appear younger and smaller, matching realistic early-growth morphology."
)

VEO_PROMPT = (
    "Create a SHORT video of approximately 6 seconds (around 144 frames at 24 fps). "
    "START exactly from the provided seed image (frame 0). "
    "END by matching the visual appearance of the provided reference image (final frame). "
    "Do NOT move the camera: no zoom, pan, tilt, rotation, parallax, or reframing. "
    "The ONLY change should be the plants gradually morphing from juvenile → mature. "
    "All non-plant pixels must remain unchanged and stable throughout. "
    "Do NOT exceed the requested length; keep the output concise and controlled."
)


# === UTILITIES ===
def timestamp():
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def save_b64_png(b64: str, out_path: Path):
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(b64))


def load_image_bytes(path: Path) -> bytes:
    with open(path, "rb") as f:
        return f.read()


# === STEP 1 — Generate Juvenile Frame ===
def generate_juvenile_image(src_path: Path) -> Path:
    print("Generating juvenile version...")

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    with open(src_path, "rb") as img_file:
        result = client.images.edit(
            model=OPENAI_IMAGE_MODEL,
            image=img_file,
            prompt=JUVENILE_PROMPT,
            size="1024x1024",
            n=1
        )

    b64 = result.data[0].b64_json
    out_path = OUTPUT_DIR / f"juvenile_{timestamp()}.png"
    save_b64_png(b64, out_path)

    print(f"Juvenile image saved: {out_path}")
    return out_path


# === STEP 2 — Generate Veo Video Using 1.53-Compatible Seed + ASSET ===
def generate_video_with_veo(first_frame: Path, last_frame: Path) -> Path:
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

    # Build first (seed) frame
    first_img = types.Image(
        image_bytes=load_image_bytes(first_frame),
        mime_type="image/png" if first_frame.suffix.lower()==".png" else "image/jpeg"
    )

    # Build last (target) frame as ASSET reference
    last_img = types.Image(
        image_bytes=load_image_bytes(last_frame),
        mime_type="image/png" if last_frame.suffix.lower()==".png" else "image/jpeg",
    )

    print("Submitting Veo job (seed image + ASSET reference)...")

    op = client.models.generate_videos(
        model=VEO_MODEL,
        prompt=VEO_PROMPT,
        image=first_img,  # START FRAME
        config=types.GenerateVideosConfig(
            last_frame=last_img # GUIDING toward FINAL FRAME
        ),
    )

    # Poll for completion, with budget timeout
    start = time.time()
    while not op.done and (time.time() - start < MAX_WAIT_SEC):
        print("Waiting for video…")
        time.sleep(5)
        op = client.operations.get(op)

    # Timeout hit → cancel to avoid runaway cost
    if not op.done:
        print("Timeout hit — cancelling job to protect cost budget.")
        try:
            client.operations.cancel(op)
        except Exception:
            pass
        raise RuntimeError("Veo generation cancelled after timeout.")

    # Validate output
    if not op.response or not getattr(op.response, "generated_videos", None):
        raise RuntimeError("No video returned by Veo.")

    video_asset = op.response.generated_videos[0].video
    data = client.files.download(file=video_asset)

    out_path = OUTPUT_DIR / f"veo_growth_video_{timestamp()}.mp4"
    out_path.write_bytes(data)

    print(f"Video saved: {out_path}")
    return out_path


# === MAIN PIPELINE ===
def main():
    load_dotenv()

    if not IMAGE_PATH.exists():
        raise FileNotFoundError(f"Reference image not found: {IMAGE_PATH}")

    # STEP 1 — Juvenile
    juvenile_path = generate_juvenile_image(IMAGE_PATH)

    # STEP 2 — Video
    generate_video_with_veo(juvenile_path, IMAGE_PATH)


if __name__ == "__main__":
    main()