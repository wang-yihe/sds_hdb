# # from fastapi import FastAPI

# # app = FastAPI()

# # @app.get("/api/health")
# # def health():
# #     return "hello world"


# from io import BytesIO
# import os, uuid, base64
# from pathlib import Path
# from typing import List, Optional
# from fastapi import FastAPI, UploadFile, File, Form, HTTPException
# from fastapi.responses import FileResponse
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from dotenv import load_dotenv
# from PIL import Image
# from openai_client import gpt_image_edit
# from compose import decode_b64_image, hard_composite, poisson_blend, encode_b64_png
# from typing import Optional

# from prompt_builders import (
#     build_style_and_species_blocks,
#     render_user_prompts,
#     compose_final_prompt,
# )

# load_dotenv()
# OUT_DIR = Path(__file__).parent / "outputs"
# OUT_DIR.mkdir(parents=True, exist_ok=True)

# app = FastAPI(title="ChatGPT Images Polish API")
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True
# )

# class PolishBody(BaseModel):
#     image_b64: str
#     prompt: Optional[str] = None
#     size: Optional[str] = "1024x1024"
#     use_mask: bool = False
#     mask_b64: Optional[str] = None

# @app.post("/api/polish")
# def polish(body: PolishBody):
#     """
#     Sends the whole image to gpt-image-1. (Soft mask if provided.)
#     Good for global vibe/cleanup; may alter outside areas.
#     """
#     if not body.image_b64:
#         raise HTTPException(400, "image_b64 required")
#     prompt = body.prompt or (
#         "Preserve composition. Gentle color grading and realistic lighting. "
#         "Improve foliage detail and texture without moving objects."
#     )
#     out_b64 = gpt_image_edit(
#         image_b64=body.image_b64,
#         prompt=prompt,
#         mask_b64=body.mask_b64 if body.use_mask else None,
#         size=body.size or "1024x1024"
#     )
#     name = f"polish_{uuid.uuid4().hex}.png"
#     (OUT_DIR / name).write_bytes(base64.b64decode(out_b64))
#     return {"ok": True, "resultPath": f"/api/file/{name}"}

# class PolishMaskedBody(BaseModel):
#     image_b64: str          # SD/ControlNet result you want to beautify
#     mask_b64: str           # binary/feathered L mask (white = replace)
#     size: Optional[str] = "1024x1024"
#     feather_px: int = 2
#     poisson: bool = False   # set True for cv2 seamlessClone
#     prompt: Optional[str] = None

# @app.post("/api/polish_masked")
# def polish_masked(body: PolishMaskedBody):
#     """
#     Calls gpt-image-1, then re-composites the result with YOUR mask so ONLY the
#     selected area changes. Outside pixels remain identical.
#     """
#     if not body.image_b64 or not body.mask_b64:
#         raise HTTPException(400, "image_b64 and mask_b64 required")

#     # 1) Ask for gentle, within-mask improvements
#     prompt = body.prompt or (
#         "Limit visible changes to the masked area. "
#         "Preserve geometry and object positions. "
#         "Enhance realism, lighting, and plant texture within the mask."
#     )
#     out_b64 = gpt_image_edit(
#         image_b64=body.image_b64,
#         prompt=prompt,
#         mask_b64=body.mask_b64,             # soft hint for the model
#         size=body.size or "1024x1024"
#     )

#     # 2) Decode images
#     original = decode_b64_image(body.image_b64)
#     edited   = decode_b64_image(out_b64)
#     mask_img = Image.open(BytesIO(base64.b64decode(body.mask_b64))).convert("L").resize(original.size)

#     # 3) Hard composite (or Poisson)
#     if body.poisson:
#         final_img = poisson_blend(original, edited, mask_img)
#     else:
#         final_img = hard_composite(original, edited, mask_img, feather_px=body.feather_px)

#     # 4) Save & return
#     name = f"polish_masked_{uuid.uuid4().hex}.png"
#     final_img.save(OUT_DIR / name, "PNG")
#     return {"ok": True, "resultPath": f"/api/file/{name}"}

# class GenerateFromImageBody(BaseModel):
#     image_b64: str
#     prompt: str
#     size: str = "1024x1024"

# @app.post("/api/generate_from_image")
# def generate_from_image(body: GenerateFromImageBody):
#     print("here");
#     try:
#         if not body.image_b64 or not body.prompt.strip():
#             raise HTTPException(status_code=400, detail="image_b64 and prompt are required")
#         # Call OpenAI Images edit WITHOUT a mask; lets the model transform the full frame based on prompt
#         out_b64 = gpt_image_edit(image_b64=body.image_b64, prompt=body.prompt, mask_b64=None, size=body.size)
#         name = f"genimg_{uuid.uuid4().hex}.png"
#         (OUT_DIR / name).write_bytes(base64.b64decode(out_b64))
#         return {"ok": True, "resultPath": f"/api/file/{name}"}
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/file/{name}")
# def get_file(name: str):
#     p = OUT_DIR / name
#     if not p.exists():
#         raise HTTPException(404, "Not found")
#     return FileResponse(str(p))


# class PromptItem(BaseModel):
#     text: str
#     category: Optional[str] = "global"
#     weight: Optional[float] = 1.0

# class GenerateAllBody(BaseModel):
#     base_image_b64: str              # perspective (use first if you sent many on client)
#     style_refs_b64: List[str] = []   # many style images
#     plant_refs_b64: List[str] = []   # many plant images (one species)
#     user_prompts: List[PromptItem] = []  # many prompt lines with weights/categories
#     mask_b64: Optional[str] = None   # optional (e.g., green overlay → binary mask)
#     size: str = "1024x1024"

# @app.post("/api/generate_all")
# def generate_all(body: GenerateAllBody):
#     try:
#         # 1) Vision step: read style + plant refs → 2 blocks of text
#         style_block, species_block = build_style_and_species_blocks(
#             base_image_b64=body.base_image_b64,
#             style_refs_b64=body.style_refs_b64,
#             plant_refs_b64=body.plant_refs_b64
#         )

#         # 2) Add user multi-prompts
#         user_block = render_user_prompts([p.dict() for p in body.user_prompts])

#         # 3) Compose final prompt string
#         final_prompt = compose_final_prompt(style_block, species_block, user_block)

#         # 4) Single image edit call (respect mask if provided)
#         out_b64 = gpt_image_edit(
#             image_b64=body.base_image_b64,
#             prompt=final_prompt,
#             mask_b64=body.mask_b64,
#             size=body.size
#         )

#         # 5) Save and return
#         name = f"genall_{uuid.uuid4().hex}.png"
#         (OUT_DIR / name).write_bytes(base64.b64decode(out_b64))
#         return {"ok": True, "resultPath": f"/api/file/{name}", "prompt": final_prompt}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# backend/main.py
import base64
import uuid
import os, errno
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from dotenv import load_dotenv
load_dotenv()

# Local modules (from Steps 2–5)
from prompt_builders import (
    build_style_and_species_blocks,
    render_user_prompts,
    compose_stage1_prompt,
    compose_stage2_prompt,
    compose_stage3_prompt,
)
from mask_processing import make_hard_and_soft_masks_from_green
from multi_stage_pipeline import (
    generate_all_smart,
    run_stage1_layout,
    run_stage2_refine,
    run_stage3_blend,
)

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
        result = generate_all_smart(
            base_image_b64=body.base_image_b64,
            style_refs_b64=body.style_refs_b64,
            plant_refs_b64=body.plant_refs_b64,
            user_prompts=_prompt_list_to_dicts(body.user_prompts),
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
        # build a circular brush mask
        import numpy as np
        from PIL import Image, ImageDraw

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
        import io, base64
        from PIL import Image, ImageOps, ImageEnhance

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