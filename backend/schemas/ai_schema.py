from pydantic import BaseModel
from typing import List, Optional

class PreviewMaskBody(BaseModel):
    base_image_b64: str
    green_overlay_b64: str  
    
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
    # Changed from base_image_b64 to styleImages and perspectiveImages
    styleImages: List[str] = []
    perspectiveImages: List[str] = []
    
    # Keep the rest as is
    style_refs_b64: List[str] = []
    plant_refs_b64: List[str] = []
    user_prompts: List[PromptItem] = []
    green_overlay_b64: Optional[str] = None
    size: str = "1024x1024"
    stage3_use_soft_mask: bool = False
    
    # Optional fields for regeneration
    selectedPlants: List[str] = []
    prompt: str = ""
    lassoSelection: Optional[dict] = None
    regenerationPrompt: Optional[str] = None


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
