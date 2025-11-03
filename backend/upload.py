from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse
import os, shutil

router = APIRouter()
HERE = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(HERE, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # include a url for convenience (served by StaticFiles)
    return JSONResponse({
        "message": "File uploaded successfully",
        "filename": file.filename,
        "url": f"http://localhost:8000/uploads/{file.filename}"
    })