import time
import base64
from PIL import Image
import io
from google import genai
from google.genai import types
from openai import OpenAI
from schemas.video_generation_schema import GenerateVideoBody
from core.config import get_settings

# Prompt for generating juvenile version of plants
JUVENILE_PROMPT = (
    "Transform all existing plants in this image into juvenile versions of the same species. "
    "Reduce their height, leaf count, stem thickness, and canopy volume, but keep every plant "
    "in the exact same location and orientation. Do NOT add new plants, remove plants, or change species. "
    "Preserve all non-plant pixels exactly: buildings, hardscape, ground textures, paths, sky, lighting, shadows, "
    "and color tones must stay unchanged. Do not alter the camera angle or perspective. "
    "Only modify the plants so they appear younger and smaller, matching realistic early-growth morphology."
)

# Prompt for Veo growth animation (juvenile → mature)
VEO_GROWTH_PROMPT = (
    "Create a SHORT video of approximately 6 seconds (around 144 frames at 24 fps). "
    "START exactly from the provided seed image (frame 0). "
    "END by matching the visual appearance of the provided reference image (final frame). "
    "Do NOT move the camera: no zoom, pan, tilt, rotation, parallax, or reframing. "
    "The ONLY change should be the plants gradually morphing from juvenile → mature. "
    "All non-plant pixels must remain unchanged and stable throughout. "
    "Do NOT exceed the requested length; keep the output concise and controlled."
)

MODEL_NAME = get_settings().video_generation_model
MAX_WAIT_SEC = 120  # Timeout to prevent runaway costs

class VideoGenerationService:

    @staticmethod
    def _get_genai_client():
        """Initialize and return the Google GenAI client"""
        api_key = get_settings().google_api_key
        if not api_key:
            raise RuntimeError("Missing GOOGLE_API_KEY in environment variables")
        return genai.Client(api_key=api_key)

    @staticmethod
    def _get_openai_client():
        """Initialize and return the OpenAI client"""
        api_key = get_settings().OPENAI_API_KEY
        if not api_key:
            raise RuntimeError("Missing OPENAI_API_KEY in environment variables")
        return OpenAI(api_key=api_key)

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
                img = img.resize(new_size, Image.Resampling.LANCZOS) #type: ignore
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
    def _generate_juvenile_image(mature_image_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
        """
        Generate a juvenile version of the mature landscape image using OpenAI image edit.

        Args:
            mature_image_bytes: The mature image as bytes
            mime_type: MIME type of the image

        Returns:
            tuple of (juvenile_image_bytes, mime_type)
        """
        print("🌱 Generating juvenile version of plants...")

        # OpenAI requires PNG for image editing
        # Convert to PNG if needed
        if mime_type != "image/png":
            img = Image.open(io.BytesIO(mature_image_bytes))
            png_buffer = io.BytesIO()
            img.save(png_buffer, format='PNG')
            mature_image_bytes = png_buffer.getvalue()
            mime_type = "image/png"

        # Save to temp file (OpenAI client requires file-like object)
        temp_img = io.BytesIO(mature_image_bytes)
        temp_img.name = "mature_landscape.png"

        # Call OpenAI image edit
        client = VideoGenerationService._get_openai_client()

        response = client.images.edit(
            model="gpt-image-1",
            image=temp_img,
            prompt=JUVENILE_PROMPT,
            size="1024x1024",
            n=1
        )

        # Get the juvenile image
        if not response.data or len(response.data) == 0:
            raise RuntimeError("No juvenile image returned from OpenAI")

        juvenile_b64 = response.data[0].b64_json
        if not juvenile_b64:
            raise RuntimeError("No b64_json in OpenAI response")

        juvenile_bytes = base64.b64decode(juvenile_b64)
        print(f"✓ Juvenile image generated: {len(juvenile_bytes)} bytes")

        return juvenile_bytes, "image/png"

    @staticmethod
    async def generate_video_from_image(body: GenerateVideoBody):
        """
        Generate a growth animation video (juvenile → mature) using Google's Veo model.

        Process:
        1. Generate juvenile version using OpenAI image edit
        2. Use Veo with juvenile as seed frame and mature as target frame
        3. Veo creates smooth growth animation

        Args:
            body: GenerateVideoBody containing image_b64 (mature landscape) and optional prompt

        Returns:
            dict with success status and video data (base64)
        """
        try:
            print("🎬 Starting juvenile → mature growth video generation...")

            # STEP 1: Decode the mature image
            mature_bytes, mature_mime = VideoGenerationService._decode_base64_image(body.image_b64)
            print(f"✓ Mature image decoded: {len(mature_bytes)} bytes, type: {mature_mime}")

            # STEP 2: Generate juvenile version
            juvenile_bytes, juvenile_mime = VideoGenerationService._generate_juvenile_image(
                mature_bytes, mature_mime
            )

            # STEP 3: Create Veo images
            # Seed image (first frame): juvenile
            juvenile_image = types.Image(
                image_bytes=juvenile_bytes,
                mime_type=juvenile_mime,
            )
            print("✓ Juvenile seed image created")

            # Last frame (target): mature
            mature_image = types.Image(
                image_bytes=mature_bytes,
                mime_type=mature_mime,
            )
            print("✓ Mature target image created")

            # STEP 4: Generate growth video with Veo
            client = VideoGenerationService._get_genai_client()
            print(f"✓ GenAI client initialized with model: {MODEL_NAME}")

            # Use custom prompt or default growth prompt
            prompt = body.prompt if body.prompt else VEO_GROWTH_PROMPT
            print(f"✓ Using prompt: {prompt[:100]}...")

            print("⏳ Calling Veo API to generate growth video (juvenile → mature)...")
            op = client.models.generate_videos(
                model=MODEL_NAME,
                prompt=prompt,
                image=juvenile_image,  # START FRAME (seed)
                config=types.GenerateVideosConfig(
                    last_frame=mature_image  # END FRAME (target) - guides toward mature state
                ),
            )
            print(f"✓ Video generation operation started: {op.name}")

            # Poll until done, with timeout protection
            poll_count = 0
            start_time = time.time()
            while not op.done and (time.time() - start_time < MAX_WAIT_SEC):
                poll_count += 1
                print(f"⏳ Polling operation status... (attempt {poll_count})")
                op = client.operations.get(op)
                time.sleep(5)

            # Check for timeout
            if not op.done:
                print("⚠️ Timeout hit — cancelling job to protect cost budget.")
                try:
                    client.operations.cancel(op) #type: ignore
                except Exception:
                    pass
                raise RuntimeError("Veo generation cancelled after timeout to prevent runaway costs")

            print(f"✓ Operation completed after {poll_count} polls ({time.time() - start_time:.1f}s)")

            # STEP 5: Validate and download video
            # Check for operation error
            if hasattr(op, 'error') and op.error:
                error_msg = f"Veo API error: {op.error}"
                print(f"❌ {error_msg}")
                raise RuntimeError(error_msg)

            # Check if video was generated
            if not op.response or not hasattr(op.response, "generated_videos"):
                print("❌ No video in response")
                raise RuntimeError("No response from Veo model - operation may have failed")

            generated_videos = getattr(op.response, "generated_videos", None)
            if not generated_videos or len(generated_videos) == 0:
                print("❌ Generated videos list is empty")
                raise RuntimeError("No videos in generated_videos list - model may have rejected the request")

            print(f"✓ Video generation successful! Got {len(generated_videos)} video(s)")

            # Download video
            video_file = generated_videos[0].video
            print(f"⏳ Downloading video file...")
            video_bytes = client.files.download(file=video_file)
            print(f"✓ Video downloaded: {len(video_bytes)} bytes")

            # Convert video to base64 for frontend
            video_b64 = base64.b64encode(video_bytes).decode('utf-8')
            video_data_url = f"data:video/mp4;base64,{video_b64}"
            print(f"✓ Video converted to base64: {len(video_b64)} chars")

            print("✅ Growth video generation complete!")
            return {
                "success": True,
                "message": "Growth video generated successfully (juvenile → mature)",
                "video_data": video_data_url,  # Base64 video data for frontend
            }

        except Exception as e:
            print(f"❌ Video generation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Error generating video: {str(e)}")
