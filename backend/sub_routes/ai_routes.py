from fastapi import APIRouter
from controllers.ai_controller import AIController
from schemas.ai_schema import AnalyzeBody, DragPlaceBody, GenerateAllSmartBody, MaskFromGreenBody, PreviewMaskBody, Stage1Body, Stage2Body, Stage3Body

app = APIRouter()
controller = AIController()

@app.post("/analyze_inputs")
async def analyze_inputs(body: AnalyzeBody):
    return await controller.analyze_inputs(body)

@app.post("/stage1")
async def stage1(body: Stage1Body):
    return await controller.stage1(body)

@app.post("/stage2")
async def stage2(body: Stage2Body):
    return await controller.stage2(body)

@app.post("/stage3")
async def stage3(body: Stage3Body):
    return await controller.stage3(body)

@app.post("/generate_all_smart")
async def generate_all_smart(body: GenerateAllSmartBody):
    return await controller.generate_all_smart(body)

@app.post("/drag_place_plant")
async def drag_place_plant(body: DragPlaceBody):
    return await controller.drag_place_plant(body)

@app.get("/file/{name}")
async def get_file(name: str):
    return await controller.get_file(name)

@app.post("/preview_mask")
async def preview_mask(body: PreviewMaskBody):
    return await controller.preview_mask(body)

@app.post("/mask_from_green")
async def mask_from_green(body: MaskFromGreenBody):
    return await controller.mask_from_green(body)



