from beanie import Document
from typing import Optional

class User(Document):
    name: str
    email: str
    password_hash: str
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    is_active: bool = True

    class Settings:
        name = "tbl_user"

#model methods
    async def soft_delete(self):
        self.is_active = False
        await self.save()

    @classmethod
    async def get_active(cls):
         return await cls.find(cls.is_active).to_list()
     