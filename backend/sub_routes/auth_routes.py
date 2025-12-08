from fastapi import APIRouter, Depends, HTTPException, status
from controllers.user_controller import UserController
from auth.auth_middleware import authenticate_jwt
from auth.auth_strategy import (
    authenticate_user,
    create_access_token
)
from db.db import db

from schemas.auth_schema import ( 
    LoginRequest,
    UserResponse,
    LoginResponse,
    TokenValidationResponse
)

from schemas.user_schema import UserCreate

app = APIRouter()

@app.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    user_data = await authenticate_user(
        email=credentials.email,
        password=credentials.password
    )
    
    access_token = create_access_token({
        "id": user_data["id"],
        "email": user_data["email"],
    })
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user_data)
    )

@app.post("/register", response_model=UserResponse, status_code=201)
async def register_user(data: UserCreate):

    existing_user = await db.User.find_one(db.User.email == data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = await UserController.create_user(user_data = data)
        
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        is_active=user.is_active
    )

# ==================== PROTECTED ROUTES ====================

@app.get("/validate", response_model=TokenValidationResponse)
async def validate_token(current_user: dict = Depends(authenticate_jwt)):

    user = await db.User.get(current_user["id"])
    
    if not user:
        return TokenValidationResponse(valid=False, user=None)
    
    return TokenValidationResponse(
        valid=True,
        user=UserResponse(
            id=str(user.id),
            name=user.name,
            email=user.email,
            is_active=user.is_active,
        )
    )

@app.get("/current_user", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(authenticate_jwt)):
    user = await db.User.get(current_user["id"])
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        is_active=user.is_active,
    )

@app.post("/logout")
async def logout(current_user: dict = Depends(authenticate_jwt)):

    return {"message": "Successfully logged out"}