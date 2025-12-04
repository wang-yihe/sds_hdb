from fastapi import HTTPException, status, Depends
from typing import List

from schemas.project_schema import ProjectCreate, ProjectUpdate, ProjectResponse, CollaboratorAdd
from services.project_service import ProjectService
from auth.auth_dependencies import get_current_user


class ProjectController:
    
    @staticmethod
    async def create_project(
        project_data: ProjectCreate,
        current_user: dict = Depends(get_current_user)
    ) -> ProjectResponse:
        try:
            project = await ProjectService.create_project(project_data, current_user["id"])
            return ProjectResponse(
                id=str(project.id),
                name=project.name,
                description=project.description,
                owner_id=str(project.owner_id),
                collaborator_ids=[str(cid) for cid in project.collaborator_ids],
                created_at=project.created_at,
                updated_at=project.updated_at
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating project: {str(e)}"
            )
    
    @staticmethod
    async def get_user_projects(
        current_user: dict = Depends(get_current_user)
    ) -> List[ProjectResponse]:
        try:
            projects = await ProjectService.get_user_projects(current_user["id"])
            return [
                ProjectResponse(
                    id=str(project.id),
                    name=project.name,
                    description=project.description,
                    owner_id=str(project.owner_id),
                    collaborator_ids=[str(cid) for cid in project.collaborator_ids],
                    created_at=project.created_at,
                    updated_at=project.updated_at
                )
                for project in projects
            ]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching projects: {str(e)}"
            )
    
    @staticmethod
    async def get_project_by_id(
        project_id: str,
        current_user: dict = Depends(get_current_user)
    ) -> ProjectResponse:
        try:
            project = await ProjectService.get_project(project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            if str(project.owner_id) != current_user["id"] and current_user["id"] not in [str(cid) for cid in project.collaborator_ids]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this project"
                )
            
            return ProjectResponse(
                id=str(project.id),
                name=project.name,
                description=project.description,
                owner_id=str(project.owner_id),
                collaborator_ids=[str(cid) for cid in project.collaborator_ids],
                created_at=project.created_at,
                updated_at=project.updated_at
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching project: {str(e)}"
            )
    
    @staticmethod
    async def update_project(
        project_id: str,
        project_data: ProjectUpdate,
        current_user: dict = Depends(get_current_user)
    ) -> ProjectResponse:
        try:
            project = await ProjectService.get_project(project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            if str(project.owner_id) != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only project owner can update project"
                )
            
            updated_project = await ProjectService.update_project(project_id, project_data)
            if not updated_project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            return ProjectResponse(
                id=str(updated_project.id),
                name=updated_project.name,
                description=updated_project.description,
                owner_id=str(updated_project.owner_id),
                collaborator_ids=[str(cid) for cid in updated_project.collaborator_ids],
                created_at=updated_project.created_at,
                updated_at=updated_project.updated_at
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating project: {str(e)}"
            )
    
    @staticmethod
    async def delete_project(
        project_id: str,
        current_user: dict = Depends(get_current_user)
    ) -> dict:
        try:
            project = await ProjectService.get_project(project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            if str(project.owner_id) != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only project owner can delete project"
                )
            
            success = await ProjectService.delete_project(project_id)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            return {"message": "Project deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting project: {str(e)}"
            )
    
    @staticmethod
    async def add_collaborator(
        project_id: str,
        collaborator_data: CollaboratorAdd,
        current_user: dict = Depends(get_current_user)
    ) -> ProjectResponse:
        try:
            project = await ProjectService.get_project(project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            if str(project.owner_id) != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only project owner can add collaborators"
                )
            
            updated_project = await ProjectService.add_collaborator(project_id, collaborator_data.email)
            if not updated_project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            return ProjectResponse(
                id=str(updated_project.id),
                name=updated_project.name,
                description=updated_project.description,
                owner_id=str(updated_project.owner_id),
                collaborator_ids=[str(cid) for cid in updated_project.collaborator_ids],
                created_at=updated_project.created_at,
                updated_at=updated_project.updated_at
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error adding collaborator: {str(e)}"
            )
    
    @staticmethod
    async def remove_collaborator(
        project_id: str,
        collaborator_data: CollaboratorAdd,
        current_user: dict = Depends(get_current_user)
    ) -> ProjectResponse:
        try:
            project = await ProjectService.get_project(project_id)
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            if str(project.owner_id) != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only project owner can remove collaborators"
                )
            
            updated_project = await ProjectService.remove_collaborator(project_id, collaborator_data.email)
            if not updated_project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            return ProjectResponse(
                id=str(updated_project.id),
                name=updated_project.name,
                description=updated_project.description,
                owner_id=str(updated_project.owner_id),
                collaborator_ids=[str(cid) for cid in updated_project.collaborator_ids],
                created_at=updated_project.created_at,
                updated_at=updated_project.updated_at
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error removing collaborator: {str(e)}"
            )