from beanie import Document
from pydantic import Field, ConfigDict
from datetime import datetime, timezone
from bson.objectid import ObjectId

class Canvas(Document):
    project_id: ObjectId
    canvas_data: dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    class Settings:
        name = "tbl_canvas"