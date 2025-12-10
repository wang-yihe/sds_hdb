#core logic for ai
import base64
import uuid
import errno
from PIL import Image
import cv2
from pathlib import Path
import numpy as np
from PIL import ImageFilter
from typing import Tuple, Optional, List

from core.prompts import compose_stage1_prompt,compose_stage2_prompt,compose_stage3_prompt, render_user_prompts, build_style_and_species_blocks
from schemas.ai_schema import PromptItem
from utils.ai_helper import _open_as_base64, _b64_to_pil, gpt_image_edit, _rgba_to_rgb, _pil_to_b64

OUT_DIR = Path("./storage/generated_images")

def _save_bytes(b64: str, prefix: str) -> str:
    """
    Save base64 bytes with a short filename into OUT_DIR.
    Falls back to /tmp on path issues.
    """
    name = f"{prefix}_{uuid.uuid4().hex}.png"
    p = OUT_DIR / name
    raw = base64.b64decode(b64)
    try:
        p.write_bytes(raw)
        return str(p)
    except OSError as e:
        if e.errno in (errno.ENAMETOOLONG, errno.ENOENT, errno.EINVAL):
            tmp_dir = Path("/tmp/sds_out_fallback")
            tmp_dir.mkdir(parents=True, exist_ok=True)
            p2 = tmp_dir / name
            p2.write_bytes(raw)
            return str(p2)
        raise

def _prompt_list_to_dicts(arr: List[PromptItem]) -> List[dict]:
    return [p.dict() for p in (arr or [])]
    
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
    
def _force_size_l(mask_img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """
    Ensure mask is single-channel L and EXACTLY target size.
    Use NEAREST so edges stay crisp. Then re-binarize to {0,255}.
    """
    m = mask_img.convert("L")
    if m.size != (target_w, target_h):
        m = m.resize((target_w, target_h), Image.Resampling.NEAREST)
    # re-binarize
    m = m.point(lambda v: 255 if v >= 128 else 0).convert("L") # type: ignore
    return m

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
        m = m.point(lambda v: 255 if v > 16 else 0).convert("L") # type: ignore
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

def _make_hard_mask(base_green_mask: Image.Image, trunk_feather_px: int = 2) -> Image.Image:
    """
    HARD mask = strictly the bed/ground zone.
    Small feather to avoid razor edges around the trunk base.
    """
    if trunk_feather_px > 0:
        hard = base_green_mask.filter(ImageFilter.GaussianBlur(radius=trunk_feather_px))
        hard = hard.point(lambda v: 255 if v >= 64 else 0).convert("L") # type: ignore
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

def run_stage1_layout(
    base_image_b64: str,
    style_block: str,
    species_block: str,
    user_prompts: Optional[List[dict]] = None,
    green_overlay_b64: Optional[str] = None,
    size: str = "1024x1024",
) -> Tuple[str, str, str]:
    """
    Stage 1: layout + style + canopy freedom.
    - Builds prompt (Option B) for Stage 1.
    - If green overlay is provided, derive SOFT mask (for canopy freedom).
    - Returns (out_b64, final_prompt, mask_used_b64).
    """
    # Build user block
    user_block = render_user_prompts(user_prompts or [])

    # Build prompt
    prompt = compose_stage1_prompt(style_block, species_block, user_block)
    # Mask logic
    mask_b64 = None
    if green_overlay_b64:
        _, soft_b64 = make_hard_and_soft_masks_from_green(
            green_overlay_b64=green_overlay_b64,
            base_image_b64=base_image_b64,
            canopy_grow_px_up=20,        # tighter vertical allowance
            canopy_grow_px_radial=4,     # tighter sideways allowance
            down_grow_px_limit=6,
        )
        mask_b64 = soft_b64

    out_b64 = gpt_image_edit(
        image_b64=base_image_b64,
        prompt=prompt,
        mask_b64=mask_b64,
        size=size,
    )

    # if mask_b64:
    #     out_b64 = _clamp_to_mask_keep_outside(base_image_b64, out_b64, mask_b64)

    # # Photographic tone match back to base
    # try:
    #     out_b64 = _lab_color_transfer(out_b64, base_image_b64)
    # except Exception:
    #     pass

    # Return base64 directly instead of saving to disk
    return out_b64, prompt, (mask_b64 or "")


# -----------------------
# Stage 2
# -----------------------

def run_stage2_refine(
    stage1_result_b64: str,
    style_block: str,
    species_block: str,
    user_prompts: Optional[List[dict]] = None,
    green_overlay_b64: Optional[str] = None,
    refine_mask_b64: Optional[str] = None,
    size: str = "1024x1024",
) -> Tuple[str, str, str]:
    """
    Stage 2: strict species accuracy refinement near bases/crowns.
    - Uses HARD mask from green overlay by default (roots in green).
    - If refine_mask_b64 is provided (e.g., brush/box around new plants), that overrides default.
    - Returns (out_path, final_prompt, mask_used_b64).
    """
    user_block = render_user_prompts(user_prompts or [])
    prompt = compose_stage2_prompt(style_block, species_block, user_block)

    mask_b64 = refine_mask_b64
    if not mask_b64 and green_overlay_b64:
        hard_b64, _ = make_hard_and_soft_masks_from_green(
            green_overlay_b64=green_overlay_b64,
            base_image_b64=stage1_result_b64,  # same size
        )
        mask_b64 = hard_b64

    out_b64 = gpt_image_edit(
        image_b64=stage1_result_b64,
        prompt=prompt,
        mask_b64=mask_b64,
        size=size,
    )
    out_path = _save_b64_png(out_b64, "stage2")

    return out_path, prompt, (mask_b64 or "")


# -----------------------
# Stage 3
# -----------------------

def run_stage3_blend(
    stage2_result_b64: str,
    style_block: str,
    species_block: str,
    user_prompts: Optional[List[dict]] = None,
    size: str = "1024x1024",
    use_soft_mask: bool = False,
    green_overlay_b64: Optional[str] = None,
) -> Tuple[str, str, str]:
    """
    Stage 3: global harmonization (light).
    - Usually no mask; optionally allow a very soft mask (rare).
    - Returns (out_path, final_prompt, mask_used_b64_or_empty).
    """
    user_block = render_user_prompts(user_prompts or [])
    prompt = compose_stage3_prompt(style_block, species_block, user_block)

    mask_b64 = None
    if use_soft_mask and green_overlay_b64:
        # Very wide soft mask if you want to limit minor tweaks mostly to planted areas.
        _, soft_b64 = make_hard_and_soft_masks_from_green(
            green_overlay_b64=green_overlay_b64,
            base_image_b64=stage2_result_b64,
            canopy_grow_px_up=120,         # wider for gentle global touch
            canopy_grow_px_radial=24,
            down_grow_px_limit=12,
        )
        mask_b64 = soft_b64

    out_b64 = gpt_image_edit(
        image_b64=stage2_result_b64,
        prompt=prompt,
        mask_b64=mask_b64,
        size=size,
    )
    out_path = _save_b64_png(out_b64, "stage3")

    return out_path, prompt, (mask_b64 or "")


# -----------------------
# One-click pipeline
# -----------------------

def generate_all_smart(
    base_image_b64: str,
    style_refs_b64: List[str],
    plant_refs_b64: List[str],
    user_prompts: Optional[List[dict]] = None,
    green_overlay_b64: Optional[str] = None,
    size: str = "1024x1024",
    stage3_use_soft_mask: bool = False,
) -> dict:
    """
    One-click pipeline runner:
      1) Analyze → STYLE + SPECIES blocks
      2) Stage 1 (soft mask)
      3) Stage 2 (hard mask)
      4) Stage 3 (optional soft global harmonization)
    Returns JSON with paths, prompts, and masks used.
    """

    # 0) Normalize inputs (support passing file paths too)
    base_image_b64 = _open_as_base64(base_image_b64)
    style_refs_b64 = [ _open_as_base64(b) for b in (style_refs_b64 or []) ]
    plant_refs_b64 = [ _open_as_base64(b) for b in (plant_refs_b64 or []) ]
    green_overlay_b64 = _open_as_base64(green_overlay_b64) if green_overlay_b64 else None

    global plant_refs_b64_global
    plant_refs_b64_global = plant_refs_b64[:]

    # 1) Analyze inputs
    style_block, species_block = build_style_and_species_blocks(
        base_image_b64=base_image_b64,
        style_refs_b64=style_refs_b64,
        plant_refs_b64=plant_refs_b64,
    )

    # 2) Stage 1
    s1_b64, s1_prompt, s1_mask = run_stage1_layout(
        base_image_b64=base_image_b64,
        style_block=style_block,
        species_block=species_block,
        user_prompts=user_prompts,
        green_overlay_b64=green_overlay_b64,
        size=size,
    )

    return {
        "ok": True,
        "style_block": style_block,
        "species_block": species_block,

        "stage1": {
            "result_b64": s1_b64,  # Return base64 instead of file path
            "prompt": s1_prompt,
            "maskUsedB64": s1_mask,
        },
        "final_b64": s1_b64,  # Return base64 instead of file path
    }