import os 
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import get_settings
from db.db import connect_to_db, close_db_connection
from routes.main_router import main_router 

env = get_settings().environment
PORT = get_settings().app_port
CANVAS_ASSET_DIR = get_settings().canvas_asset_dir

@asynccontextmanager
async def lifespan(_app: FastAPI):
    "Lifespan for the app"
    await connect_to_db()
    yield
    await close_db_connection()
    
app = FastAPI(lifespan=lifespan, redirect_slashes=False)

CORS_OPTIONS = {
    "allow_origins": get_settings().allow_origins,
    "allow_methods": get_settings().allow_methods,
    "allow_headers": get_settings().allow_headers,
    "allow_credentials": get_settings().allow_credentials,
}

app.add_middleware(CORSMiddleware, **CORS_OPTIONS)

# Each project will have its own asset directory for images/videos
canvas_assets_path = Path(CANVAS_ASSET_DIR)
canvas_assets_path.mkdir(parents=True, exist_ok=True)

app.mount("/canvas-assets", StaticFiles(directory=CANVAS_ASSET_DIR), name="canvas_assets")

app.include_router(main_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    
    PORT = int(os.getenv("PORT", PORT))
    
    uvicorn.run(
        "main:app",  # app location
        host="0.0.0.0",
        port=PORT,
        reload=True if env == "development" else False
    )