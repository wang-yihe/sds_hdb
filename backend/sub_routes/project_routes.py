from fastapi import APIRouter
from typing import List
from controllers.project_controller import ProjectController
from schemas.project_schema import ProjectCreate, ProjectUpdate, ProjectResponse, CollaboratorAdd

app = APIRouter()
controller = ProjectController()

@app.post("/create_project", response_model=ProjectResponse, status_code=201)
async def create_project(project_data: ProjectCreate):
    return await controller.create_project(project_data)

@app.get("/get_user_projects", response_model=List[ProjectResponse])
async def get_user_projects():
    return await controller.get_user_projects()

@app.get("/get_project_by_id/{project_id}", response_model=ProjectResponse)
async def get_project_by_id(project_id: str):
    return await controller.get_project_by_id(project_id)

@app.put("/update_project/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project_data: ProjectUpdate):
    return await controller.update_project(project_id, project_data)

@app.delete("/delete_project/{project_id}")
async def delete_project(project_id: str):
    return await controller.delete_project(project_id)

@app.post("/{project_id}/add_collaborator", response_model=ProjectResponse)
async def add_collaborator(project_id: str, collaborator_data: CollaboratorAdd):
    return await controller.add_collaborator(project_id, collaborator_data)

@app.delete("/{project_id}/remove_collaborator", response_model=ProjectResponse)
async def remove_collaborator(project_id: str, collaborator_data: CollaboratorAdd):
    return await controller.remove_collaborator(project_id, collaborator_data)