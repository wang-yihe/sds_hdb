# from fastapi import FastAPI

# app = FastAPI()

# @app.get("/api/health")
# def health():
#     return "hello world"


from io import BytesIO
import os, uuid, base64
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from PIL import Image
from openai_client import gpt_image_edit
from compose import decode_b64_image, hard_composite, poisson_blend, encode_b64_png
from typing import Optional

from prompt_builders import (
    build_style_and_species_blocks,
    render_user_prompts,
    compose_final_prompt,
)

load_dotenv()
OUT_DIR = Path(__file__).parent / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="ChatGPT Images Polish API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True
)

class PolishBody(BaseModel):
    image_b64: str
    prompt: Optional[str] = None
    size: Optional[str] = "1024x1024"
    use_mask: bool = False
    mask_b64: Optional[str] = None

@app.post("/api/polish")
def polish(body: PolishBody):
    """
    Sends the whole image to gpt-image-1. (Soft mask if provided.)
    Good for global vibe/cleanup; may alter outside areas.
    """
    if not body.image_b64:
        raise HTTPException(400, "image_b64 required")
    prompt = body.prompt or (
        "Preserve composition. Gentle color grading and realistic lighting. "
        "Improve foliage detail and texture without moving objects."
    )
    out_b64 = gpt_image_edit(
        image_b64=body.image_b64,
        prompt=prompt,
        mask_b64=body.mask_b64 if body.use_mask else None,
        size=body.size or "1024x1024"
    )
    name = f"polish_{uuid.uuid4().hex}.png"
    (OUT_DIR / name).write_bytes(base64.b64decode(out_b64))
    return {"ok": True, "resultPath": f"/api/file/{name}"}

class PolishMaskedBody(BaseModel):
    image_b64: str          # SD/ControlNet result you want to beautify
    mask_b64: str           # binary/feathered L mask (white = replace)
    size: Optional[str] = "1024x1024"
    feather_px: int = 2
    poisson: bool = False   # set True for cv2 seamlessClone
    prompt: Optional[str] = None

@app.post("/api/polish_masked")
def polish_masked(body: PolishMaskedBody):
    """
    Calls gpt-image-1, then re-composites the result with YOUR mask so ONLY the
    selected area changes. Outside pixels remain identical.
    """
    if not body.image_b64 or not body.mask_b64:
        raise HTTPException(400, "image_b64 and mask_b64 required")

    # 1) Ask for gentle, within-mask improvements
    prompt = body.prompt or (
        "Limit visible changes to the masked area. "
        "Preserve geometry and object positions. "
        "Enhance realism, lighting, and plant texture within the mask."
    )
    out_b64 = gpt_image_edit(
        image_b64=body.image_b64,
        prompt=prompt,
        mask_b64=body.mask_b64,             # soft hint for the model
        size=body.size or "1024x1024"
    )

    # 2) Decode images
    original = decode_b64_image(body.image_b64)
    edited   = decode_b64_image(out_b64)
    mask_img = Image.open(BytesIO(base64.b64decode(body.mask_b64))).convert("L").resize(original.size)

    # 3) Hard composite (or Poisson)
    if body.poisson:
        final_img = poisson_blend(original, edited, mask_img)
    else:
        final_img = hard_composite(original, edited, mask_img, feather_px=body.feather_px)

    # 4) Save & return
    name = f"polish_masked_{uuid.uuid4().hex}.png"
    final_img.save(OUT_DIR / name, "PNG")
    return {"ok": True, "resultPath": f"/api/file/{name}"}

class GenerateFromImageBody(BaseModel):
    image_b64: str
    prompt: str
    size: str = "1024x1024"

@app.post("/api/generate_from_image")
def generate_from_image(body: GenerateFromImageBody):
    print("here");
    try:
        if not body.image_b64 or not body.prompt.strip():
            raise HTTPException(status_code=400, detail="image_b64 and prompt are required")
        # Call OpenAI Images edit WITHOUT a mask; lets the model transform the full frame based on prompt
        out_b64 = gpt_image_edit(image_b64=body.image_b64, prompt=body.prompt, mask_b64=None, size=body.size)
        name = f"genimg_{uuid.uuid4().hex}.png"
        (OUT_DIR / name).write_bytes(base64.b64decode(out_b64))
        return {"ok": True, "resultPath": f"/api/file/{name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/file/{name}")
def get_file(name: str):
    p = OUT_DIR / name
    if not p.exists():
        raise HTTPException(404, "Not found")
    return FileResponse(str(p))


class PromptItem(BaseModel):
    text: str
    category: Optional[str] = "global"
    weight: Optional[float] = 1.0

class GenerateAllBody(BaseModel):
    base_image_b64: str              # perspective (use first if you sent many on client)
    style_refs_b64: List[str] = []   # many style images
    plant_refs_b64: List[str] = []   # many plant images (one species)
    user_prompts: List[PromptItem] = []  # many prompt lines with weights/categories
    mask_b64: Optional[str] = None   # optional (e.g., green overlay → binary mask)
    size: str = "1024x1024"

@app.post("/api/generate_all")
def generate_all(body: GenerateAllBody):
    try:
        # 1) Vision step: read style + plant refs → 2 blocks of text
        style_block, species_block = build_style_and_species_blocks(
            base_image_b64=body.base_image_b64,
            style_refs_b64=body.style_refs_b64,
            plant_refs_b64=body.plant_refs_b64
        )

        # 2) Add user multi-prompts
        user_block = render_user_prompts([p.dict() for p in body.user_prompts])

        # 3) Compose final prompt string
        final_prompt = compose_final_prompt(style_block, species_block, user_block)

        # 4) Single image edit call (respect mask if provided)
        out_b64 = gpt_image_edit(
            image_b64=body.base_image_b64,
            prompt=final_prompt,
            mask_b64=body.mask_b64,
            size=body.size
        )

        # 5) Save and return
        name = f"genall_{uuid.uuid4().hex}.png"
        (OUT_DIR / name).write_bytes(base64.b64decode(out_b64))
        return {"ok": True, "resultPath": f"/api/file/{name}", "prompt": final_prompt}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

