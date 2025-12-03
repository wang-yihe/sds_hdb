# backend/multi_stage_pipeline.py
"""
Multi-stage generation pipeline for rooftop garden AI.

Stages
------
1) Stage 1 (layout + style):
   - Uses SOFT canopy mask (from the green overlay) so trees can extend upward/overlap background.
   - Preserves hardscape; places plants inside planting zones (roots in green).
2) Stage 2 (species refinement):
   - Tight, masked refinement around trunks/crowns to enforce strict species anatomy & color.
   - Uses HARD mask by default (or a user-provided local brush mask).
3) Stage 3 (global harmonization):
   - Very light pass to equalize color/contrast, remove halos, keep Option-B visualization look.

A one-click function `generate_all_smart(...)` runs 1→2→3 with prompts from prompt_builders.
"""

import os
import io
import uuid
import base64
import errno
import cv2
import numpy as np
from pathlib import Path
from typing import List, Optional, Tuple

import random
from PIL import ImageFilter
import re
from rembg import remove as rembg_remove

from PIL import Image

from openai_client import gpt_image_edit
from prompt_builders import (
    build_style_and_species_blocks,
    render_user_prompts,
    compose_stage1_prompt,
    compose_stage2_prompt,
    compose_stage3_prompt,
)
from mask_processing import make_hard_and_soft_masks_from_green

plant_refs_b64_global: List[str] = []


# -----------------------
# Paths & helpers
# -----------------------

BACKEND_DIR = Path(__file__).parent
OUT_DIR = BACKEND_DIR / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def _b64_to_pil(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64)))

def _pil_to_b64_png(im: Image.Image) -> str:
    buf = io.BytesIO(); im.save(buf, "PNG"); return base64.b64encode(buf.getvalue()).decode()

def _normalize_mask_L(mask_b64: str, W: int, H: int) -> Image.Image:
    """Return single-channel 'L' mask (WHITE=editable) resized to (W,H); auto-invert if almost empty/full."""
    m = _b64_to_pil(mask_b64).convert("L").resize((W, H), Image.NEAREST)
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
    buf = io.BytesIO(); im.save(buf, "PNG")
    return buf.getvalue()

def _clamp_to_mask_keep_outside(base_b64: str, gen_b64: str, mask_b64: str) -> str:
    """Hard guarantee: base outside mask + gen inside mask."""
    def b64_to_cv(b):
        a = np.frombuffer(base64.b64decode(b), np.uint8)
        return cv2.imdecode(a, cv2.IMREAD_COLOR)
    base = b64_to_cv(base_b64); gen = b64_to_cv(gen_b64)
    Hb, Wb = base.shape[:2]
    if gen.shape[:2] != (Hb, Wb):
        gen = cv2.resize(gen, (Wb, Hb), interpolation=cv2.INTER_CUBIC)
    mL = _normalize_mask_L(mask_b64, Wb, Hb)
    mask = (np.array(mL) == 255)
    out = base.copy(); out[mask] = gen[mask]
    ok, enc = cv2.imencode(".png", out)
    return base64.b64encode(enc.tobytes()).decode()

def _lab_color_transfer(src_b64: str, ref_b64: str) -> str:
    """Re-tone src to match ref (photographic look)."""
    def b64_to_cv(b):
        a = np.frombuffer(base64.b64decode(b), np.uint8)
        return cv2.imdecode(a, cv2.IMREAD_COLOR)
    src = b64_to_cv(src_b64); ref = b64_to_cv(ref_b64)
    H, W = src.shape[:2]
    ref = cv2.resize(ref, (W, H), cv2.INTER_AREA)
    s = cv2.cvtColor(src, cv2.COLOR_BGR2LAB).astype(np.float32)
    r = cv2.cvtColor(ref, cv2.COLOR_BGR2LAB).astype(np.float32)
    s_m, s_s = cv2.meanStdDev(s); r_m, r_s = cv2.meanStdDev(r)
    s_s = np.where(s_s < 1e-6, 1.0, s_s); r_s = np.where(r_s < 1e-6, 1.0, r_s)
    out = (s - s_m.reshape(1,1,3)) * (r_s / s_s) + r_m.reshape(1,1,3)
    out = np.clip(out, 0, 255).astype(np.uint8)
    out = cv2.cvtColor(out, cv2.COLOR_LAB2BGR)
    ok, enc = cv2.imencode(".png", out); return base64.b64encode(enc.tobytes()).decode()




def _alpha_cutout(ref_b64: str) -> Image.Image:
    im = _b64_to_pil(ref_b64).convert("RGB")
    out = rembg_remove(np.array(im))  # RGBA
    return Image.fromarray(out).convert("RGBA")

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
        co = co.resize((nw, nh), Image.LANCZOS)

        bx, by = int(x - nw//2), int(y - nh//2)
        if bx < 0 or by < 0 or bx+nw > W or by+nh > H:
            continue

        region = m[by:by+nh, bx:bx+nw]
        if region.shape[:2] != (nh, nw) or (region == 255).mean() < 0.6:
            continue

        co = co.filter(ImageFilter.GaussianBlur(radius=0.6))
        r, g, b, a = co.split()
        a = a.point(lambda v: min(alpha, v))
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

# -----------------------
# Stage 1
# -----------------------

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
    - Returns (out_path, final_prompt, mask_used_b64).
    """
    # Build user block
    user_block = render_user_prompts(user_prompts or [])

    # Build prompt
    prompt = compose_stage1_prompt(style_block, species_block, user_block)
    # prompt = build_weighted_prompt(
    #     style_block=style_block if WEIGHTS["style"] > 0 else "",
    #     species_block=species_block if WEIGHTS["plants"] > 0 else "",
    #     user_prompts_block=user_block if WEIGHTS["prompt"] > 0 else "",
    # )
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
        mask_b64 = soft_b64  # canopy freedom

    # guided_b64 = base_image_b64
    # if WEIGHTS["plants"] > 0:
    #     # density & alpha scale by weight
    #     density = max(4, int(14 * WEIGHTS["plants"]))        # 0.7 → ~9–10
    #     alpha   = int(200 * WEIGHTS["plants"])               # 0..255
    #     if mask_b64 and plant_refs_b64_global:               # set via generate_all_smart
    #         guided_b64 = build_plant_guide(
    #             base_b64=base_image_b64,
    #             mask_b64=mask_b64,
    #             plant_refs_b64=plant_refs_b64_global,
    #             density=density,
    #             alpha=alpha,
    #             scale_range=(0.75, 1.25),
    #         )


    # Call image edit
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

    out_path = _save_b64_png(out_b64, "stage1")

    return out_path, prompt, (mask_b64 or "")


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
    s1_path, s1_prompt, s1_mask = run_stage1_layout(
        base_image_b64=base_image_b64,
        style_block=style_block,
        species_block=species_block,
        user_prompts=user_prompts,
        green_overlay_b64=green_overlay_b64,
        size=size,
    )
    s1_b64 = _open_as_base64(s1_path)  # read back as base64 for next stage input

    # 3) Stage 2
    s2_path, s2_prompt, s2_mask = run_stage2_refine(
        stage1_result_b64=s1_b64,
        style_block=style_block,
        species_block=species_block,
        user_prompts=user_prompts,
        green_overlay_b64=green_overlay_b64,
        refine_mask_b64=None,  # you can pass a brush mask here instead
        size=size,
    )
    s2_b64 = _open_as_base64(s2_path)

    # # 4) Stage 3
    # s3_path, s3_prompt, s3_mask = run_stage3_blend(
    #     stage2_result_b64=s2_b64,
    #     style_block=style_block,
    #     species_block=species_block,
    #     user_prompts=user_prompts,
    #     size=size,
    #     use_soft_mask=stage3_use_soft_mask,
    #     green_overlay_b64=green_overlay_b64,
    # )

    return {
        "ok": True,
        "style_block": style_block,
        "species_block": species_block,

        "stage1": {
            "resultPath": s1_path,
            "prompt": s1_prompt,
            "maskUsedB64": s1_mask,
        },
        # "stage2": {
        #     "resultPath": s2_path,
        #     "prompt": s2_prompt,
        #     "maskUsedB64": s2_mask,
        # },
        # "stage3": {
        #     "resultPath": s3_path,
        #     "prompt": s3_prompt,
        #     "maskUsedB64": s3_mask,
        # },
        "finalPath": s1_path,
    }