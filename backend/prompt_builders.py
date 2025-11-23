# backend/prompt_builders.py
from typing import List, Tuple, Optional
from openai_client import gpt_vision_summarize, b64_to_data_url

STYLE_SYS = (
    "You assist a landscape designer. You will receive:\n"
    "- One PERSPECTIVE (base canvas to preserve)\n"
    "- Three STYLE REFS (same garden style)\n"
    "- Many PLANT REFS (one species)\n"
    "Extract two compact labeled blocks:\n"
    "[STYLE]\n"
    "• Layout logic (formal vs naturalistic; symmetry/asymmetry)\n"
    "• Planting density & massing patterns\n"
    "• Colour palette & atmosphere\n"
    "• Any recurring shapes (beds/edges/hedges)\n"
    "\n"
    "[PLANT_SPECIES]\n"
    "• Species name if identifiable, else 'Unknown species (describe)'\n"
    "• Key visible traits (height, trunk/crownshaft, frond/leaf form, texture, colour)\n"
    "• Typical placement (accent, line, cluster)\n"
    "Return ONLY these two labeled blocks."
)

def build_style_and_species_blocks(
    base_image_b64: str,
    style_refs_b64: List[str],
    plant_refs_b64: List[str],
    vision_model: str = "gpt-4o-mini",
) -> Tuple[str, str]:
    """Returns (style_block, species_block) strings."""
    content = []

    # Perspective (for context; we won't parse it, but it helps style judgement)
    content += [
        {"type":"text", "text":"PERSPECTIVE (for context)"},
        {"type":"image_url", "image_url":{"url": b64_to_data_url(base_image_b64)}},
    ]

    # Style refs (3 images recommended)
    if style_refs_b64:
        content.append({"type":"text", "text":"STYLE REFS (same style theme):"})
        for b in style_refs_b64:
            content.append({"type":"image_url", "image_url":{"url": b64_to_data_url(b)}})

    # Plant refs (N images of one species)
    if plant_refs_b64:
        content.append({"type":"text", "text":"PLANT REFS (one species):"})
        for b in plant_refs_b64:
            content.append({"type":"image_url", "image_url":{"url": b64_to_data_url(b)}})

    messages = [
        {"role":"system", "content": STYLE_SYS},
        {"role":"user", "content": content}
    ]

    raw = gpt_vision_summarize(messages, model=vision_model, max_tokens=600)
    # raw should contain [STYLE]... and [PLANT_SPECIES]...
    # We keep it simple: return the whole blocks as-is.
    style_block = ""
    species_block = ""
    # naive split (robust enough for now)
    lower = raw.lower()
    idx_s = lower.find("[style]")
    idx_p = lower.find("[plant_species]")
    if idx_s != -1 and idx_p != -1 and idx_s < idx_p:
        style_block = raw[idx_s:idx_p].strip()
        species_block = raw[idx_p:].strip()
    else:
        # fallback: if model returns in different order, just return raw in style, empty species
        style_block = raw.strip()
        species_block = ""

    return style_block, species_block

def render_user_prompts(items: List[dict]) -> str:
    """items: [{text, category, weight}] → formatted block"""
    if not items:
        return ""
    lines = ["USER CONTEXT (ordered; weights indicate importance):"]
    for i, it in enumerate(items, start=1):
        cat = (it.get("category") or "global")
        w = it.get("weight") or 1.0
        txt = it.get("text") or ""
        lines.append(f"{i}. ({cat}, w={w}) {txt}")
    return "\n".join(lines)

def compose_final_prompt(style_block: str, species_block: str, user_block: str) -> str:
    parts = [
        "You are editing a rooftop garden perspective image.",
        "",
        "HARDSCAPE (must preserve exactly):",
        "- Buildings, parapet walls, railings, benches, paths, existing planters and shrubs.",
        "- Do not alter geometry, camera angle, or skyline.",
        "",
        "PLANTING ZONES:",
        "- If a mask is provided, place new plants ONLY inside the white mask area; keep all other regions unchanged pixel-for-pixel.",
        "",
        "STYLE (replicate from references):",
        style_block or "(no style block detected)",
        "",
        "SPECIES (must be clearly included and recognisable):",
        species_block or "(no species block detected)",
        "",
        "INTEGRATION:",
        "- Match global lighting, colour grading, and shadows.",
        "- Add correct contact shadows and occlusion; avoid cut-out edges.",
    ]
    if user_block.strip():
        parts += ["", user_block]
    return "\n".join(parts)