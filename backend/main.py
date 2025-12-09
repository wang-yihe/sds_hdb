# backend/main.py
import io,base64
import uuid
import errno
from pathlib import Path
from typing import List, Optional
from PIL import Image

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

from dotenv import load_dotenv
load_dotenv()

# Local modules (from Steps 2–5)
from prompt_builders import (
    build_style_and_species_blocks,
)
from mask_processing import make_hard_and_soft_masks_from_green
from multi_stage_pipeline import (
    generate_all_smart,
    run_stage1_layout,
    run_stage2_refine,
    run_stage3_blend,
)

from openai_client import gpt_image_edit

# -----------------------------------------------------------------------------
# App + paths
# -----------------------------------------------------------------------------
app = FastAPI(title="Rooftop Garden AI", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # in prod: set to your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


BACKEND_DIR = Path(__file__).parent
OUT_DIR = BACKEND_DIR / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)
# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
class PromptItem(BaseModel):
    text: str
    category: Optional[str] = "global"
    weight: Optional[float] = 1.0


class AnalyzeBody(BaseModel):
    base_image_b64: str
    style_refs_b64: List[str] = []
    plant_refs_b64: List[str] = []


class Stage1Body(BaseModel):
    base_image_b64: str
    style_block: str
    species_block: str
    user_prompts: List[PromptItem] = []
    green_overlay_b64: Optional[str] = None
    size: str = "1024x1024"


class Stage2Body(BaseModel):
    stage1_result_b64: str
    style_block: str
    species_block: str
    user_prompts: List[PromptItem] = []
    green_overlay_b64: Optional[str] = None
    refine_mask_b64: Optional[str] = None
    size: str = "1024x1024"


class Stage3Body(BaseModel):
    stage2_result_b64: str
    style_block: str
    species_block: str
    user_prompts: List[PromptItem] = []
    size: str = "1024x1024"
    use_soft_mask: bool = False
    green_overlay_b64: Optional[str] = None


class GenerateAllSmartBody(BaseModel):
    base_image_b64: str
    style_refs_b64: List[str] = []
    plant_refs_b64: List[str] = []
    user_prompts: List[PromptItem] = []
    species_name: Optional[str] = None 
    green_overlay_b64: Optional[str] = None
    size: str = "1024x1024"
    stage3_use_soft_mask: bool = False


class MaskFromGreenBody(BaseModel):
    green_overlay_b64: str
    base_image_b64: Optional[str] = None
    # tune if needed:
    trunk_feather_px: int = 2
    canopy_grow_px_up: int = 80
    canopy_grow_px_radial: int = 12
    down_grow_px_limit: int = 8


class DragPlaceBody(BaseModel):
    """
    Simple helper: create a small round refine mask at drop point.
    The frontend should pass the stage-1 (or stage-2) image as base64.
    """
    base_image_b64: str
    style_block: str
    species_block: str
    user_prompts: List[PromptItem] = []
    drop_x: int
    drop_y: int
    radius_px: int = 80
    size: str = "1024x1024"

class EditLassoReq(BaseModel):
    image_b64: str           # base64 PNG/JPG (no data URL)
    mask_b64: str            # base64 PNG with WHITE=editable
    prompt: str
    size: str = "1024x1024"  # "natural" or "1024x1024"

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
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


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.post("/api/analyze_inputs")
def api_analyze_inputs(body: AnalyzeBody):
    try:
        style_block, species_block = build_style_and_species_blocks(
            base_image_b64=body.base_image_b64,
            style_refs_b64=body.style_refs_b64,
            plant_refs_b64=body.plant_refs_b64,
        )
        return {"ok": True, "style_block": style_block, "species_block": species_block}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stage1")
def api_stage1(body: Stage1Body):
    try:
        out_path, prompt, mask_used_b64 = run_stage1_layout(
            base_image_b64=body.base_image_b64,
            style_block=body.style_block,
            species_block=body.species_block,
            user_prompts=_prompt_list_to_dicts(body.user_prompts),
            green_overlay_b64=body.green_overlay_b64,
            size=body.size,
        )
        # convert file path to URL
        name = Path(out_path).name
        return {"ok": True, "resultPath": f"/api/file/{name}", "prompt": prompt, "maskUsedB64": mask_used_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stage2")
def api_stage2(body: Stage2Body):
    try:
        out_path, prompt, mask_used_b64 = run_stage2_refine(
            stage1_result_b64=body.stage1_result_b64,
            style_block=body.style_block,
            species_block=body.species_block,
            user_prompts=_prompt_list_to_dicts(body.user_prompts),
            green_overlay_b64=body.green_overlay_b64,
            refine_mask_b64=body.refine_mask_b64,
            size=body.size,
        )
        name = Path(out_path).name
        return {"ok": True, "resultPath": f"/api/file/{name}", "prompt": prompt, "maskUsedB64": mask_used_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stage3")
def api_stage3(body: Stage3Body):
    try:
        out_path, prompt, mask_used_b64 = run_stage3_blend(
            stage2_result_b64=body.stage2_result_b64,
            style_block=body.style_block,
            species_block=body.species_block,
            user_prompts=_prompt_list_to_dicts(body.user_prompts),
            size=body.size,
            use_soft_mask=body.use_soft_mask,
            green_overlay_b64=body.green_overlay_b64,
        )
        name = Path(out_path).name
        return {"ok": True, "resultPath": f"/api/file/{name}", "prompt": prompt, "maskUsedB64": mask_used_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate_all_smart")
def api_generate_all_smart(body: GenerateAllSmartBody):
    try:
        print("Start")
        result = generate_all_smart(
            base_image_b64=body.base_image_b64,
            style_refs_b64=body.style_refs_b64,
            plant_refs_b64=body.plant_refs_b64,
            user_prompts=_prompt_list_to_dicts(body.user_prompts),
            species_name=body.species_name,
            green_overlay_b64=body.green_overlay_b64,
            size=body.size,
            stage3_use_soft_mask=body.stage3_use_soft_mask,
        )
        # turn file system paths into URLs
        def _p(path_str: str) -> str:
            return f"/api/file/{Path(path_str).name}"

        result["stage1"]["resultPath"] = _p(result["stage1"]["resultPath"])
        #result["stage2"]["resultPath"] = _p(result["stage2"]["resultPath"])
        # result["stage3"]["resultPath"] = _p(result["stage3"]["resultPath"])
        result["finalPath"] = _p(result["finalPath"])
        return result
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mask_from_green")
def api_mask_from_green(body: MaskFromGreenBody):
    try:
        hard_b64, soft_b64 = make_hard_and_soft_masks_from_green(
            green_overlay_b64=body.green_overlay_b64,
            base_image_b64=body.base_image_b64,
            trunk_feather_px=body.trunk_feather_px,
            canopy_grow_px_up=body.canopy_grow_px_up,
            canopy_grow_px_radial=body.canopy_grow_px_radial,
            down_grow_px_limit=body.down_grow_px_limit,
        )
        # Save masks for debugging/preview
        hard_path = _save_bytes(hard_b64, "mask_hard")
        soft_path = _save_bytes(soft_b64, "mask_soft")
        return {
            "ok": True,
            "hardMaskB64": hard_b64,
            "softMaskB64": soft_b64,
            "hardMaskPath": f"/api/file/{Path(hard_path).name}",
            "softMaskPath": f"/api/file/{Path(soft_path).name}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/drag_place_plant")
def api_drag_place_plant(body: DragPlaceBody):
    """
    Minimal helper: creates a small round HARD refine mask around drop point and
    runs Stage 2 refinement prompt. This improves the inserted area without touching the rest.
    (In a later step you can expand this to also pass a specific plant reference crop.)
    """
    try:

        # decode base to get size
        img_bytes = base64.b64decode(body.base_image_b64)
        base_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        w, h = base_img.size

        # round mask
        mask = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask)
        r = max(8, body.radius_px)
        draw.ellipse((body.drop_x - r, body.drop_y - r, body.drop_x + r, body.drop_y + r), fill=255)

        # encode mask
        buf = io.BytesIO()
        mask.save(buf, format="PNG")
        refine_mask_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        # run Stage 2 using this local brush mask
        out_path, prompt, _mask_used = run_stage2_refine(
            stage1_result_b64=body.base_image_b64,
            style_block=body.style_block,
            species_block=body.species_block,
            user_prompts=_prompt_list_to_dicts(body.user_prompts),
            green_overlay_b64=None,
            refine_mask_b64=refine_mask_b64,
            size=body.size,
        )
        name = Path(out_path).name
        return {"ok": True, "resultPath": f"/api/file/{name}", "prompt": prompt}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/file/{name}")
def api_get_file(name: str):
    p = OUT_DIR / name
    if not p.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(str(p))


class PreviewMaskBody(BaseModel):
    base_image_b64: str
    green_overlay_b64: str  # the raw green-painted overlay

@app.post("/api/preview_mask")
def api_preview_mask(body: PreviewMaskBody):
    try:
        # Build masks
        hard_b64, soft_b64 = make_hard_and_soft_masks_from_green(
            green_overlay_b64=body.green_overlay_b64,
            base_image_b64=body.base_image_b64,
        )
        # Composite a red overlay preview on the base
        def b64_to_pil(b): 
            return Image.open(io.BytesIO(base64.b64decode(b))).convert("RGB")

        base = b64_to_pil(body.base_image_b64)
        soft = Image.open(io.BytesIO(base64.b64decode(soft_b64))).convert("L")
        # visualize: red where editable
        red = Image.new("RGBA", base.size, (255,0,0,120))
        prev = base.convert("RGBA")
        prev = Image.composite(red, prev, soft)  # red where mask=white
        # encode
        buf = io.BytesIO()
        prev.save(buf, "PNG")
        out_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return {"ok": True, "previewB64": out_b64, "hardMaskB64": hard_b64, "softMaskB64": soft_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/api/edit_lasso")
def edit_lasso(req: EditLassoReq):
    """
    Edit ONLY inside the provided mask (WHITE = editable, BLACK = preserve).
    Produces a seamless composite: outside the mask is the original,
    inside the mask is the model's edit, feathered for clean blending.
    """

    try:
        # ---------------------------
        # 0) Decode inputs
        # ---------------------------
        base = Image.open(io.BytesIO(base64.b64decode(req.image_b64))).convert("RGB")
        W, H = base.size

        maskL = Image.open(io.BytesIO(base64.b64decode(req.mask_b64))).convert("L")
        if maskL.size != (W, H):
            # Keep mask in sync with base
            maskL = maskL.resize((W, H), Image.NEAREST)

        # ---------------------------
        # 1) Harden + slightly shrink mask to avoid spill
        # ---------------------------
        # binarize (0/255)
        maskL = maskL.point(lambda v: 255 if v >= 128 else 0)

        # erode 1–2 px to pull back from edges (prevents bleeding/overlay look)
        arr = np.array(maskL, dtype=np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))  # 3x3
        arr = cv2.erode(arr, kernel, iterations=1)
        maskL = Image.fromarray(arr, mode="L")

        # soft feather for natural blend
        maskL = maskL.filter(ImageFilter.GaussianBlur(radius=1.25))

        # ---------------------------
        # 2) Build strict instruction (no plant hard-coding)
        # ---------------------------
        strict = (
            "Edit ONLY inside the transparent region of the mask. "
            "Outside the mask, do not alter even a single pixel. "
            "Render a complete, realistic result that fits within the editable area. "
            "Match the photo's perspective, lighting, shadows, and color temperature. "
            "Blend boundaries cleanly (no halos) and preserve nearby geometry. "
        )

        # Images Edit API expects transparent = editable. Convert our WHITE=editable mask to alpha=0.
        # We'll re-encode the mask for the client below via gpt_image_edit (which already converts).
        size = None if (req.size in (None, "", "natural")) else req.size

        # We pass the *original* hard mask to gpt_image_edit; it converts WHITE→alpha0 internally.
        # Use the un-feathered binary for tighter control during generation.
        mask_for_model = maskL.point(lambda v: 255 if v >= 128 else 0)
        buf_mask = io.BytesIO()
        mask_for_model.save(buf_mask, format="PNG")
        mask_for_model_b64 = base64.b64encode(buf_mask.getvalue()).decode("utf-8")

        # Use the *original* uploaded mask (not feathered) for the model call
        # but still ensure it's the same size and 0/255:
        model_mask = Image.open(io.BytesIO(base64.b64decode(req.mask_b64))).convert("L")
        if model_mask.size != (W, H):
            model_mask = model_mask.resize((W, H), Image.NEAREST)
        model_mask = model_mask.point(lambda v: 255 if v >= 128 else 0)
        buf_model_mask = io.BytesIO()
        model_mask.save(buf_model_mask, format="PNG")
        model_mask_b64 = base64.b64encode(buf_model_mask.getvalue()).decode("utf-8")

        # ---------------------------
        # 3) Call model
        # ---------------------------
        out_b64 = gpt_image_edit(
            image_b64=req.image_b64,
            prompt=strict + (req.prompt or ""),
            mask_b64=model_mask_b64,             # WHITE=editable; function converts to alpha mask
            size=size or "1024x1024",
            model="gpt-image-1",
        )

        edited = Image.open(io.BytesIO(base64.b64decode(out_b64))).convert("RGB")
        if edited.size != (W, H):
            edited = edited.resize((W, H), Image.LANCZOS)

        # ---------------------------
        # 5) Save the final (no overlay artifacts)
        # ---------------------------
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        name = f"lasso_edit_{uuid.uuid4().hex}.png"
        out_path = OUT_DIR / name

        out_path.write_bytes(base64.b64decode(out_b64))

        return {"ok": True, "resultPath": f"/api/file/{name}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))