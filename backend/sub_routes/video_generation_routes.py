from fastapi import APIRouter
from controllers.video_generation_controller import VideoGenerationController
from schemas.video_generation_schema import GenerateVideoBody

app = APIRouter()
controller = VideoGenerationController()

@app.post("/generate")
async def generate_video(body: GenerateVideoBody):
    """Generate a video from an input image using Google's Veo model"""
    return await controller.generate_video(body)
