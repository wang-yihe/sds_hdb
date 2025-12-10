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

from typing import List, Tuple, Dict, Optional
from utils.ai_helper import gpt_vision_summarize, b64_to_data_url


# =========================
# Vision: extract style/species
# =========================

_STYLE_SYS_MSG = (
    "You assist a professional landscape architect. You will receive:\n"
    "- One PERSPECTIVE image (defines EXISTING hardscape layout - buildings, planters, tiles, railings)\n"
    "- STYLE REFERENCE images (for MOOD/PALETTE/TEXTURE inspiration only - ignore their layouts/structures)\n"
    "- PLANT REFERENCE images (same species, multiple views)\n\n"
    "CRITICAL: The PERSPECTIVE image's hardscape (buildings, planters, tiles, paths) is FIXED and MUST be preserved exactly.\n"
    "Style references provide ONLY visual mood, color palette, and planting style - DO NOT extract their layouts, paths, or structures.\n\n"
    "Return TWO concise labeled blocks ONLY:\n"
    "[STYLE]\n"
    "• Planting style (formal/naturalistic grouping; dense vs sparse)\n"
    "• Planting density & massing (grouping patterns, repetition)\n"
    "• Colour palette & atmosphere (foliage colors, lighting mood)\n"
    "• Foliage texture & character (glossy/matte, fine/bold, clipped/natural)\n"
    "DO NOT mention paths, boardwalks, circulation, or any hardscape elements from style references.\n\n"
    "[PLANT_SPECIES]\n"
    "• Likely species name (or 'Unknown species (describe)')\n"
    "• Key visible morphology (height, trunk/crownshaft, frond/leaf shape, texture, colour)\n"
    "• Typical role/placement (accent, line, cluster, background)\n"
    "No extra commentary."
)

def _inject_species_hint(species_block: str, hint: Optional[str]) -> str:
    """Insert a mandatory species constraint into the [PLANT_SPECIES] block."""
    if not hint:
        return species_block
    hint = hint.strip()
    if not hint:
        return species_block

    # Ensure we have a header we can inject under
    if "[PLANT_SPECIES]" not in species_block.upper():
        species_block = "[PLANT_SPECIES]\n" + species_block.strip()

    lines = species_block.splitlines()
    # Find the header line (case-insensitive)
    header_idx = next(
        (i for i, ln in enumerate(lines) if ln.strip().upper() == "[PLANT_SPECIES]"),
        0
    )
    insert_idx = header_idx + 1

    hint_block = [
        f"PRIORITY SPECIES CONSTRAINT: '{hint}'.",
        "- Treat as mandatory. If any uploaded plant refs conflict, prefer this species.",
        "- Match true morphology (trunk thickness/rings, crown architecture, leaf/frond shape, color, size).",
        "- Use only vegetation; do not add benches, planters, or other hardscape.",
        "- Use Singapore-suitable species and realistic horticultural density.",
        ""
    ]
    lines[insert_idx:insert_idx] = hint_block
    return "\n".join(lines)

def build_style_and_species_blocks(
    base_image_b64: str,
    style_refs_b64: List[str],
    plant_refs_b64: List[str],
    species_hint: Optional[str] = None,
    vision_model: str = "gpt-5.1",
    max_tokens: int = 650
) -> Tuple[str, str]:
    """
    Calls GPT-4o-mini (vision) to read the provided images and return two labeled blocks:
    [STYLE] and [PLANT_SPECIES].
    """

    content: List[Dict] = []

    # Perspective (PRIMARY - sets hardscape layout)
    content += [
        {"type": "text", "text": "PERSPECTIVE IMAGE (PRIMARY - defines FIXED hardscape: buildings, planters, tiles, railings, paths):"},
        {"type": "image_url", "image_url": {"url": b64_to_data_url(base_image_b64)}},
        {"type": "text", "text": "This layout is LOCKED. All hardscape elements must be preserved exactly."},
    ]

    if species_hint:
        content.append({
            "type": "text",
            "text": f"TARGET SPECIES (strong hint, mandatory if plausible): {species_hint}"
        })

    if style_refs_b64:
        content.append({"type": "text", "text": "STYLE REFERENCES (SECONDARY - for mood/palette/texture ONLY, ignore their layouts/paths/structures):"})
        for b in style_refs_b64:
            content.append({"type": "image_url", "image_url": {"url": b64_to_data_url(b)}})

    if plant_refs_b64:
        content.append({"type": "text", "text": "PLANT REFERENCES (species morphology - same species, multiple angles):"})
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

    species_block = _inject_species_hint(species_block, species_hint)

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

_SHARED_PERSPECTIVE_ANALYSIS = (
    "PERSPECTIVE ANALYSIS (read BEFORE editing):\n"
    "- Analyse the perspective image carefully.\n"
    "- Identify and respect all visible hardscape: tiles, planters, parapet walls, railings, benches, steps.\n"
    "- Understand exact planting bed boundaries inside the mask; do NOT exceed them.\n"
    "- Maintain the existing camera angle, vanishing lines, horizon, and spatial depth.\n"
    "- Detect lighting direction, shadow quality, and atmospheric conditions from the perspective.\n"
    "- Match all new plants to the real site's scale, depth, and lighting.\n"
    "- The perspective image is the PRIMARY reference source. Style references are SECONDARY (mood only).\n"
)

_SHARED_COMMON_KNOWN = (
    "Edit only the transparent (editable) pixels.\n"
    "Do not modify any opaque/kept pixel.\n"
    "Do not add or change hardscape: no planters, curbs, edging, benches, walls, railings, or paving.\n"
    "Only add living plants inside the editable zones. Roots/bases must sit fully within the editable area.\n"
    "Keep the background, horizon, buildings, and sky unchanged.\n"
    "Use realistic lighting and materials that match the base photo. Avoid plastic or cartoony look.\n"
    "Prefer Singapore-suitable plantings. Maintain perspective and scale consistent with the base image.\n"
)

_SHARED_HARDSCAPE_RULES = (
    "HARDSCAPE (pixel-locked outside mask):\n"
    "- Preserve buildings, skyline, parapet walls, railings, benches, paving/tiles, planter edges.\n"
    "- Do NOT alter camera angle, focal length, perspective lines, or background geometry.\n"
    "- Do NOT enlarge planters or expand the site to fit plants.\n"
    "- Add plants ONLY inside the green planting mask.\n"
    "- Do NOT create or modify any hardscape: NO new paths, arches, trellises, pergolas, planters, lights, or walls.\n"
)

_SHARED_FORM_RULES = (
    "FORM CONSTRAINTS (shape-based):\n"
    "  • Do NOT generate spherical foliage masses or ball-like forms at any location.\n"
    "  • Keep trunk base fully visible at soil line; avoid mound-shaped occlusion or bushy bases.\n"
    "  • Respect planter footprint exactly; no foliage spilling onto tiles, benches, or walls.\n"
    "  • Foliage silhouettes must match the natural growth habit of the species.\n"
)

_MASK_RULES_BLOCK = (
"MASK RULES (CRITICAL — DO NOT VIOLATE):\n"
"- Only place vegetation inside the editable mask area.\n"
"- Never modify or add anything outside the mask (treat outside as LOCKED).\n"
"- Do not extend soil, planters, or foliage beyond mask boundaries.\n"
"- Background buildings, sky, railings, walls, and flooring must remain unchanged.\n"
"- Preserve the base image's camera angle, perspective lines, horizon, and lighting.\n"
)

_SHARED_SPECIES_RULES = (
    "SPECIES CONSTRAINTS (from plant reference images):\n"
    "- Use ONLY the species shown in the plant reference images.\n"
    "- Replicate natural morphology accurately (trunk, crown, leaf shape, frond orientation, texture, color).\n"
    "- Maintain proportional height relative to planter scale.\n"
    "- Max 1–2 specimens per planter unless user specifies otherwise.\n"
    "- Trunk/root origin MUST be inside the green planting mask.\n"
    "- Trunk base must remain visible; do NOT hide with foliage.\n"
)

_SHARED_STYLE_CONTEXT_RULES = (
    "STYLE CONTEXT (vibe-only from references):\n"
    "  • Use style references ONLY for mood, palette, and texture cues.\n"
    "  • Do NOT restyle or redesign the site; style must NOT change geometry or add hardscape.\n"
    "  • Preserve original lighting, color temperature, and shadow direction of the perspective image.\n"
    "  • Blend plants with realistic contact shadows and mild ambient occlusion.\n"
)

_SHARED_CLIMATE_RULES = (
    "CLIMATE CHECK — SINGAPORE TROPICAL CONDITIONS:\n"
    "- Use ONLY plant species that can realistically survive in Singapore's hot-humid climate.\n"
    "- If the provided plant references show a species unsuitable for this climate, choose the closest tropical analogue with the SAME morphology.\n"
    "- Maintain realistic size relative to planter scale; avoid exaggerated tree canopies.\n"
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

_SHARED_PROHIBITIONS = (
    "PROHIBITIONS — HARD RESTRICTIONS:\n"
    "  • Do NOT create new hardscape: no new paths, arches, pergolas, trellises, planters, lights, or walls.\n"
    "  • Do NOT restyle, recolor, or redesign existing hardscape elements.\n"
    "  • Do NOT enlarge planters or expand the space to fit foliage.\n"
    "  • Do NOT generate clipped, topiary-like shapes or stylized blob foliage.\n"
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
    (Upgraded with deeper perspective analysis + Singapore climate + shape constraints)
    """
    parts = [
        "STAGE 1 — LAYOUT & CONTEXTUAL INSERTION (PLANT-ONLY)",

        # NEW: Perspective understanding FIRST
        "PERSPECTIVE UNDERSTANDING:",
        _SHARED_PERSPECTIVE_ANALYSIS,
        "",

        _SHARED_COMMON_KNOWN,
        "",

        # HARD GEOMETRY LOCK (keep your existing block)
        _SHARED_HARDSCAPE_RULES,
        "",

        # FORM & SHAPE CONTROL
        "PLANT FORM RULES:",
        _SHARED_FORM_RULES,
        "",

        # CLIMATE RULES
        "CLIMATE RULES:",
        _SHARED_CLIMATE_RULES,
        "",

        # PROHIBITIONS (negative behaviours to avoid)
        "PROHIBITIONS:",
        _SHARED_PROHIBITIONS,
        "",

        # YOUR EXISTING ZONE RULES (still okay)
        _SHARED_PLANTING_ZONE_RULES,
        "",

        _MASK_RULES_BLOCK,
        "",

        # STYLE BLOCK (but demoted to vibe-only)
        _style_heading(),
        "STYLE INSTRUCTION — USE FOR MOOD/PALETTE ONLY (NOT LAYOUT):",
        (style_block or "(no style extracted)"),
        "",

        # SPECIES BLOCK
        _species_heading(),
        (species_block or "(no species extracted)"),
        species_lock_block(species_block),
        "",

        # VISUAL QUALITY (optional to keep)
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
    Single-pass generation — geometry → form → climate → prohibitions → species → style.
    Plant-only edit; no new hardscape.
    """
    parts = [
        "SINGLE PASS — CONTEXTUAL PLANT INSERTION (PLANT-ONLY EDIT)",

        # 1) Hardscape lock
        _SHARED_HARDSCAPE_RULES,
        "",

        # 2) Shape/placement discipline
        "PLANT FORM RULES:",
        _SHARED_FORM_RULES,
        "",

        # 3) Singapore climate suitability
        "CLIMATE RULES:",
        _SHARED_CLIMATE_RULES,
        "",

        # 4) Prohibitions (acts like a negative prompt)
        _SHARED_PROHIBITIONS,
        "",

        # 5) Species notes from vision (dynamic, not hardcoded)
        "SPECIES NOTES (from plant references):",
        (species_block or "(no species extracted)"),
        "",

        # 6) Style limited to 'vibe only'
        "STYLE RULES:",
        _SHARED_STYLE_CONTEXT_RULES,
        (style_block or "(no style extracted)"),
        "",

        # 7) User extras
        "USER REQUESTS:",
        (user_block or "(none)"),
    ]
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
    Single-pass generation — geometry → form → climate → species → style.
    Plant-only edit; no new hardscape.
    """
    parts = [
        "SINGLE PASS — CONTEXTUAL PLANT INSERTION (PLANT-ONLY EDIT)",

        # 1) Hardscape lock
        _SHARED_HARDSCAPE_RULES,
        "",

        # 2) Shape/placement discipline
        "PLANT FORM RULES:",
        _SHARED_FORM_RULES,
        "",

        # 3) Singapore climate suitability
        "CLIMATE RULES:",
        _SHARED_CLIMATE_RULES,
        "",

        # 4) Species block extracted from vision (still dynamic)
        "SPECIES NOTES (from plant references):",
        (species_block or "(no species extracted)"),
        "",

        # 5) Style limited to 'vibe only'
        "STYLE RULES:",
        _SHARED_STYLE_CONTEXT_RULES,
        (style_block or "(no style extracted)"),
        "",

        # 6) User extras
        "USER REQUESTS:",
        (user_block or "(none)"),
    ]
    return "\n".join(parts)


def species_lock_block(species_block: str) -> str:
    return (
        "CLIMATE & SPECIES LOCK (Singapore tropical conditions):\n"
        "- Use ONLY the species/morphology in [PLANT_SPECIES].\n"
    )
