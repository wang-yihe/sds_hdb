from beanie import Document
from pydantic import EmailStr, Field
from datetime import datetime

class User(Document):
    name: str
    email: EmailStr
    password_hash: str
    is_active: bool = True
    must_change_password: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "tbl_user"  