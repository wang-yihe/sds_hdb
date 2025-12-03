from core.prompts import build_style_and_species_blocks
from schemas.ai_schema import AnalyzeBody, DragPlaceBody, GenerateAllSmartBody, MaskFromGreenBody, PreviewMaskBody, Stage1Body, Stage2Body, Stage3Body
from core.ai import OUT_DIR, _save_bytes, generate_all_smart, make_hard_and_soft_masks_from_green, run_stage1_layout, _prompt_list_to_dicts, run_stage2_refine, run_stage3_blend
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
            raise e
        
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