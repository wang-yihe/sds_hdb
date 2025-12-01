# routes/user_router.py
from fastapi import APIRouter, Query
from typing import List
from controllers.user_controller import UserController
from schemas.user_schema import UserCreate, UserUpdate, UserResponse, LoginRequest

app = APIRouter()
controller = UserController()

@app.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate):
    return await controller.create_user(user_data)


@app.post("/login")
async def login(credentials: LoginRequest):

    return await controller.login_user(credentials)


@app.get("/get_current_user_profile", response_model=UserResponse)
async def get_current_user_profile():

    return await controller.get_current_user_profile()

@app.get("/get_all_users", response_model=List[UserResponse])
async def get_all_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return")
):
    return await controller.get_all_users(skip, limit)


@app.get("/get_user_by_id/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str):
    return await controller.get_user_by_id(user_id)


@app.put("/update_user/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate):
    return await controller.update_user(user_id, user_data)

@app.delete("/delete_user/{user_id}")
async def delete_user(user_id: str):
    return await controller.delete_user(user_id)