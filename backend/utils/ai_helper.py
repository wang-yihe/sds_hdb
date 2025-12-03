import os
import base64
import requests
import sys
import errno
import uuid
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv
from PIL import Image, ImageFilter
import io
import numpy as np
import cv2
from rembg import remove as rembg_remove
import random

OUT_DIR = Path("./storage/generated_images")

# Load .env from this backend folder explicitly
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def _pil_to_b64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _rgba_to_rgb(pil: Image.Image, bg=(255, 255, 255)) -> Image.Image:
    if pil.mode == "RGB":
        return pil
    bg_img = Image.new("RGB", pil.size, bg)
    return Image.alpha_composite(bg_img.convert("RGBA"), pil).convert("RGB")

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

def gpt_vision_summarize(messages: list, model: str = "gpt-5.1", max_tokens: int = 500) -> str:
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
    payload = {"model": model, "messages": messages, "max_completion_tokens": max_tokens}

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
            m_pil = m_pil.resize((W, H), Image.Resampling.NEAREST)

        # Ensure hard 0/255
        m_pil = m_pil.point(lambda v: 255 if v >= 128 else 0).convert("L") # type: ignore

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

def _b64_to_pil(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64)))

def _pil_to_b64_png(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()

def _normalize_mask_L(mask_b64: str, W: int, H: int) -> Image.Image:
    """Return single-channel 'L' mask (WHITE=editable) resized to (W,H); auto-invert if almost empty/full."""
    m = _b64_to_pil(mask_b64).convert("L").resize((W, H), Image.Resampling.NEAREST)
    arr = np.where(np.array(m) >= 128, 255, 0).astype(np.uint8)
    r = (arr == 255).mean()
    if r < 0.02 or r > 0.98:
        arr = 255 - arr
    return Image.fromarray(arr, "L")

def _lmask_to_openai_rgba(mask_L: Image.Image) -> bytes:
    """OpenAI edits where alpha==0 (transparent). Convert WHITE(255)=edit -> alpha 0."""
    W, H = mask_L.size
    arr = np.array(mask_L, np.uint8)
    alpha = np.where(arr == 255, 0, 255).astype(np.uint8)
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., 3] = alpha
    im = Image.fromarray(rgba, "RGBA")
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()

def _clamp_to_mask_keep_outside(base_b64: str, gen_b64: str, mask_b64: str) -> str:
    """Hard guarantee: base outside mask + gen inside mask."""
    def b64_to_cv(b):
        a = np.frombuffer(base64.b64decode(b), np.uint8)
        return cv2.imdecode(a, cv2.IMREAD_COLOR)
    base = b64_to_cv(base_b64)
    gen = b64_to_cv(gen_b64)
    Hb, Wb = base.shape[:2]
    if gen.shape[:2] != (Hb, Wb):
        gen = cv2.resize(gen, (Wb, Hb), interpolation=cv2.INTER_CUBIC)
    mL = _normalize_mask_L(mask_b64, Wb, Hb)
    mask = (np.array(mL) == 255)
    out = base.copy()
    out[mask] = gen[mask]
    ok, enc = cv2.imencode(".png", out)
    return base64.b64encode(enc.tobytes()).decode()

def _lab_color_transfer(src_b64: str, ref_b64: str) -> str:
    """Re-tone src to match ref (photographic look)."""
    def b64_to_cv(b):
        a = np.frombuffer(base64.b64decode(b), np.uint8)
        return cv2.imdecode(a, cv2.IMREAD_COLOR)
    src = b64_to_cv(src_b64)
    ref = b64_to_cv(ref_b64)
    H, W = src.shape[:2]
    ref = cv2.resize(ref, (W, H), interpolation = cv2.INTER_AREA)
    s = cv2.cvtColor(src, cv2.COLOR_BGR2LAB).astype(np.float32)
    r = cv2.cvtColor(ref, cv2.COLOR_BGR2LAB).astype(np.float32)
    s_m, s_s = cv2.meanStdDev(s)
    r_m, r_s = cv2.meanStdDev(r)
    s_s = np.where(s_s < 1e-6, 1.0, s_s)
    r_s = np.where(r_s < 1e-6, 1.0, r_s)
    out = (s - s_m.reshape(1,1,3)) * (r_s / s_s) + r_m.reshape(1,1,3)
    out = np.clip(out, 0, 255).astype(np.uint8)
    out = cv2.cvtColor(out, cv2.COLOR_LAB2BGR)
    ok, enc = cv2.imencode(".png", out)
    return base64.b64encode(enc.tobytes()).decode()




def _alpha_cutout(ref_b64: str) -> Image.Image:
    im = _b64_to_pil(ref_b64).convert("RGB")
    out = rembg_remove(np.array(im))  # RGBA
    return Image.fromarray(np.asarray(out)).convert("RGBA")

def build_plant_guide(
    base_b64: str,
    mask_b64: str,
    plant_refs_b64: List[str],
    density: int,
    alpha: int,
    scale_range=(0.7, 1.3),
) -> str:
    base = _b64_to_pil(base_b64).convert("RGBA")
    W, H = base.size
    mL = _normalize_mask_L(mask_b64, W, H)
    m = np.array(mL)

    cutouts = [_alpha_cutout(b) for b in plant_refs_b64 if b]
    if not cutouts:
        return base64.b64encode(base.tobytes()).decode()

    ys, xs = np.where(m == 255)
    if len(xs) == 0:
        return _pil_to_b64_png(base)

    coords = list(zip(ys, xs))
    random.shuffle(coords)
    step = max(1, len(coords) // max(1, density))
    coords = coords[::step][:density]

    canvas = base.copy()
    for (y, x) in coords:
        co = random.choice(cutouts).copy()
        s = random.uniform(*scale_range)
        nw, nh = int(co.width * s), int(co.height * s)
        if nw < 32 or nh < 32:
            continue
        co = co.resize((nw, nh), Image.Resampling.LANCZOS)

        bx, by = int(x - nw//2), int(y - nh//2)
        if bx < 0 or by < 0 or bx+nw > W or by+nh > H:
            continue

        region = m[by:by+nh, bx:bx+nw]
        if region.shape[:2] != (nh, nw) or (region == 255).mean() < 0.6:
            continue

        co = co.filter(ImageFilter.GaussianBlur(radius=0.6))
        r, g, b, a = co.split()
        a = a.point(lambda v: min(alpha, v)) # type: ignore
        co = Image.merge("RGBA", (r, g, b, a))
        canvas.alpha_composite(co, (bx, by))

    return _pil_to_b64_png(canvas)




def _save_b64_png(b64: str, prefix: str) -> str:
    """
    Save a base64 PNG into OUT_DIR with a short UUID filename.
    Falls back to /tmp if Errno 63 (filename too long) or similar occurs.
    """
    name = f"{prefix}_{uuid.uuid4().hex}.png"
    p = OUT_DIR / name
    raw = base64.b64decode(b64)

    try:
        p.write_bytes(raw)
        return str(p)
    except OSError as e:
        # Fallbacks for path issues
        if e.errno in (errno.ENAMETOOLONG, errno.ENOENT, errno.EINVAL):
            tmp_dir = Path("/tmp/sds_out_fallback")
            tmp_dir.mkdir(parents=True, exist_ok=True)
            p2 = tmp_dir / name
            p2.write_bytes(raw)
            return str(p2)
        raise


def _open_as_base64(path_or_b64: str) -> str:
    """
    Safely convert file path → base64.
    If the input is already base64, return it unchanged.
    Detect base64 by checking for valid chars + padding.
    """
    # If it's very long, it’s almost certainly base64
    if len(path_or_b64) > 500:
        return path_or_b64

    # If it's only letters/numbers/+/= it's probably base64
    import re
    b64_re = re.compile(r'^[A-Za-z0-9+/=\s]+$')
    if b64_re.match(path_or_b64.strip()):
        # Try decoding to confirm
        try:
            base64.b64decode(path_or_b64, validate=True)
            return path_or_b64  # It's valid base64
        except Exception:
            pass

    # Otherwise treat as file path
    p = Path(path_or_b64)
    if p.exists():
        raw = p.read_bytes()
        return base64.b64encode(raw).decode("utf-8")

    # fallback
    return path_or_b64


WEIGHTS = {
    "perspective": 1.0,  # hard-clamped
    "style": 0.9,
    "plants": 0.7,
    "mask": 1.0,         # hard rule
    "prompt": 0.3,
}