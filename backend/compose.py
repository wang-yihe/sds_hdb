import base64, numpy as np
from io import BytesIO
from PIL import Image, ImageFilter
try:
    import cv2  # optional for Poisson blending
except Exception:
    cv2 = None

def decode_b64_image(b64: str) -> Image.Image:
    return Image.open(BytesIO(base64.b64decode(b64))).convert("RGBA")

def encode_b64_png(img: Image.Image) -> str:
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def hard_composite(original: Image.Image, edited: Image.Image, mask: Image.Image, feather_px: int = 2) -> Image.Image:
    """original, edited: RGBA; mask: L (white=replace)"""
    edited = edited.resize(original.size)
    mask = mask.convert("L").resize(original.size)
    if feather_px > 0:
        mask = mask.filter(ImageFilter.GaussianBlur(radius=feather_px))
    return Image.composite(edited, original, mask)

def poisson_blend(original: Image.Image, edited: Image.Image, mask: Image.Image) -> Image.Image:
    """Nice edge blending; falls back to hard if cv2 missing."""
    if cv2 is None:
        return hard_composite(original, edited, mask, feather_px=2)
    ori = cv2.cvtColor(np.array(original.convert("RGB")), cv2.COLOR_RGB2BGR)
    edt = cv2.cvtColor(np.array(edited.convert("RGB")), cv2.COLOR_RGB2BGR)
    m   = np.array(mask.convert("L"))
    center = (ori.shape[1]//2, ori.shape[0]//2)
    blended = cv2.seamlessClone(edt, ori, m, center, cv2.NORMAL_CLONE)
    return Image.fromarray(cv2.cvtColor(blended, cv2.COLOR_BGR2RGB)).convert("RGBA")