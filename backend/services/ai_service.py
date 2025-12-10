from core.prompts import build_style_and_species_blocks
from schemas.ai_schema import AnalyzeBody, DragPlaceBody, GenerateAllSmartBody, MaskFromGreenBody, PreviewMaskBody, Stage1Body, Stage2Body, Stage3Body
from core.ai import OUT_DIR, generate_all_smart, make_hard_and_soft_masks_from_green, run_stage1_layout, _prompt_list_to_dicts, run_stage2_refine, run_stage3_blend
from pathlib import Path
import base64
from PIL import Image, ImageDraw
import io
from fastapi.responses import FileResponse

class AIService:
    @staticmethod
    async def analyze_inputs(body: AnalyzeBody):
        try:
            style_block, species_block = build_style_and_species_blocks(
                base_image_b64=body.base_image_b64,
                style_refs_b64=body.style_refs_b64,
                plant_refs_b64=body.plant_refs_b64,
            )
            return {"style_block": style_block, "species_block": species_block}
        except Exception as e:
            raise e
        
    @staticmethod
    async def stage1(body: Stage1Body):
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
            raise e
        
    @staticmethod
    async def stage2(body: Stage2Body):
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
            raise e
        
    @staticmethod
    async def stage3(body: Stage3Body):
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
            raise e
    
    #main endpoint being called for frontend
    @staticmethod
    async def generate_all_smart(body: GenerateAllSmartBody):
        try:
            # Use the first style image or first perspective image as base
            base_image = body.perspectiveImages[0]
            print("base image base64", base_image)
            if not base_image:
                raise ValueError("No base image provided")
            
            # Call the pipeline
            result = generate_all_smart(
                base_image_b64=base_image,
                style_refs_b64=body.styleImages,
                plant_refs_b64=body.plant_refs_b64 if body.plant_refs_b64 else [],
                user_prompts=_prompt_list_to_dicts(body.user_prompts) if body.user_prompts else None,
                green_overlay_b64=body.green_overlay_b64,
                size=body.size,
                stage3_use_soft_mask=body.stage3_use_soft_mask,
            )

            # Get the base64 image directly from result (no file I/O needed)
            image_b64 = result["final_b64"]

            # Create data URL for frontend
            image_data_url = f"data:image/png;base64,{image_b64}"

            return {
                "success": True,
                "image": image_data_url,  # Base64 for immediate display
                "stage1": {
                    "result_b64": result["stage1"]["result_b64"],
                    "prompt": result["stage1"]["prompt"],
                },
                "style_block": result["style_block"],
                "species_block": result["species_block"],
            }
            
        except Exception as e:
            raise Exception(f"Error generating all smart: {str(e)}")
        
    @staticmethod
    async def drag_place_plant(body: DragPlaceBody):
        """
        Minimal helper: creates a small round HARD refine mask around drop point and
        runs Stage 2 refinement prompt. This improves the inserted area without touching the rest.
        (In a later step you can expand this to also pass a specific plant reference crop.)
        """
        try:
            # build a circular brush mask


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
            raise e
    
    @staticmethod
    async def get_file(name: str):
        p = OUT_DIR / name
        if not p.exists():
            raise FileNotFoundError("File not found")
        return FileResponse(str(p))
    
    @staticmethod
    async def preview_mask(body: PreviewMaskBody):
        try:
            hard_b64, soft_b64 = make_hard_and_soft_masks_from_green(
                green_overlay_b64=body.green_overlay_b64,
                base_image_b64=body.base_image_b64,
            )

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
            raise e

    @staticmethod
    async def mask_from_green(body: MaskFromGreenBody):
        try:
            hard_b64, soft_b64 = make_hard_and_soft_masks_from_green(
                green_overlay_b64=body.green_overlay_b64,
                base_image_b64=body.base_image_b64,
                trunk_feather_px=body.trunk_feather_px,
                canopy_grow_px_up=body.canopy_grow_px_up,
                canopy_grow_px_radial=body.canopy_grow_px_radial,
                down_grow_px_limit=body.down_grow_px_limit,
            )
            return {"ok": True, "hardMaskB64": hard_b64, "softMaskB64": soft_b64}
        except Exception as e:
            raise e

    @staticmethod
    async def edit_lasso(body):
        """
        Edit ONLY inside the provided mask (WHITE = editable, BLACK = preserve).
        Produces a seamless composite: outside the mask is the original,
        inside the mask is the model's edit, feathered for clean blending.
        """
        try:
            import uuid
            import numpy as np
            import cv2
            from PIL import ImageFilter
            from utils.ai_helper import gpt_image_edit
            
            # ---------------------------
            # 0) Decode inputs
            # ---------------------------
            base = Image.open(io.BytesIO(base64.b64decode(body.image_b64))).convert("RGB")
            W, H = base.size

            maskL = Image.open(io.BytesIO(base64.b64decode(body.mask_b64))).convert("L")
            if maskL.size != (W, H):
                # Keep mask in sync with base
                maskL = maskL.resize((W, H), Image.Resampling.NEAREST)

            # ---------------------------
            # 1) Harden + slightly shrink mask to avoid spill
            # ---------------------------
            # binarize (0/255)
            maskL = maskL.point(lambda v: 255 if v >= 128 else 0) #type: ignore

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

            size = None if (body.size in (None, "", "natural")) else body.size

            # Use the *original* uploaded mask (not feathered) for the model call
            # but still ensure it's the same size and 0/255:
            model_mask = Image.open(io.BytesIO(base64.b64decode(body.mask_b64))).convert("L")
            if model_mask.size != (W, H):
                model_mask = model_mask.resize((W, H), Image.Resampling.NEAREST)
            model_mask = model_mask.point(lambda v: 255 if v >= 128 else 0) #type: ignore
            buf_model_mask = io.BytesIO()
            model_mask.save(buf_model_mask, format="PNG")
            model_mask_b64 = base64.b64encode(buf_model_mask.getvalue()).decode("utf-8")

            # ---------------------------
            # 3) Call model
            # ---------------------------
            out_b64 = gpt_image_edit(
                image_b64=body.image_b64,
                prompt=strict + (body.prompt or ""),
                mask_b64=model_mask_b64,             # WHITE=editable; function converts to alpha mask
                size=size or "1024x1024",
                model="gpt-image-1",
            )

            edited = Image.open(io.BytesIO(base64.b64decode(out_b64))).convert("RGB")
            if edited.size != (W, H):
                edited = edited.resize((W, H), Image.Resampling.LANCZOS)

            # ---------------------------
            # 4) Return as data URI without saving to disk
            # ---------------------------
            # Create data URL for frontend (matching generate_all_smart pattern)
            image_data_url = f"data:image/png;base64,{out_b64}"

            return {"ok": True, "image": image_data_url}

        except Exception as e:
            raise e
