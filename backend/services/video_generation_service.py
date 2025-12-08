import time
import base64
import uuid
from pathlib import Path
from google import genai
from google.genai import types
from schemas.video_generation_schema import GenerateVideoBody
from fastapi.responses import FileResponse
from core.config import get_settings

# === CONFIG ===
# Store generated videos in backend/storage/generated_videos
VIDEO_STORAGE_DIR = Path(get_settings().video_storage_dir)
VIDEO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Default prompt for video generation
DEFAULT_PROMPT = (
    "Use the input image as a strict, fixed environment. "
    "Do NOT expand the scene beyond what is visible in the image. "
    "Do NOT reveal new paths, buildings, sky, vegetation, terrain, or background that is not present in the original pixels. "

    "Camera starts 3m above ground level and 10m from the scene, facing directly toward the landscape with no tilt or roll. "
    "Use a 35mm lens for natural perspective. Subject centered, horizon placed on the lower third. "

    "All camera movement must remain INSIDE the boundaries of the original image. "
    "Instead of moving into unseen areas, perform only a subtle parallax effect: "
    "- slight left-to-right motion "
    "- slight push-in (maximum 5%) "
    "These motions should NOT expose anything beyond the original frame. "

    "Lighting: bright neutral daylight with soft shadows (slightly overcast). "
    "Preserve plant and material colors exactly. "

    "Preserve ALL hardscape geometry, scale, perspective, and layout exactly as shown. "
    "Do NOT add, remove, or alter ANY objects. "
    "Render the sequence as a 5-10 second smooth camera motion, strictly constrained to the content visible in the input image."
)

MODEL_NAME = get_settings().video_generation_model

class VideoGenerationService:

    @staticmethod
    def _get_client():
        """Initialize and return the Google GenAI client"""
        api_key = get_settings().google_api_key
        if not api_key:
            raise RuntimeError("Missing GOOGLE_API_KEY in environment variables")
        return genai.Client(api_key=api_key)

    @staticmethod
    def _decode_base64_image(image_b64: str) -> tuple[bytes, str]:
        """
        Decode base64 image and determine mime type
        Returns: (image_bytes, mime_type)
        """
        # Remove data URL prefix if present
        if ',' in image_b64:
            header, image_b64 = image_b64.split(',', 1)
            # Extract mime type from header if present
            if 'image/png' in header:
                mime_type = "image/png"
            elif 'image/jpeg' in header or 'image/jpg' in header:
                mime_type = "image/jpeg"
            else:
                mime_type = "image/jpeg"  # default
        else:
            mime_type = "image/jpeg"  # default

        image_bytes = base64.b64decode(image_b64)
        return image_bytes, mime_type

    @staticmethod
    def _save_video(video_bytes: bytes, prefix: str = "video") -> str:
        """
        Save video bytes to storage with UUID filename
        Returns: filename
        """
        filename = f"{prefix}_{uuid.uuid4().hex}.mp4"
        storage_path = VIDEO_STORAGE_DIR / filename
        storage_path.write_bytes(video_bytes)
        return filename

    @staticmethod
    async def generate_video_from_image(body: GenerateVideoBody):
        """
        Generate a video from an input image using Google's Veo model

        Args:
            body: GenerateVideoBody containing image_b64 and optional prompt

        Returns:
            dict with success status and video URI pointer for retrieval
        """
        try:
            # Get GenAI client
            client = VideoGenerationService._get_client()

            # Decode the base64 image
            img_bytes, mime_type = VideoGenerationService._decode_base64_image(body.image_b64)

            # Create inline image for Veo
            inline_image = types.Image(
                image_bytes=img_bytes,
                mime_type=mime_type,
            )

            # Create reference image
            ref = types.VideoGenerationReferenceImage(
                image=inline_image,
                reference_type=types.VideoGenerationReferenceType.ASSET,
            )

            # Use custom prompt or default
            prompt = body.prompt if body.prompt else DEFAULT_PROMPT

            # Generate video
            op = client.models.generate_videos(
                model=MODEL_NAME,
                prompt=prompt,
                config=types.GenerateVideosConfig(
                    reference_images=[ref],
                ),
            )

            # Poll until done
            while not op.done:
                op = client.operations.get(op)
                time.sleep(5)

            # Check if video was generated
            if not op.response or not hasattr(op.response, "generated_videos"):
                raise RuntimeError("No video returned by Veo model")

            generated_videos = getattr(op.response, "generated_videos", None)
            if not generated_videos or len(generated_videos) == 0:
                raise RuntimeError("No video returned by Veo model")

            # Download video from Veo
            video_file = generated_videos[0].video
            video_bytes = client.files.download(file=video_file)

            # Save to storage and get filename
            filename = VideoGenerationService._save_video(video_bytes)

            # Convert video to base64 for frontend
            video_b64 = base64.b64encode(video_bytes).decode('utf-8')
            video_data_url = f"data:video/mp4;base64,{video_b64}"

            # Return video data for canvas/UI to render
            return {
                "success": True,
                "message": "Video generated successfully",
                "video_data": video_data_url,  # Base64 video data for frontend
                "video_uri": f"/api/video/file/{filename}",  # URI pointer for retrieval
                "filename": filename
            }

        except Exception as e:
            raise Exception(f"Error generating video: {str(e)}")

    @staticmethod
    async def get_video_file(filename: str):
        """
        Retrieve a generated video file by filename (used when rendering canvas)

        Args:
            filename: Name of the video file

        Returns:
            FileResponse with the video file
        """
        video_path = VIDEO_STORAGE_DIR / filename
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {filename}")

        return FileResponse(
            str(video_path),
            media_type="video/mp4",
            filename=filename
        )
