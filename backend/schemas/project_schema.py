from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    thumbnail: Optional[str] = None

class CollaboratorAdd(BaseModel):
    email: EmailStr

class CollaboratorInfo(BaseModel):
    id: str
    email: str

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    owner_id: str
    collaborator_ids: List[str]
    collaborators: Optional[List[CollaboratorInfo]] = []  # Add collaborator details
    thumbnail: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    