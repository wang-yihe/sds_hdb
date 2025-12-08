from fastapi import HTTPException, status, Query
from typing import List

from schemas.user_schema import UserCreate, UserUpdate, UserResponse, LoginRequest
from services.user_service import UserService


class UserController:        
    @staticmethod
    async def get_all_users(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=100)
    ) -> List[UserResponse]:
        try:
            return await UserService.get_all_users()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching users: {str(e)}"
            )
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> UserResponse:
        try:
            return await UserService.get_user_by_id(user_id)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching user: {str(e)}"
            )
            
    @staticmethod
    async def create_user(user_data: UserCreate) -> UserResponse:
        try:
            return await UserService.create_user(user_data)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating user: {str(e)}"
            )
            
    @staticmethod
    async def update_user(
        user_id: str,
        user_data: UserUpdate,
        current_user: dict
    ) -> UserResponse:
        try:
            if user_id != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot update other users"
                )
            
            return await UserService.update_user(user_id, user_data)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating user: {str(e)}"
            )
    
    @staticmethod
    async def delete_user(
        user_id: str,
        current_user: dict
    ) -> dict:
        try:
            if user_id != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete other users"
                )
            
            await UserService.delete_user(user_id)
            return {"message": "User deleted successfully"}
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting user: {str(e)}"
            )
    
    @staticmethod
    async def login_user(credentials: LoginRequest) -> dict:
        try:
            return await UserService.authenticate_user(
                credentials.email,
                credentials.password
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
                headers={"WWW-Authenticate": "Bearer"}
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error authenticating user: {str(e)}"
            )
    
    @staticmethod
    async def get_current_user_profile(
        current_user: dict
    ) -> UserResponse:
        try:
            return await UserService.get_user_by_id(current_user["id"])
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching user profile: {str(e)}"
            )