# Load .env and provide defensive imports + env mapping
from dotenv import load_dotenv, find_dotenv
from pathlib import Path
import os
import sys

# Load .env from the nearest .env in parent folders (frontend/.env will be found)
# Try repo-level and frontend/.env explicitly (frontend/.env exists in this project)
repo_root = Path(__file__).resolve().parents[1]
env_candidates = [repo_root / ".env", repo_root / "frontend" / ".env"]
loaded = False
for p in env_candidates:
    if p.exists():
        load_dotenv(p)
        loaded = True
        break
if not loaded:
    env_path = find_dotenv()
    if env_path:
        load_dotenv(env_path)
    else:
        # nothing found; continue — script will later error if no key
        pass

try:
    from google import genai
    from google.genai import types as gg_types
except ModuleNotFoundError:
    # Fallback to alternate package name if installed as 'genai'
    try:
        import genai as genai
        from genai import types as gg_types
        print("Imported 'genai' package (fallback).")
    except ModuleNotFoundError:
        raise ModuleNotFoundError(
            "GenAI SDK not found. Install with: pip install google-genai  (or pip install genai)."
        )

# Ensure GEMINI_API_KEY (from your .env) is available under common env names
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    os.environ.setdefault("GENAI_API_KEY", gemini_key)
    os.environ.setdefault("GOOGLE_API_KEY", gemini_key)

from PIL import Image
import io, base64

# 1️⃣ Create client (will read API key from env depending on SDK)
# Prefer explicit api_key from environment so the client is initialized correctly
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GENAI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("No API key found. Set GEMINI_API_KEY (or GENAI_API_KEY/GOOGLE_API_KEY) in your .env or environment.")
client = genai.Client(api_key=api_key)



# 2️⃣ Prompt + paths
prompt = "This is a roof top garden, thus, use short plants, i want ornamental tropical garden elements, while keeping a minimalist look and plants that attract butterflies"
BASE_DIR = Path(__file__).resolve().parent
# Use files relative to this script so running from repo root still works
input_path = str(BASE_DIR / "your_input.png")      # PNG file
output_path = str(BASE_DIR / "gemini_output.png")  # output file



# 3️⃣ Read the PNG file
try:
    with open(input_path, "rb") as f:
        image_bytes = f.read()
except FileNotFoundError:
    print(f"Input file not found: {input_path}", file=sys.stderr)
    raise

# 4️⃣ Wrap the PNG image with correct MIME type
# Use the SDK Image type (imageBytes + mimeType) which the client accepts
if hasattr(gg_types, 'Image'):
    ref_image = gg_types.Image(imageBytes=image_bytes, mimeType="image/png")
else:
    # fallback to Blob (older shapes)
    ref_image = gg_types.Blob(data=image_bytes, mimeType="image/png")



# 5️⃣ Send both prompt + image to Gemini 2.5 Flash Image
try:
    # Upload the file first so we can reference it by URI (SDK expects file uri + mime_type)
    try:
        uploaded = client.files.upload(file=input_path)
        print(f"Uploaded file: {getattr(uploaded, 'uri', repr(uploaded))}")
        file_ref = uploaded
    except Exception:
        # fallback: create a File object with a data URI (if upload not allowed)
        file_ref = None
        if hasattr(gg_types, 'File') and getattr(ref_image, 'mimeType', None):
            # try to set a File with data URI
            data_b64 = base64.b64encode(image_bytes).decode('ascii')
            data_uri = f"data:image/png;base64,{data_b64}"
            try:
                file_ref = gg_types.File(uri=data_uri, mimeType='image/png')
            except Exception:
                file_ref = None

    if file_ref is None:
        raise RuntimeError('Unable to obtain a file reference for the image (upload failed and data-uri fallback failed)')

    resp = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[prompt, file_ref],
        config=gg_types.GenerateContentConfig(),
    )
except Exception as e:
    print("API request failed:", e, file=sys.stderr)
    raise




# 6️⃣ Save the returned image (robust handling + debug)
saved = False
print('Response object type:', type(resp))
try:
    parts = getattr(resp, 'parts', None) or []
    print(f'Number of parts: {len(parts)}')
    for idx, part in enumerate(parts):
        print(f'Part {idx}: type={type(part)}, has as_image={hasattr(part, "as_image")}, inline_data={getattr(part, "inline_data", None) is not None}')
        if hasattr(part, 'as_image'):
            img = part.as_image()
            if img is not None:
                img.save(output_path)
                print(f'Saved {output_path} (via part.as_image())')
                saved = True
                break
            else:
                print('part.as_image() returned None')

        inline = getattr(part, 'inline_data', None) or getattr(part, 'data', None) or getattr(part, 'binary', None)
        if inline:
            try:
                b = inline.data if hasattr(inline, 'data') else inline
                if isinstance(b, str):
                    b = base64.b64decode(b)
                save_img = Image.open(io.BytesIO(b)).convert('RGB')
                save_img.save(output_path)
                print(f'Saved {output_path} (via inline bytes)')
                saved = True
                break
            except Exception as e:
                print('Failed to parse inline bytes:', e)

    # Check for generated_images field or top-level image lists
    if not saved:
        gen_imgs = getattr(resp, 'generated_images', None) or getattr(resp, 'generatedImages', None) or getattr(resp, 'images', None)
        if gen_imgs:
            print('Found generated images container, saving first entry')
            first = gen_imgs[0]
            if hasattr(first, 'image'):
                img_obj = getattr(first, 'image')
                if getattr(img_obj, 'imageBytes', None):
                    img = Image.open(io.BytesIO(img_obj.imageBytes)).convert('RGB')
                    img.save(output_path)
                    print(f'Saved {output_path} (via generated_images[0].image.imageBytes)')
                    saved = True
        
except Exception as e:
    print('Error while parsing response:', e)

if not saved:
    print('No image saved. Full response dump:')
    try:
        print(resp)
    except Exception:
        print(repr(resp))
