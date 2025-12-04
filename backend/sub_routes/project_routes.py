from fastapi import APIRouter, Depends, UploadFile, File
from typing import List
from controllers.project_controller import ProjectController
from schemas.project_schema import ProjectCreate, ProjectUpdate, ProjectResponse, CollaboratorAdd
from auth.auth_dependencies import get_current_user

app = APIRouter()
controller = ProjectController()

@app.post("/create_project", response_model=ProjectResponse, status_code=201)
async def create_project(
    project_data: ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    return await controller.create_project(project_data, current_user)

@app.get("/get_user_projects", response_model=List[ProjectResponse])
async def get_user_projects(
    current_user: dict = Depends(get_current_user)
):
    return await controller.get_user_projects(current_user)

@app.get("/get_project_by_id/{project_id}", response_model=ProjectResponse)
async def get_project_by_id(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await controller.get_project_by_id(project_id, current_user)

@app.put("/update_project/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: dict = Depends(get_current_user)
):
    return await controller.update_project(project_id, project_data, current_user)

@app.delete("/delete_project/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await controller.delete_project(project_id, current_user)

@app.post("/{project_id}/add_collaborator", response_model=ProjectResponse)
async def add_collaborator(
    project_id: str,
    collaborator_data: CollaboratorAdd,
    current_user: dict = Depends(get_current_user)
):
    return await controller.add_collaborator(project_id, collaborator_data, current_user)

@app.delete("/{project_id}/remove_collaborator", response_model=ProjectResponse)
async def remove_collaborator(
    project_id: str,
    collaborator_data: CollaboratorAdd,
    current_user: dict = Depends(get_current_user)
):
    return await controller.remove_collaborator(project_id, collaborator_data, current_user)

@app.post("/upload_thumbnail/{project_id}")
async def upload_thumbnail(
    project_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    return await controller.upload_thumbnail(project_id, file, current_user)