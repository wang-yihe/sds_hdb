# repository/canvas_repository.py
from models.canvas_model import Canvas
from bson.objectid import ObjectId
from typing import Optional
from datetime import datetime, timezone

class CanvasRepository:
    
    @staticmethod
    async def create_canvas(project_id: str, canvas_data: dict) -> Canvas:
        try:
            canvas = Canvas(
                project_id=ObjectId(project_id),
                canvas_data=canvas_data
            )
            await canvas.insert()
            return canvas
        except Exception as e:
            raise e
    
    @staticmethod
    async def get_canvas_by_project_id(project_id: str) -> Optional[Canvas]:
        try:
            return await Canvas.find_one(Canvas.project_id == ObjectId(project_id))
        except Exception as e:
            raise e
    
    @staticmethod
    async def update_canvas(project_id: str, canvas_data: dict) -> Optional[Canvas]:
        try:
            canvas = await Canvas.find_one(Canvas.project_id == ObjectId(project_id))
            
            if not canvas:
                return await CanvasRepository.create_canvas(project_id, canvas_data)
            
            canvas.canvas_data = canvas_data
            canvas.updated_at = datetime.now(timezone.utc)
            await canvas.save()
            return canvas
        except Exception as e:
            raise e
    
    @staticmethod
    async def delete_canvas(project_id: str) -> bool:
        try:
            canvas = await Canvas.find_one(Canvas.project_id == ObjectId(project_id))
            if not canvas:
                return False
            await canvas.delete()
            return True
        except Exception as e:
            raise e

    @staticmethod
    async def get_canvas_by_id(canvas_id: str) -> Optional[Canvas]:
        try:
            return await Canvas.get(ObjectId(canvas_id))
        except Exception as e:
            raise e
    
    @staticmethod
    async def delete_all_canvases_by_project(project_id: str) -> int:
        try:
            canvases = await Canvas.find(Canvas.project_id == ObjectId(project_id)).to_list()
            count = len(canvases)
            for canvas in canvases:
                await canvas.delete()
            return count
        except Exception as e:
            raise e