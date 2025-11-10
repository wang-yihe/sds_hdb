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
