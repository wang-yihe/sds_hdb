# controllers/canvas_controller.py
from fastapi import HTTPException, status
from schemas.canvas_schema import CanvasResponse
from services.canvas_service import CanvasService
from services.project_service import ProjectService

class CanvasController:
    
    @staticmethod
    async def get_canvas(
        project_id: str,
        current_user: dict
    ) -> CanvasResponse:
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
            
            canvas = await CanvasService.get_canvas_by_project(project_id)
            
            if not canvas:
                return CanvasResponse(
                    id="",
                    project_id=project_id,
                    canvas_data={},
                    created_at=project.created_at,
                    updated_at=project.updated_at
                )
            
            return canvas
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching canvas: {str(e)}"
            )
    
    @staticmethod
    async def save_canvas(
        project_id: str,
        canvas_data: dict,
        current_user: dict
    ) -> dict:
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
                    detail="Not authorized to save this canvas"
                )
            
            canvas = await CanvasService.save_canvas(project_id, canvas_data)
            
            if not canvas:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to save canvas"
                )
            
            return {
                "message": "Canvas saved successfully",
                "canvas_id": canvas.id,
                "updated_at": canvas.updated_at
            }
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
                detail=f"Error saving canvas: {str(e)}"
            )
    
    @staticmethod
    async def delete_canvas(
        project_id: str,
        current_user: dict
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
                    detail="Only project owner can delete canvas"
                )
            
            success = await CanvasService.delete_canvas(project_id)
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Canvas not found"
                )
            
            return {"message": "Canvas deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting canvas: {str(e)}"
            )
    
    @staticmethod
    async def create_empty_canvas(
        project_id: str,
        current_user: dict
    ) -> CanvasResponse:
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
                    detail="Only project owner can create canvas"
                )
            
            canvas = await CanvasService.create_empty_canvas(project_id)
            return canvas
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating canvas: {str(e)}"
            )