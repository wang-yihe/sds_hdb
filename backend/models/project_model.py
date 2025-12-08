# models/project_model.py
from beanie import Document
from pydantic import Field, ConfigDict
from datetime import datetime
from bson.objectid import ObjectId
from typing import List, Optional

class Project(Document):
    name: str
    description: str = ""
    owner_id: ObjectId
    collaborator_ids: List[ObjectId] = []
    thumbnail: Optional[str] = None  # Add this field - URL to thumbnail
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    class Settings:
        name = "tbl_project"