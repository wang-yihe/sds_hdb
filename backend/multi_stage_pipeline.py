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


# -----------------------
# Paths & helpers
# -----------------------

BACKEND_DIR = Path(__file__).parent
OUT_DIR = BACKEND_DIR / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)


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



# def _composite_with_mask(base_b64: str, gen_b64: str, mask_b64: str) -> str:
#     """
#     Clamp edits to mask: white=editable, black=keep-original.
#     Returns base64 PNG of (base outside) + (gen inside).
#     """
#     def _b64_to_rgba(b):
#         im = Image.open(io.BytesIO(base64.b64decode(b))).convert("RGBA")
#         return im

#     base = _b64_to_rgba(base_b64)
#     gen  = _b64_to_rgba(gen_b64)

#     m = Image.open(io.BytesIO(base64.b64decode(mask_b64))).convert("L")
#     if m.size != base.size:
#         m = m.resize(base.size, Image.NEAREST)

#     # White (255) = editable → use generated pixels there
#     # Black (0)   = keep base → invert to build alpha for generated layer
#     alpha = m.copy().point(lambda v: 255 if v >= 128 else 0)  # 255 inside, 0 outside
#     gen_with_alpha = gen.copy()
#     gen_with_alpha.putalpha(alpha)

#     out = base.copy().convert("RGBA")
#     out = Image.alpha_composite(out, gen_with_alpha)

#     buf = io.BytesIO()
#     out.save(buf, "PNG")
#     return base64.b64encode(buf.getvalue()).decode("utf-8")


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

    # Call image edit
    out_b64 = gpt_image_edit(
        image_b64=base_image_b64,
        prompt=prompt,
        mask_b64=mask_b64,
        size=size,
    )

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