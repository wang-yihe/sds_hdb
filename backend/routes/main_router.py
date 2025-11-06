from fastapi import APIRouter, Depends

# from ..auth.auth_middleware import authenticate_jwt

# Import all subroutes

from ..sub_routes.auth_routes import app as auth_router
# from ..sub_routes.canvas_routes import app as canvas_router
# from ..sub_routes.user_routes import app as user_router

# Create main router
app = APIRouter()

@app.get("/")
async def root():
    return {
        "response": "HDB Backend API is ready to serve",
        "status": 200
    }

# Public Routes
app.include_router(auth_router, prefix="/auth", tags=["auth"])

# Protected Routes using JWT Authentication
# app.include_router(canvas_router, prefix="/canvas", tags=["canvas"], dependencies=[Depends(authenticate_jwt)])
# app.include_router(user_router, prefix="/user", tags=["user"], dependencies=[Depends(authenticate_jwt)])