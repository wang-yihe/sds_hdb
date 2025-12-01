# services/user_service.py
from typing import List
from datetime import datetime

from models.user_model import User
from schemas.user_schema import UserCreate, UserUpdate, UserResponse
from repository.user_repository import UserRepository
from auth.auth_strategy import hash_password, verify_password, create_access_token


class UserService:
    @staticmethod
    async def get_all_users() -> List[UserResponse]:
        users = await UserRepository.findAllUsers()
        return [
            UserResponse(
                id=str(user.id),
                name=user.name,
                email=user.email,
                is_active=user.is_active,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            for user in users   
        ]
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> UserResponse:
        user = await UserRepository.findById(user_id)
        
        if not user:
            raise ValueError("User not found")
        
        return UserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    
    @staticmethod
    async def create_user(user_data: UserCreate) -> UserResponse:
        existing_users = await UserRepository.findAllUsers()
        if any(u.email == user_data.email for u in existing_users):
            raise ValueError("Email already registered")
        
        hashed_password = hash_password(user_data.password)
        print(user_data.password)
        user = User(
            name=user_data.name,
            email=user_data.email,
            password_hash=hashed_password,
            is_active=True
        )
        
        created_user = await UserRepository.create_user(user)
        
        return UserResponse(
            id=str(created_user.id),
            name=created_user.name,
            email=created_user.email,
            is_active=created_user.is_active,
            created_at=created_user.created_at,
            updated_at=created_user.updated_at
        )
    
    @staticmethod
    async def update_user(user_id: str, user_data: UserUpdate) -> UserResponse:
        user = await UserRepository.findById(user_id)
        if not user:
            raise ValueError("User not found")
        
        update_data = user_data.model_dump(exclude_unset=True)
        
        if "password" in update_data:
            update_data["password_hash"] = hash_password(update_data.pop("password"))
        
        update_data["updated_at"] = datetime.utcnow()
        
        updated_user = await UserRepository.update_user(user_id, update_data)
        
        if not updated_user:
            raise Exception("Failed to update user")
        
        return UserResponse(
            id=str(updated_user.id),
            name=updated_user.name,
            email=updated_user.email,
            is_active=updated_user.is_active,
            created_at=updated_user.created_at,
            updated_at=updated_user.updated_at
        )
    
    @staticmethod
    async def delete_user(user_id: str) -> bool:
        deleted = await UserRepository.delete_user(user_id)
        if not deleted:
            raise ValueError("User not found")
        return deleted
    
    @staticmethod
    async def authenticate_user(email: str, password: str) -> dict:
        users = await UserRepository.findAllUsers()
        user = next((u for u in users if u.email == email and u.is_active), None)
        
        if not user:
            raise ValueError("Invalid credentials")
        
        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        
        access_token = create_access_token(
            data={"sub": user.email, "id": str(user.id)}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=str(user.id),
                name=user.name,
                email=user.email,
                is_active=user.is_active,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        }