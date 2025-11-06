# ruff: noqa: E402

import os 
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

env = os.getenv("ENV", "development")
load_dotenv(f".env.{env}")

#lazy imports
from db.db import connect_to_db, close_db_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    try: 
        await connect_to_db()
        print("Database connected successfully.")
        yield
    except Exception as err:
        print(f'Unable to connect to the database: {err}')
        raise
    finally:
        await close_db_connection()
        print("Database connection closed.")
        
app = FastAPI(
    title="User Management Backend",
    description="Backend service for user management with FastAPI and Beanie",
    lifespan=lifespan
)

CORS_OPTIONS = {
    "allow_origins": ['http://localhost:5173', 'http://localhost:5174'],
    "allow_methods": ['GET', 'POST', 'PUT', 'DELETE'],
    "allow_headers": ['Content-Type', 'Authorization'],
    "allow_credentials": True,
}

app.add_middleware(CORSMiddleware, **CORS_OPTIONS)

from routes.main_router import app 

# Include main router
app.include_router(
    app,
    prefix=os.getenv("APP_BASE_PATH", "")
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    
    PORT = int(os.getenv("APP_PORT", 8000))
    
    uvicorn.run(
        "main:app",  # app location
        host="0.0.0.0",
        port=PORT,
        reload=True if env == "development" else False
    )