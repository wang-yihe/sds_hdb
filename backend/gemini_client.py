import os, base64, requests, sys
from typing import Optional
from dotenv import load_dotenv
from PIL import Image
import numpy as np
import cv2
import io
import google.generativeai as genai
from vertexai.preview.vision_models import ImageGenerationModel 
from vertexai.preview.vision_models import MaskReferenceImage
from vertexai.preview.vision_models import RawReferenceImage
import vertexai
import re

from google.oauth2 import service_account

# Load .env from this backend folder explicitly
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

_DATAURL_RE = re.compile(r"^data:(?P<mime>[^;]+);base64,(?P<b64>.+)$", re.IGNORECASE)

KEY_PATH = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

PROJECT_ID = "geminiproject-06767" 
LOCATION = "asia-southeast1"

try:
    vertexai.init(
        project=PROJECT_ID, 
        location=LOCATION,
        # Note: If GOOGLE_APPLICATION_CREDENTIALS is set, you don't need to pass credentials=
        credentials="/Users/zzziyah/Desktop/School/Term 7/Spatial Design Studio/vertex/geminiproject-06767-1843e4fd2c21.json"
    )
    print(f"Vertex AI SDK initialized successfully for project: {PROJECT_ID}")
except Exception as e:
    print(f"ERROR: Failed to initialize Vertex AI SDK. Check your Project ID, Location, and permissions. Details: {e}")
    # You might want to exit the program if initialization fails
    exit(1)


def _erode_binary_pil(pil_L, px=4):
    arr = np.array(pil_L)  # 0..255
    bin = (arr >= 128).astype("uint8") * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (px, px))
    eroded = cv2.erode(bin, kernel, iterations=1)
    return Image.fromarray(eroded, mode="L")


def _get_headers_json() -> dict:
    """
    Headers for Chat Completions (GPT-4o / GPT-4o-mini vision).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    org = os.getenv("OPENAI_ORG")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY missing — add it to backend/.env")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if org:
        headers["OpenAI-Organization"] = org
    return headers


def _get_headers_form() -> dict:
    """
    Headers for Images Edit / Images Generate (multipart/form-data).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    org = os.getenv("OPENAI_ORG")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY missing — add it to backend/.env")

    headers = {
        "Authorization": f"Bearer {api_key}",
    }
    if org:
        headers["OpenAI-Organization"] = org
    return headers


def _raise_with_body(resp: requests.Response) -> None:
    """
    Print server error body to stderr then raise for status.
    Helps you see exact OpenAI error messages in Uvicorn logs.
    """
    try:
        body = resp.text
    except Exception:
        body = "<no body>"
    print(f"[OPENAI ERROR] {resp.status_code} {resp.reason}: {body}", file=sys.stderr)
    resp.raise_for_status()


def b64_to_data_url(b64_str: str, mime: str = "image/png") -> str:
    """
    Convert raw base64 (no prefix) into a data URL for vision messages.
    """
    return f"data:{mime};base64,{b64_str}"


def _dataurl_to_part(url: str) -> dict:
    """
    Convert a data URL (data:image/png;base64,...) into a Gemini content part:
      {"mime_type": "...", "data": b"..."}
    """
    m = _DATAURL_RE.match(url.strip())
    if not m:
        raise ValueError("Gemini requires inline image bytes. Got a non-data URL.")
    mime = m.group("mime")
    raw = base64.b64decode(m.group("b64"))
    return {"mime_type": mime, "data": raw}

def _b64_to_image_bytes(b64_string: str) -> bytes:
    """Decodes a base64 string into raw image bytes."""
    img_bytes = base64.b64decode(b64_string)
    img_pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    
    # Convert PIL Image back to bytes (e.g., JPEG for efficiency)
    img_buf = io.BytesIO()
    img_pil.save(img_buf, format="JPEG")
    return img_buf.getvalue()
# ---------------------------
# GPT-4o Vision (reads images → text)
# ---------------------------



def _ensure_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY missing — add it to backend/.env")
    genai.configure(api_key=api_key)

def gpt_vision_summarize(messages: list, model: str = "gemini-2.5-flash-image", max_tokens: int = 500) -> str:
    """
    Gemini vision summarization.
    Accepts your OpenAI-style messages and flattens them into a single array of
    Gemini 'parts' (text + image bytes).
    """
    model_obj = genai.GenerativeModel(model)

    parts: list = []
    for msg in messages:
        content = msg.get("content")
        if not content:
            continue

        # If content is already a list of segments (OpenAI style)
        if isinstance(content, list):
            for item in content:
                t = item.get("type")
                if t == "text":
                    txt = (item.get("text") or "").strip()
                    if txt:
                        parts.append({"text": txt})
                elif t == "image_url":
                    url = item["image_url"]["url"]
                    # Must be a data URL; Gemini won't fetch remote HTTP(S)
                    parts.append(_dataurl_to_part(url))
                elif t == "image":  # optional: if you ever pass raw b64 in custom code
                    # item["image"] expected to be raw base64 (no prefix)
                    b = base64.b64decode(item["image"])
                    parts.append({"mime_type": item.get("mime_type", "image/png"), "data": b})
                else:
                    # Ignore unknown segment types
                    pass

        # If content is a single string
        elif isinstance(content, str):
            txt = content.strip()
            if txt:
                parts.append({"text": txt})

    # Guard: must have at least one text or image part
    if not parts:
        return ""

    resp = model_obj.generate_content(
        parts,
        generation_config={"max_output_tokens": int(max_tokens)}
    )

    return getattr(resp, "text", "") or ""


# ---------------------------
# GPT Image Edit (makes final image)
# ---------------------------

# --- replace the whole gpt_image_edit function in openai_client.py with this ---

def gpt_image_edit(
    image_b64: str,
    prompt: str,
    mask_b64: Optional[str] = None,
    size: str = "1024x1024",
    model: str = "gpt-image-1",
    strict_hard_mask=True,
    feather_px=0,
    dilate_px=0,
    letterbox_square=True,
    edit_opaque_area: bool = False,
) -> str:
    """
    Calls OpenAI Images Edit API and returns base64 PNG string (no data URL).
    Ensures: mask is EXACTLY same size as image and is a PNG with transparency
    where transparent pixels indicate the editable area.
    """
    from PIL import Image, ImageOps
    import io

    # Decode base image -> normalize to PNG bytes (to avoid EXIF/orientation issues)
    img_bytes = base64.b64decode(image_b64)
    img_pil = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    W, H = img_pil.size
    img_buf = io.BytesIO()
    img_pil.save(img_buf, format="PNG")
    img_png_bytes = img_buf.getvalue()

    files = {
        "image": ("image.png", img_png_bytes, "image/png"),
    }

    if mask_b64:
        # Decode mask -> force to L, resize to (W,H), then convert to RGBA where:
        #   transparent = EDIT AREA (OpenAI edits here)
        #   opaque      = PRESERVE
        m_bytes = base64.b64decode(mask_b64)
        m_pil = Image.open(io.BytesIO(m_bytes)).convert("L")
        if m_pil.size != (W, H):
            m_pil = m_pil.resize((W, H), Image.NEAREST)

        # Tighten the mask so the model can’t “paint” over bed edges
        m_pil = _erode_binary_pil(m_pil, px=4)

        # Ensure hard 0/255
        m_pil = m_pil.point(lambda v: 255 if v >= 128 else 0).convert("L")

        # Our masks so far used WHITE=editable. For OpenAI Edits:
        #   transparent = editable  -> alpha = 0 where m_pil==255
        #   opaque      = keep      -> alpha = 255 where m_pil==0
        import numpy as np
        arr = np.array(m_pil)  # 0 or 255
        
        if edit_opaque_area:
            # White(255) => alpha 0 (editable), Black(0) => alpha 255 (keep)
            alpha = np.where(arr == 255, 255, 0).astype("uint8")
        else:
            # Default OpenAI semantics (transparent = editable):
            # White(255) => alpha 0 (editable), Black(0) => alpha 255 (keep)
            alpha = np.where(arr == 255, 0, 255).astype("uint8")

        rgba = np.zeros((H, W, 4), dtype="uint8")
        rgba[..., 3] = alpha  # only alpha matters
        mask_rgba = Image.fromarray(rgba, mode="RGBA")

        m_buf = io.BytesIO()
        mask_rgba.save(m_buf, format="PNG")
        mask_png_bytes = m_buf.getvalue()

        files["mask"] = ("mask.png", mask_png_bytes, "image/png")

        # helpful debug
        print(f"[gpt_image_edit] base size: {W}x{H}, mask size: {mask_rgba.size[0]}x{mask_rgba.size[1]}")


    data = {"prompt": prompt, "size": size, "model": model}
    headers = _get_headers_form()

    print("before")
    if os.getenv("DEBUG_IMAGE_EDITS"):
        print("hereh")
        with open("/tmp/edit_base.png", "wb") as f: f.write(img_png_bytes)
        if "mask" in files:
            with open("/tmp/edit_mask.png", "wb") as f: f.write(mask_png_bytes)

    resp = requests.post("https://api.openai.com/v1/images/edits",
                         headers=headers, data=data, files=files, timeout=600)
    if not resp.ok:
        _raise_with_body(resp)

    return resp.json()["data"][0]["b64_json"]


def vertex_ai_image_edit_mask(
    image_b64: str,
    prompt: str,
    mask_b64: str,
    model: str = "imagen-3.0-edit-002", # Use an editing-focused model
) -> str:
    """
    Calls the Vertex AI Imagen Image Editing API with a user-provided mask.
    """
    print("here 7")
    # 2. Load the pre-trained Imagen model
    model_client = ImageGenerationModel.from_pretrained(model)

    print("here 8")
    
    # 3. Prepare Base Image and Mask Image (Base64 -> Bytes -> Reference Objects)
    base_image_bytes = _b64_to_image_bytes(image_b64)
    mask_image_bytes = _b64_to_image_bytes(mask_b64)

    # Wrap the raw image bytes in the required SDK objects
    source_image = RawReferenceImage(image_bytes=base_image_bytes)
    mask_image = MaskReferenceImage(image_bytes=mask_image_bytes)
    
    print("Calling Vertex AI Imagen for localized editing...")
    
    try:
        response = model_client.edit_image(
            prompt=prompt,
            base_image=source_image,
            mask=mask_image,
            number_of_images=1,
            # Use 'inpainting' for replacing content in the masked area
            edit_mode="inpainting", 
            timeout=300.0
        )

        if response.generated_images:
            # The edited image is returned as raw bytes (image_bytes),
            # which we convert back to B64 string for a consistent output format.
            edited_bytes = response.generated_images[0].image_bytes
            return base64.b64encode(edited_bytes).decode("utf-8")
        
        return "Error: No image data returned."

    except Exception as e:
        print(f"An error occurred during localized editing: {e}")
        return None