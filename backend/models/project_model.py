from beanie import Document
from pydantic import Field, ConfigDict
from datetime import datetime
from bson.objectid import ObjectId
from typing import List

class Project(Document):
    name: str
    description: str = ""
    owner_id: ObjectId
    collaborator_ids: List[ObjectId] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    class Settings:
        name = "tbl_project"