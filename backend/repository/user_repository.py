from typing import Optional, List
from beanie import PydanticObjectId

from models.user_model import User

class UserRepository:
    @staticmethod
    async def findAllUsers() -> List[User]:
        try: 
            return await User.find_all().to_list()  
        except Exception as e:
            raise Exception(str(e))
    
    @staticmethod
    async def findById(user_id: str) -> Optional[User]:
        try:
            return await User.get(PydanticObjectId(user_id))
        except Exception as e:
            raise Exception(str(e))
    
    @staticmethod
    async def create_user(user: User) -> User:
        try:
            await user.insert()
            return user
        except Exception as e:
            raise Exception(str(e))
    
    @staticmethod
    async def update_user(user_id: str, update_data: dict) -> Optional[User]:
        try:
            user = await User.get(PydanticObjectId(user_id))
            if user:
                await user.set(update_data)
            return user
        except Exception as e:
            raise Exception(str(e))
    
    @staticmethod
    async def delete_user(user_id: str) -> bool:
        try:
            user = await User.get(PydanticObjectId(user_id))
            if user:
                await user.delete()
                return True
            return False
        except Exception as e:
            raise Exception(str(e))