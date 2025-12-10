from pydantic import BaseModel, Field
from typing import Optional


class GenerateVideoBody(BaseModel):
    """Schema for video generation request"""
    image_b64: str = Field(..., description="Base64 encoded image to generate video from")
    prompt: Optional[str] = Field(None, description="Custom prompt for video generation. If not provided, uses default prompt")

    class Config:
        json_schema_extra = {
            "example": {
                "image_b64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
                "prompt": "Generate a smooth camera motion through the landscape"
            }
        }


class GenerateVideoResponse(BaseModel):
    """Schema for video generation response"""
    success: bool
    message: str
    video_data: str  # Base64 video data for immediate frontend rendering
    video_uri: str  # URI pointer for retrieval
    filename: str
