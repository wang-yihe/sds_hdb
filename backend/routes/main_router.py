from fastapi import APIRouter, Depends
from auth.auth_middleware import authenticate_jwt

# Import all subroutes

from sub_routes.auth_routes import app as auth_router
# from sub_routes.canvas_routes import app as canvas_router
from sub_routes.user_routes import app as user_router

# Create main router
main_router = APIRouter()

@main_router.get("/")
async def root():
    return {
        "response": "HDB Backend API is ready to serve",
        "status": 200
    }

# Public Routes
main_router.include_router(auth_router, prefix="/auth", tags=["auth"])

# Protected Routes using JWT Authentication
# main_router.include_router(canvas_router, prefix="/canvas", tags=["canvas"], dependencies=[Depends(authenticate_jwt)])
main_router.include_router(user_router, prefix="/user", tags=["user"], dependencies=[Depends(authenticate_jwt)])