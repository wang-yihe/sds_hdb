from services.video_generation_service import VideoGenerationService
from schemas.video_generation_schema import GenerateVideoBody
from fastapi import HTTPException, status


class VideoGenerationController:
    @staticmethod
    async def generate_video(body: GenerateVideoBody):
        try:
            return await VideoGenerationService.generate_video_from_image(body)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating video: {str(e)}"
            )

    @staticmethod
    async def get_video_file(filename: str):
        try:
            return await VideoGenerationService.get_video_file(filename)
        except FileNotFoundError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving video file: {str(e)}"
            )
