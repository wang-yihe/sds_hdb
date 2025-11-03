from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import upload  # your upload.py

app = FastAPI()

# Use explicit origin for Vite dev server
origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # fine now that origins are explicit
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optionally serve the uploads so you can show a server URL later
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(upload.router)

@app.get("/")
async def root():
    return {"message": "Hello, World!"}
