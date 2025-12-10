import time
import base64
from PIL import Image
import io
from google import genai
from google.genai import types
from schemas.video_generation_schema import GenerateVideoBody
from core.config import get_settings

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
        Optimizes image if needed for Veo compatibility
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

        # Check image size and optimize if needed
        max_size = 5 * 1024 * 1024  # 5MB max for Veo
        if len(image_bytes) > max_size:
            print(f"⚠️  Image too large ({len(image_bytes)} bytes), optimizing...")

            # Load image with PIL
            img = Image.open(io.BytesIO(image_bytes))

            # Resize if too large (max 1920x1080 for Veo)
            max_dimension = 1920
            if max(img.size) > max_dimension:
                ratio = max_dimension / max(img.size)
                new_size = tuple(int(dim * ratio) for dim in img.size)
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                print(f"✓ Resized image to {new_size}")

            # Convert to RGB if needed (remove alpha channel)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
                print("✓ Converted image to RGB")

            # Re-encode as JPEG with quality adjustment
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            image_bytes = output.getvalue()
            mime_type = "image/jpeg"
            print(f"✓ Optimized image size: {len(image_bytes)} bytes")

        return image_bytes, mime_type

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
            print("🎬 Starting video generation...")

            # Get GenAI client
            client = VideoGenerationService._get_client()
            print(f"✓ GenAI client initialized with model: {MODEL_NAME}")

            # Decode the base64 image
            img_bytes, mime_type = VideoGenerationService._decode_base64_image(body.image_b64)
            print(f"✓ Image decoded: {len(img_bytes)} bytes, type: {mime_type}")

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
            print("✓ Reference image created")

            # Use custom prompt or default
            prompt = body.prompt if body.prompt else DEFAULT_PROMPT
            print(f"✓ Using prompt: {prompt[:100]}...")

            # Generate video
            print("⏳ Calling Veo API to generate video...")
            op = client.models.generate_videos(
                model=MODEL_NAME,
                prompt=prompt,
                config=types.GenerateVideosConfig(
                    reference_images=[ref],
                ),
            )
            print(f"✓ Video generation operation started: {op.name}")

            # Poll until done
            poll_count = 0
            while not op.done:
                poll_count += 1
                print(f"⏳ Polling operation status... (attempt {poll_count})")
                op = client.operations.get(op)
                time.sleep(5)

            print(f"✓ Operation completed after {poll_count} polls")

            # Check for operation error
            if hasattr(op, 'error') and op.error:
                error_msg = f"Veo API error: {op.error}"
                print(f"❌ {error_msg}")
                raise RuntimeError(error_msg)

            # Check if video was generated
            if not op.response:
                print("❌ Operation has no response")
                raise RuntimeError("No response from Veo model - operation may have failed")

            if not hasattr(op.response, "generated_videos"):
                print(f"❌ Response has no 'generated_videos' attribute. Response: {op.response}")
                raise RuntimeError("No 'generated_videos' in response - unexpected response format")

            generated_videos = getattr(op.response, "generated_videos", None)
            if not generated_videos or len(generated_videos) == 0:
                print(f"❌ Generated videos list is empty or None: {generated_videos}")
                raise RuntimeError("No videos in generated_videos list - model may have rejected the request")

            print(f"✓ Video generation successful! Got {len(generated_videos)} video(s)")

            # Download video from Veo
            video_file = generated_videos[0].video
            print(f"⏳ Downloading video file: {video_file.name if hasattr(video_file, 'name') else 'unnamed'}")
            video_bytes = client.files.download(file=video_file)
            print(f"✓ Video downloaded: {len(video_bytes)} bytes")

            # Convert video to base64 for frontend (no disk save needed)
            video_b64 = base64.b64encode(video_bytes).decode('utf-8')
            video_data_url = f"data:video/mp4;base64,{video_b64}"
            print(f"✓ Video converted to base64: {len(video_b64)} chars")

            # Return video data for canvas/UI to render
            # Canvas save will handle storage with content-hash deduplication
            print("✅ Video generation complete!")
            return {
                "success": True,
                "message": "Video generated successfully",
                "video_data": video_data_url,  # Base64 video data for frontend
            }

        except Exception as e:
            print(f"❌ Video generation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Error generating video: {str(e)}")
