from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CollaboratorAdd(BaseModel):
    email: EmailStr

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    owner_id: str
    collaborator_ids: List[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True