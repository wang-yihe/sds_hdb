# routes/canvas_router.py
from fastapi import APIRouter, Depends
from controllers.canvas_controller import CanvasController
from schemas.canvas_schema import CanvasResponse
from auth.auth_dependencies import get_current_user

app = APIRouter()
controller = CanvasController()

@app.get("/get_canvas/{project_id}", response_model=CanvasResponse)
async def get_canvas(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await controller.get_canvas(project_id, current_user)

@app.put("/save_canvas/{project_id}")
async def save_canvas(
    project_id: str,
    canvas_data: dict,
    current_user: dict = Depends(get_current_user)
):
    return await controller.save_canvas(project_id, canvas_data, current_user)

@app.delete("/delete_canvas/{project_id}")
async def delete_canvas(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await controller.delete_canvas(project_id, current_user)

@app.post("/create_empty_canvas/{project_id}", response_model=CanvasResponse)
async def create_empty_canvas(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await controller.create_empty_canvas(project_id, current_user)