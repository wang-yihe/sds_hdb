import os, base64, requests, sys
from typing import Optional
from dotenv import load_dotenv

# Load .env from this backend folder explicitly
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# def _get_headers():
#     api_key = os.getenv("OPENAI_API_KEY")
#     org = os.getenv("OPENAI_ORG")
#     if not api_key:
#         raise RuntimeError(
#             "OPENAI_API_KEY is not set. Create a key at https://platform.openai.com/ "
#             "and put it in backend/.env (OPENAI_API_KEY=sk-...) or export it in your shell."
#         )
#     headers = {"Authorization": f"Bearer {api_key}"}
#     if org:
#         headers["OpenAI-Organization"] = org
#     return headers

# def _raise_with_body(resp: requests.Response):
#     try:
#         body = resp.text
#     except Exception:
#         body = "<no body>"
#     msg = f"{resp.status_code} {resp.reason}: {body}"
#     print(f"[OpenAI API ERROR] {msg}", file=sys.stderr)
#     resp.raise_for_status()  # will raise HTTPError with status line; body is printed above

# def gpt_image_edit(
#     image_b64: str,
#     prompt: str,
#     mask_b64: Optional[str] = None,
#     size: str = "1024x1024",
#     model: str = "gpt-image-1",
# ) -> str:
#     """
#     Calls OpenAI Images Edit API and returns base64 PNG of the edited image.
#     Note: mask is a SOFT hint; server will re-composite for hard-mask behavior.
#     """
#     url = "https://api.openai.com/v1/images/edits"
#     headers = _get_headers()

#     # First attempt: field name "image" (common)
#     files = {
#         "image": ("image.png", base64.b64decode(image_b64), "image/png"),
#     }
#     if mask_b64:
#         files["mask"] = ("mask.png", base64.b64decode(mask_b64), "image/png")

#     data = {"prompt": prompt, "size": size, "model": model}
#     r = requests.post(url, headers=headers, data=data, files=files, timeout=600)
#     if not r.ok:
#         # Some stacks require 'image[]' instead of 'image' — try once more:
#         files_alt = {
#             "image[]": ("image.png", base64.b64decode(image_b64), "image/png"),
#         }
#         if mask_b64:
#             files_alt["mask"] = ("mask.png", base64.b64decode(mask_b64), "image/png")
#         r2 = requests.post(url, headers=headers, data=data, files=files_alt, timeout=600)
#         if not r2.ok:
#             _raise_with_body(r2)
#         return r2.json()["data"][0]["b64_json"]

#     return r.json()["data"][0]["b64_json"]

# def gpt_image_generate(
#     prompt: str,
#     size: str = "1024x1024",
#     model: str = "gpt-image-1",
# ) -> str:
#     """
#     Pure image generation from text prompt. Returns base64 PNG.
#     """
#     url = "https://api.openai.com/v1/images/generations"
#     headers = _get_headers()
#     payload = {"prompt": prompt, "size": size, "model": model}
#     r = requests.post(url, headers=headers, json=payload, timeout=600)
#     if not r.ok:
#         _raise_with_body(r)
#     return r.json()["data"][0]["b64_json"]


# # === Vision (GPT-4o/mini) to READ images and return text ===
# def gpt_vision_summarize(messages: list, model: str = "gpt-4o-mini", max_tokens: int = 700) -> str:
#     """
#     Sends a Chat Completions request using GPT-4o-mini (vision enabled).
#     `messages` must follow the ChatGPT format with 'role' and 'content'.
#     'content' can contain text or images: 
#     { "type": "image_url", "image_url": {"url": "data:image/png;base64,..."} }
#     """
#     url = "https://api.openai.com/v1/chat/completions"
#     headers = _get_headers()  # existing helper
#     payload = {
#         "model": model,
#         "messages": messages,
#         "max_tokens": max_tokens,
#     }
#     r = requests.post(url, headers=headers, json=payload, timeout=600)
#     if not r.ok:
#         _raise_with_body(r)
#     return r.json()["choices"][0]["message"]["content"]

# def b64_to_data_url(b64: str, mime: str = "image/png") -> str:
#     return f"data:{mime};base64,{b64}"


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


# ---------------------------
# GPT-4o Vision (reads images → text)
# ---------------------------

def gpt_vision_summarize(messages: list, model: str = "gpt-4o-mini", max_tokens: int = 700) -> str:
    """
    Call Chat Completions with vision content.
    messages example:
    [
      {"role":"system","content":"..."},
      {"role":"user","content":[
         {"type":"text","text":"..."},
         {"type":"image_url","image_url":{"url":"data:image/png;base64,..." }}
      ]}
    ]
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = _get_headers_json()
    payload = {"model": model, "messages": messages, "max_tokens": max_tokens}

    resp = requests.post(url, headers=headers, json=payload, timeout=600)
    if not resp.ok:
        _raise_with_body(resp)
    return resp.json()["choices"][0]["message"]["content"]


# ---------------------------
# GPT Image Edit (makes final image)
# ---------------------------

# --- replace the whole gpt_image_edit function in openai_client.py with this ---

def gpt_image_edit(
    image_b64: str,
    prompt: str,
    mask_b64: Optional[str] = None,
    size: str = "1024x1024",
    model: str = "gpt-image-1"
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

        # Ensure hard 0/255
        m_pil = m_pil.point(lambda v: 255 if v >= 128 else 0).convert("L")

        # Our masks so far used WHITE=editable. For OpenAI Edits:
        #   transparent = editable  -> alpha = 0 where m_pil==255
        #   opaque      = keep      -> alpha = 255 where m_pil==0
        import numpy as np
        arr = np.array(m_pil)  # 0 or 255
        alpha = np.where(arr == 255, 0, 255).astype("uint8")  # invert to transparency
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

    resp = requests.post("https://api.openai.com/v1/images/edits",
                         headers=headers, data=data, files=files, timeout=600)
    if not resp.ok:
        _raise_with_body(resp)

    return resp.json()["data"][0]["b64_json"]