from pydantic import BaseModel
from datetime import datetime

class CanvasCreate(BaseModel):
    project_id: str
    canvas_data: dict

class CanvasUpdate(BaseModel):
    canvas_data: dict

class CanvasResponse(BaseModel):
    id: str
    project_id: str
    canvas_data: dict
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True