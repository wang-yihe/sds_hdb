"""
Prompt builders for the multi-stage garden image pipeline.

This module:
- Reads perspective + style refs + plant refs with GPT-4o-mini to produce:
  [STYLE] and [PLANT_SPECIES] blocks.
- Composes final prompts for each stage (Option B: Clean Landscape-Architect Visualization):
  Stage 1: Layout + placement inside green zones (with canopy freedom)
  Stage 2: Species-accurate refinement (masked, typically near trunks/bases)
  Stage 3: Global blend / color harmony (very light touch)
"""

from typing import List, Tuple, Dict
from utils.ai_helper import gpt_vision_summarize, b64_to_data_url


# =========================
# Vision: extract style/species
# =========================

_STYLE_SYS_MSG = (
    "You assist a professional landscape architect. You will receive:\n"
    "- One PERSPECTIVE image (base canvas to preserve)\n"
    "- STYLE REFERENCE images (same style theme)\n"
    "- PLANT REFERENCE images (same species, multiple views)\n\n"
    "Return TWO concise labeled blocks ONLY:\n"
    "[STYLE]\n"
    "• Layout logic (formal vs naturalistic; symmetry/asymmetry)\n"
    "• Planting density & massing (grouping, repetition)\n"
    "• Colour palette & overall atmosphere\n"
    "• Recurring shapes/edges (linear, curved, clipped hedges)\n\n"
    "[PLANT_SPECIES]\n"
    "• Likely species name (or 'Unknown species (describe)')\n"
    "• Key visible morphology (height, trunk/crownshaft, frond/leaf shape, texture, colour)\n"
    "• Typical role/placement (accent, line, cluster, background)\n"
    "No extra commentary."
)

def build_style_and_species_blocks(
    base_image_b64: str,
    style_refs_b64: List[str],
    plant_refs_b64: List[str],
    vision_model: str = "gpt-5.1",
    max_tokens: int = 650
) -> Tuple[str, str]:
    """
    Calls GPT-4o-mini (vision) to read the provided images and return two labeled blocks:
    [STYLE] and [PLANT_SPECIES].
    """

    content: List[Dict] = []

    # Perspective (context; not analyzed line-by-line, but helps judge lighting/feel)
    content += [
        {"type": "text", "text": "PERSPECTIVE (context for scale/lighting):"},
        {"type": "image_url", "image_url": {"url": b64_to_data_url(base_image_b64)}},
    ]

    if style_refs_b64:
        content.append({"type": "text", "text": "STYLE REFERENCES (same style theme):"})
        for b in style_refs_b64:
            content.append({"type": "image_url", "image_url": {"url": b64_to_data_url(b)}})

    if plant_refs_b64:
        content.append({"type": "text", "text": "PLANT REFERENCES (same species, multiple angles):"})
        for b in plant_refs_b64:
            content.append({"type": "image_url", "image_url": {"url": b64_to_data_url(b)}})

    messages = [
        {"role": "system", "content": _STYLE_SYS_MSG},
        {"role": "user", "content": content},
    ]

    raw = gpt_vision_summarize(messages, model=vision_model, max_tokens=max_tokens)
    # Expect raw to contain [STYLE] ... [PLANT_SPECIES] ...
    low = raw.lower()
    i_style = low.find("[style]")
    i_species = low.find("[plant_species]")

    style_block = ""
    species_block = ""

    if i_style != -1 and i_species != -1:
        if i_style < i_species:
            style_block = raw[i_style:i_species].strip()
            species_block = raw[i_species:].strip()
        else:
            species_block = raw[i_species:i_style].strip()
            style_block = raw[i_style:].strip()
    else:
        # Fallback: if formatting differs, return whole as style, empty species.
        style_block = raw.strip()
        species_block = ""

    return style_block, species_block


# =========================
# User prompts stitching
# =========================

def render_user_prompts(items: List[dict]) -> str:
    if not items:
        items = []

    lines = []
    
    # Global mandatory rules (ALWAYS ADDED)
    lines.append("CRITICAL GLOBAL RULES:")
    lines.append("- Only add plants inside the provided mask.")
    lines.append("- Do NOT modify sky, buildings, tiles, benches, railings, or walls.")
    lines.append("- Preserve original lighting, shadows, perspective, and color temperature.")
    lines.append("- Photorealistic, natural textures.")
    lines.append("")

    # User instructions
    if items:
        lines.append("User additional instructions:")
        for it in items:
            txt = (it.get("text") or "").strip()
            if txt:
                lines.append(f"- {txt}")

    return "\n".join(lines)


# =========================
# Option B: Clean LA Visualization — Shared rules
# =========================

_SHARED_HARDSCAPE_RULES = (
    "HARDSCAPE (pixel-locked outside mask):\n"
    "- Preserve buildings, skyline, parapet walls, railings, benches, paving/tiles, planter edges.\n"
    "- Do NOT alter camera angle, perspective lines, or background geometry.\n"
    "- Do NOT add plants outside of green areas\n"
    "- Only add plants to green areas\n"
    "- Do NOT add other thing such as benches\n"
)

_SHARED_PLANTING_ZONE_RULES = (
    "PLANTING ZONES:\n"
    "- Trunk/root placement MUST be within the green planting mask (hard mask).\n"
    "- Upper parts (trunk/canopy/fronds) MAY extend outside the ground bed using the soft canopy mask, "
    "to allow natural overlap with sky/railings/background."
)

_SHARED_INTEGRATION_RULES = (
    "INTEGRATION / VISUAL QUALITY:\n"
    "- Match scene lighting, white balance, contrast, and shadow softness.\n"
    "- Add correct contact shadows and mild ambient occlusion at bases.\n"
    "- Avoid cut-out edges; keep frond/leaf edges crisp and realistic.\n"
    "- Keep clarity of circulation and seating; do NOT plant on paths, benches, or walls."
)

def _style_heading() -> str:
    return "STYLE (replicate from style references, Option B — Clean Landscape-Architect Visualization):"

def _species_heading() -> str:
    return "SPECIES (must be clearly recognizable from plant references):"


# =========================
# Stage-specific prompt composers
# =========================

def compose_stage1_prompt(
    style_block: str,
    species_block: str,
    user_block: str
) -> str:
    """
    Stage 1: Layout + placement + canopy freedom.
    Use SOFT canopy mask when calling the image edit.
    """
    parts = [
        "STAGE 1 — LAYOUT + STYLE APPLICATION (with canopy freedom)",
        _SHARED_HARDSCAPE_RULES,
        _SHARED_PLANTING_ZONE_RULES,
        "",
        _style_heading(),
        style_block or "(no style extracted)",
        "",
        _species_heading(),
        species_block or "(no species extracted)",
        species_lock_block(species_block),
        "",
        _SHARED_INTEGRATION_RULES,
    ]
    if user_block.strip():
        parts += ["", user_block]
    return "\n".join(parts)


def compose_stage2_prompt(
    style_block: str,
    species_block: str,
    user_block: str
) -> str:
    """
    Stage 2: Species-accurate refinement (masked around trunks/new plants).
    Use HARD mask (or a local brush mask) for strict refinement.
    """
    parts = [
        "STAGE 2 — SPECIES ACCURACY REFINEMENT (masked near bases/crowns)",
        _SHARED_HARDSCAPE_RULES,
        "- Maintain strict separation between newly inserted plants and existing clipped hedges/topiary; no silhouette merging.\n",
        "",
        _species_heading(),
        (species_block or "(no species extracted)") + "\n"
        "- Enforce correct anatomy (crownshaft/trunk/fronds/leaf texture/colour) to match references precisely.\n"
        "- Correct any distortions in shape, color, or scale from Stage 1.",
        species_lock_block(species_block),
        "",
        _style_heading(),
        (style_block or "(no style extracted)") + "\n"
        "- Keep the clean visualization style: readable structure, realistic but slightly idealized.",
        "",
        _SHARED_INTEGRATION_RULES,
        "- Do NOT change overall layout; only refine the selected plant regions.",
    ]
    if user_block.strip():
        parts += ["", user_block]
    return "\n".join(parts)


def compose_stage3_prompt(
    style_block: str,
    species_block: str,
    user_block: str
) -> str:
    """
    Stage 3: Very light global harmonization (usually no mask or a very soft large mask).
    """
    parts = [
        "STAGE 3 — GLOBAL HARMONIZATION (light blend, no layout changes)",
        _SHARED_HARDSCAPE_RULES,
        "- Do NOT move plants; keep Stage 1 placement and Stage 2 anatomy intact.\n",
        "",
        _style_heading(),
        (style_block or "(no style extracted)") + "\n"
        "- Subtle color grading so the output matches a clean architectural visualization.",
        "",
        _species_heading(),
        species_block or "(no species extracted)",
        species_lock_block(species_block),
        "",
        _SHARED_INTEGRATION_RULES,
        "- Remove minor artifacts/halos; keep details crisp.",
    ]
    if user_block.strip():
        parts += ["", user_block]
    return "\n".join(parts)


# =========================
# Convenience: one-shot final prompt (if you skip stages)
# =========================

def compose_single_pass_prompt(
    style_block: str,
    species_block: str,
    user_block: str
) -> str:
    """
    Single-pass generation (if you want to do everything in one edit call).
    Not recommended for maximum fidelity, but available.
    """
    parts = [
        "SINGLE PASS — CLEAN LANDSCAPE-ARCHITECT VISUALIZATION",
        _SHARED_HARDSCAPE_RULES,
        _SHARED_PLANTING_ZONE_RULES,
        "",
        _style_heading(),
        style_block or "(no style extracted)",
        "",
        _species_heading(),
        species_block or "(no species extracted)",
        "",
        _SHARED_INTEGRATION_RULES,
        "- Maintain separation from clipped hedges/topiary; avoid silhouette merging.",
    ]
    if user_block.strip():
        parts += ["", user_block]
    return "\n".join(parts)


def species_lock_block(species_block: str) -> str:
    return (
        "CLIMATE & SPECIES LOCK (Singapore tropical conditions):\n"
        "- Use ONLY the species/morphology in [PLANT_SPECIES].\n"
    )