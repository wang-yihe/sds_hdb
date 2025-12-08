# services/canvas_service.py
from repository.canvas_repository import CanvasRepository
from schemas.canvas_schema import CanvasResponse
from utils.canvas_helper import process_and_save_assets
from typing import Optional

class CanvasService:
    
    @staticmethod
    async def get_canvas_by_project(project_id: str) -> Optional[CanvasResponse]:
        try:
            canvas = await CanvasRepository.get_canvas_by_project_id(project_id)
            if not canvas:
                return None
            
            return CanvasResponse(
                id=str(canvas.id),
                project_id=str(canvas.project_id),
                canvas_data=canvas.canvas_data,
                created_at=canvas.created_at,
                updated_at=canvas.updated_at
            )
        except Exception as e:
            raise e
    
    @staticmethod
    async def save_canvas(project_id: str, canvas_data: dict) -> Optional[CanvasResponse]:
        try:
            if not canvas_data or not isinstance(canvas_data, dict):
                raise ValueError("Canvas data must be a non-empty dictionary")
            
            processed_canvas_data = process_and_save_assets(project_id, canvas_data)
            
            canvas = await CanvasRepository.update_canvas(project_id, processed_canvas_data)
            if not canvas:
                return None
            
            return CanvasResponse(
                id=str(canvas.id),
                project_id=str(canvas.project_id),
                canvas_data=canvas.canvas_data,
                created_at=canvas.created_at,
                updated_at=canvas.updated_at
            )
        except ValueError as e:
            raise e
        except Exception as e:
            raise e
    
    @staticmethod
    async def delete_canvas(project_id: str) -> bool:
        try:
            return await CanvasRepository.delete_canvas(project_id)
        except Exception as e:
            raise e
    
    @staticmethod
    async def create_empty_canvas(project_id: str) -> CanvasResponse:
        try:
            empty_canvas_data = {
                "store": {},
                "schema": {
                    "schemaVersion": 1,
                    "storeVersion": 4,
                    "recordVersions": {}
                }
            }
            canvas = await CanvasRepository.create_canvas(project_id, empty_canvas_data)
            
            return CanvasResponse(
                id=str(canvas.id),
                project_id=str(canvas.project_id),
                canvas_data=canvas.canvas_data,
                created_at=canvas.created_at,
                updated_at=canvas.updated_at
            )
        except Exception as e:
            raise e