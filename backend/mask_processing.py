# backend/mask_processing.py
"""
Mask processing utilities for the rooftop garden generator.

WHAT THIS MODULE DOES
---------------------
1) Converts a designer-provided GREEN overlay into a clean binary mask.
   - WHITE (255) = editable (plantable)
   - BLACK (0)   = preserve

2) Produces TWO masks:
   - HARD MASK  : strictly the plantable ground/trunk zone (roots must be inside)
   - SOFT MASK  : an expanded version that allows canopy/fronds to extend
                  slightly beyond the ground bed for natural overlap in the final image.

HOW TO USE
----------
>>> hard_b64, soft_b64 = make_hard_and_soft_masks_from_green(overlay_b64, base_image_b64)
- overlay_b64: perspective with green-painted plantable areas (PNG/JPG base64, no prefix)
- base_image_b64: (optional) the clean perspective (not required to compute masks,
                  but we keep the signature for future improvements, e.g., hardscape-aware blocking)

Return values are base64 PNGs (single-channel L).

NOTES
-----
- For tall trees: use SOFT mask in Stage 1 (layout + canopy freedom).
- For strict placement or polishing trunk bases: use HARD mask in Stage 2.
"""

from typing import Tuple, Optional
import io
import base64
import numpy as np
from PIL import Image, ImageOps, ImageFilter
import cv2


# -----------------------------
# Base64 <-> PIL helpers
# -----------------------------

def _b64_to_pil(b64: str) -> Image.Image:
    data = base64.b64decode(b64)
    img = Image.open(io.BytesIO(data))
    return img.convert("RGBA")


def _pil_to_b64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _rgba_to_rgb(pil: Image.Image, bg=(255, 255, 255)) -> Image.Image:
    if pil.mode == "RGB":
        return pil
    bg_img = Image.new("RGB", pil.size, bg)
    return Image.alpha_composite(bg_img.convert("RGBA"), pil).convert("RGB")


# -----------------------------
# Core green -> binary mask
# -----------------------------

def _force_size_l(mask_img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """
    Ensure mask is single-channel L and EXACTLY target size.
    Use NEAREST so edges stay crisp. Then re-binarize to {0,255}.
    """
    m = mask_img.convert("L")
    if m.size != (target_w, target_h):
        m = m.resize((target_w, target_h), Image.NEAREST)
    # re-binarize
    m = m.point(lambda v: 255 if v >= 128 else 0).convert("L")
    return m

# def _green_to_binary_mask(
#     overlay_rgb: Image.Image,
#     hsv_low=(35, 40, 40),
#     hsv_high=(85, 255, 255),
#     close_iters: int = 2,
#     open_iters: int = 1,
#     feather_radius: float = 1.5,
# ) -> Image.Image:
#     """
#     Detect GREEN areas in the overlay via HSV threshold, clean edges,
#     and return a single-channel (L) white-on-black binary mask.

#     hsv_low/high cover most greens. Tweak if your paint colour differs.
#     """
#     rgb = np.array(overlay_rgb)  # HxWx3, RGB
#     bgr = rgb[:, :, ::-1]        # OpenCV is BGR
#     hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

#     low = np.array(hsv_low, dtype=np.uint8)
#     high = np.array(hsv_high, dtype=np.uint8)

#     mask = cv2.inRange(hsv, low, high)  # 255 where green

#     # Morphological clean-up
#     kernel = np.ones((5, 5), np.uint8)
#     if close_iters > 0:
#         mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=close_iters)
#     if open_iters > 0:
#         mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=open_iters)

#     # Gentle feather for nicer blending, then binarize hard again
#     mask_pil = Image.fromarray(mask).filter(ImageFilter.GaussianBlur(radius=feather_radius))
#     mask_pil = mask_pil.point(lambda v: 255 if v > 16 else 0).convert("L")
#     return mask_pil

def _auto_color_to_binary_mask(
    overlay_rgb: Image.Image,
    prefer: str = "auto",   # "auto" | "green" | "red" | "any"
    close_iters: int = 2,
    open_iters: int = 1,
    feather_radius: float = 1.5,
) -> Image.Image:
    """
    Build a white-on-black binary mask from a COLORED overlay.
    Supports green or red paint; falls back to 'any strong color' via saturation.
    """
    import cv2
    import numpy as np
    from PIL import ImageFilter

    rgb = np.array(overlay_rgb)       # HxWx3, RGB
    bgr = rgb[:, :, ::-1]             # OpenCV wants BGR
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

    def _mk(mask):
        kernel = np.ones((5, 5), np.uint8)
        if close_iters > 0:
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=close_iters)
        if open_iters > 0:
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=open_iters)
        m = Image.fromarray(mask).filter(ImageFilter.GaussianBlur(radius=feather_radius))
        m = m.point(lambda v: 255 if v > 16 else 0).convert("L")
        return m

    H, S, V = cv2.split(hsv)

    masks = []

    # GREEN range (35–85)
    green_low  = np.array([35, 40, 40], dtype=np.uint8)
    green_high = np.array([85, 255, 255], dtype=np.uint8)
    green_mask = cv2.inRange(hsv, green_low, green_high)
    masks.append(("green", green_mask))

    # RED ranges wrap around hue: [0–10] U [170–180]
    red1 = cv2.inRange(hsv, np.array([0, 60, 40], dtype=np.uint8),   np.array([10, 255, 255], dtype=np.uint8))
    red2 = cv2.inRange(hsv, np.array([170, 60, 40], dtype=np.uint8), np.array([180, 255, 255], dtype=np.uint8))
    red_mask = cv2.bitwise_or(red1, red2)
    masks.append(("red", red_mask))

    # ANY strong color fallback: high saturation & not near gray
    sat_thresh = cv2.threshold(S, 80, 255, cv2.THRESH_BINARY)[1]
    any_mask = sat_thresh
    masks.append(("any", any_mask))

    order = {
        "auto": ["green", "red", "any"],
        "green": ["green", "any"],
        "red": ["red", "any"],
        "any": ["any"],
    }.get(prefer or "auto", ["green", "red", "any"])

    for name in order:
        raw = dict(masks)[name]
        if int(cv2.countNonZero(raw)) > 0:
            return _mk(raw)

    # nothing detected -> return empty L
    return Image.new("L", overlay_rgb.size, 0)


# -----------------------------
# HARD and SOFT mask builders
# -----------------------------

def _make_hard_mask(base_green_mask: Image.Image, trunk_feather_px: int = 2) -> Image.Image:
    """
    HARD mask = strictly the bed/ground zone.
    Small feather to avoid razor edges around the trunk base.
    """
    if trunk_feather_px > 0:
        hard = base_green_mask.filter(ImageFilter.GaussianBlur(radius=trunk_feather_px))
        hard = hard.point(lambda v: 255 if v >= 64 else 0).convert("L")
        return hard
    return base_green_mask.copy()


def _make_soft_canopy_mask(
    hard_mask: Image.Image,
    canopy_grow_px_up: int = 80,
    canopy_grow_px_radial: int = 12,
    down_grow_px_limit: int = 8,
) -> Image.Image:
    """
    SOFT mask = allow crowns/fronds to extend naturally beyond the bed.
    Implementation detail:
    - A tall vertical dilation gives upward freedom (trees can block background/sky).
    - A small radial dilation gives sideways frond leeway.
    - We limit *downward* growth to a small number of pixels so plants don't spill
      into walkways unnaturally at ground level.
    """
    arr = np.array(hard_mask)  # uint8 0/255
    base = (arr > 0).astype(np.uint8) * 255

    # Vertical upward freedom (large kernel height)
    vert_h = max(3, canopy_grow_px_up * 2 + 1)
    vert_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, vert_h))
    vert = cv2.dilate(base, vert_kernel, iterations=1)

    # Small radial freedom for fronds/leaves
    rad_d = max(1, canopy_grow_px_radial)
    rad_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (rad_d * 2 + 1, rad_d * 2 + 1))
    radial = cv2.dilate(base, rad_kernel, iterations=1)

    expanded = cv2.bitwise_or(vert, radial)

    # Limit downward growth a bit:
    if down_grow_px_limit > 0:
        # Erode from below: build a kernel mostly vertical but short
        down_h = down_grow_px_limit * 2 + 1
        down_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, down_h))
        # Compute a milder vertical expansion and subtract extras below
        mild_vert = cv2.dilate(base, down_kernel, iterations=1)
        # Keep original + above; then combine with main expanded
        keep = cv2.bitwise_or(base, mild_vert)
        expanded = cv2.bitwise_and(expanded, keep)

    soft = Image.fromarray(expanded).convert("L")
    return soft


# -----------------------------
# Public API
# -----------------------------

def make_hard_and_soft_masks_from_green(
    green_overlay_b64: str,
    base_image_b64: Optional[str] = None,
    hsv_low=(35, 40, 40),
    hsv_high=(85, 255, 255),
    trunk_feather_px: int = 2,
    canopy_grow_px_up: int = 80,
    canopy_grow_px_radial: int = 12,
    down_grow_px_limit: int = 8,
) -> Tuple[str, str]:
    """
    Convert green overlay to:
      - HARD mask (roots/trunk must be inside)
      - SOFT mask (allows canopy/fronds above the bed)

    Returns (hard_mask_b64, soft_mask_b64) as base64 PNGs.

    Parameters let you tune behaviour:
      hsv_low/high         : green detector range in HSV
      trunk_feather_px     : small blur for trunk base
      canopy_grow_px_up    : how far canopy may grow vertically (in pixels)
      canopy_grow_px_radial: sideways leeway for fronds
      down_grow_px_limit   : limit downward expansion near ground

    NOTE:
    - We do not require base_image_b64 here yet, but we keep it in the signature
      for future hardscape-aware blocking (e.g., avoid crossing railings).
    """
    # 1) Load overlay and find green
    overlay_rgba = _b64_to_pil(green_overlay_b64)
    overlay_rgb = _rgba_to_rgb(overlay_rgba)

    # base_green_mask = _green_to_binary_mask(
    #     overlay_rgb,
    #     hsv_low=hsv_low,
    #     hsv_high=hsv_high,
    #     feather_radius=1.5,
    # )

    base_green_mask = _auto_color_to_binary_mask(
        overlay_rgb,
        prefer="auto",   # will try green -> red -> any
        feather_radius=1.5,
    )

    # 2) Build HARD and SOFT masks
    hard_mask = _make_hard_mask(base_green_mask, trunk_feather_px=trunk_feather_px)
    soft_mask = _make_soft_canopy_mask(
        hard_mask,
        canopy_grow_px_up=canopy_grow_px_up,
        canopy_grow_px_radial=canopy_grow_px_radial,
        down_grow_px_limit=down_grow_px_limit,
    )

        # 3) If we have the base image, FORCE both masks to its exact size
    target_w = target_h = None
    if base_image_b64:
        base_img = _b64_to_pil(base_image_b64).convert("RGB")
        target_w, target_h = base_img.size

    if target_w and target_h:
        hard_mask = _force_size_l(hard_mask, target_w, target_h)
        soft_mask = _force_size_l(soft_mask, target_w, target_h)

    # 3) Return as base64 PNGs
    return _pil_to_b64(hard_mask, "PNG"), _pil_to_b64(soft_mask, "PNG")