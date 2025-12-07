# generate_video_from_path.py
import os
import pathlib
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

# === CONFIG ===
BASE_DIR = Path(__file__).resolve().parent  # backend/
IMAGE_PATH = BASE_DIR / "outputs" / "pic_to_vid" / "generated output 1.jpg"
OUTPUT_DIR = BASE_DIR / "outputs" / "pic_to_vid"

PROMPT = (
    "Create a 5-10 second smooth camera move of this landscape. "
    "Preserve layout, perspective. No extra objects."
)

MODEL_NAME = "models/veo-3.1-generate-preview"  # you have access to this model


def main():
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GOOGLE_API_KEY in .env")

    client = genai.Client(api_key=api_key)

    img_path = pathlib.Path(IMAGE_PATH)
    if not img_path.exists():
        raise FileNotFoundError(f"Image not found: {img_path}")

    # ---- Build an inline image (not a file) ----
    # Veo expects image_bytes + mime_type.
    with open(img_path, "rb") as f:
        img_bytes = f.read()

    inline_image = types.Image(
        image_bytes=img_bytes,
        mime_type="image/jpeg",  # or image/png
    )

    ref = types.VideoGenerationReferenceImage(
        image=inline_image,
        reference_type=types.VideoGenerationReferenceType.ASSET,
    )

    print(f"Using model: {MODEL_NAME}")
    print("Generating video...")

    op = client.models.generate_videos(
        model=MODEL_NAME,
        prompt=PROMPT,
        config=types.GenerateVideosConfig(
            reference_images=[ref],
            # You can add more controls here if your model supports them.
        ),
    )

    # Poll until done
    while not op.done:
        op = client.operations.get(op)
        time.sleep(5)

    if not op.response or not getattr(op.response, "generated_videos", None):
        raise RuntimeError("No video returned by Veo.")

    video_file = op.response.generated_videos[0].video
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_path = OUTPUT_DIR / f"veo_output_{timestamp}.mp4"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    video_bytes = client.files.download(file=video_file)
    out_path.write_bytes(video_bytes)

    print(f"Video saved to: {out_path}")


if __name__ == "__main__":
    main()
