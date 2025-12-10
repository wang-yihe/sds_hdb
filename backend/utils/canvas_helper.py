import base64
import uuid
import mimetypes
import hashlib
from pathlib import Path
from typing import Optional, Dict

from core.config import get_settings

ASSET_STORAGE_ROOT = Path(get_settings().canvas_asset_dir)

def load_url_to_base64(url: str) -> Optional[str]:
    """
    Load a file from disk and convert it back to base64 data URI
    URL format: /canvas-assets/{project_id}/{filename}
    Returns: data:image/png;base64,... or data:video/mp4;base64,...
    """
    try:
        # Parse the URL to get the file path
        if not url.startswith('/canvas-assets/'):
            return None

        # Extract project_id and filename from URL
        # URL format: /canvas-assets/{project_id}/{filename}
        parts = url.split('/')
        if len(parts) < 4:
            return None

        project_id = parts[2]
        filename = parts[3]

        # Build the file path
        file_path = ASSET_STORAGE_ROOT / project_id / filename

        if not file_path.exists():
            print(f"    ⚠️ File not found: {file_path}")
            return None

        # Read the file
        binary_data = file_path.read_bytes()

        # Determine mime type from file extension
        extension = file_path.suffix.lower()
        mime_type_map = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
        }
        mime_type = mime_type_map.get(extension, 'image/png')

        # Encode to base64
        encoded = base64.b64encode(binary_data).decode('utf-8')

        # Return data URI
        return f"data:{mime_type};base64,{encoded}"

    except Exception as e:
        print(f"    ❌ Error loading URL to base64: {str(e)}")
        return None

def save_base64_to_disk(base64_data: str, project_id: str) -> Optional[str]:
    """
    Save base64 data to disk, with deduplication based on content hash.
    If the exact same image already exists, returns the existing URL.
    """
    try:
        if ',' not in base64_data:
            print(f"    ⚠️ No comma in base64 data (length: {len(base64_data)})")
            return None

        header, encoded = base64_data.split(',', 1)

        if ':' not in header or ';' not in header:
            print(f"    ⚠️ Invalid header format: {header[:50]}")
            return None

        mime_type = header.split(';')[0].split(':')[1]

        if '/' not in mime_type:
            print(f"    ⚠️ Invalid mime type: {mime_type}")
            return None

        extension = mime_type.split('/')[1]
        binary_data = base64.b64decode(encoded)

        # Calculate hash of the binary data for deduplication
        content_hash = hashlib.sha256(binary_data).hexdigest()[:16]  # Use first 16 chars of hash

        # Use hash-based filename instead of random UUID
        file_name = f"{content_hash}.{extension}"
        project_asset_dir = ASSET_STORAGE_ROOT / project_id
        project_asset_dir.mkdir(parents=True, exist_ok=True)
        file_path = project_asset_dir / file_name

        # Check if file already exists
        if file_path.exists():
            url = f"/canvas-assets/{project_id}/{file_name}"
            print(f"    ♻️  File already exists (deduplicated) → {url}")
            return url

        # Save new file
        file_path.write_bytes(binary_data)

        url = f"/canvas-assets/{project_id}/{file_name}"
        print(f"    💾 Saved {len(binary_data)} bytes → {url}")
        return url

    except Exception as e:
        print(f"    ❌ Error saving base64: {str(e)}")
        return None

def is_base64_string(s: str) -> bool:
    """Check if a string is a base64 encoded media file (image/video with or without data URI prefix)"""
    if not isinstance(s, str) or len(s) < 50:  # Base64 media files are typically much longer
        return False

    # Check if it has data URI prefix for image or video
    if s.startswith('data:image/') or s.startswith('data:video/'):
        return True

    # Check if it looks like raw base64 (only contains base64 characters)
    # This catches cases like generatedImage which is stored without the data: prefix
    # Use a heuristic: if string is long and contains only base64 chars, treat as base64
    import re
    base64_pattern = re.compile(r'^[A-Za-z0-9+/=\n\r]+$')
    return len(s) > 100 and base64_pattern.match(s) is not None

def save_base64_image(image_data: str, project_id: str) -> Optional[str]:
    """
    Save a base64 image (with or without data URI prefix) to disk
    Returns URL path or None if failed
    """
    try:
        # If it doesn't have a data URI prefix, add one (assume PNG)
        if not image_data.startswith('data:'):
            image_data = f"data:image/png;base64,{image_data}"

        return save_base64_to_disk(image_data, project_id)
    except Exception:
        return None

def process_shape_base64_props(props: Dict, project_id: str, depth: int = 0) -> Dict:
    """Recursively process shape props to extract and save base64 images"""
    if not isinstance(props, dict):
        return props

    processed_props = {}
    indent = "  " * depth

    for key, value in props.items():
        if isinstance(value, str):
            # Check if this string is a base64 image
            if is_base64_string(value):
                print(f"{indent}  📦 Found base64 in key '{key}': {len(value)} chars")
                new_url = save_base64_image(value, project_id)
                if new_url:
                    print(f"{indent}  ✓ Saved '{key}' → {new_url}")
                    processed_props[key] = new_url
                else:
                    print(f"{indent}  ⚠️ Failed to save '{key}', keeping original")
                    processed_props[key] = value
            else:
                processed_props[key] = value
        elif isinstance(value, list):
            # Process arrays (like plants array with image properties)
            print(f"{indent}  📋 Processing array '{key}' with {len(value)} items")
            processed_list = []
            for idx, item in enumerate(value):
                if isinstance(item, dict):
                    print(f"{indent}    🔍 Item {idx} is dict, recursing...")
                    processed_list.append(process_shape_base64_props(item, project_id, depth + 2))
                elif isinstance(item, str) and is_base64_string(item):
                    print(f"{indent}    📦 Item {idx} is base64: {len(item)} chars")
                    new_url = save_base64_image(item, project_id)
                    if new_url:
                        print(f"{indent}    ✓ Saved item {idx} → {new_url}")
                        processed_list.append(new_url)
                    else:
                        print(f"{indent}    ⚠️ Failed to save item {idx}")
                        processed_list.append(item)
                else:
                    processed_list.append(item)
            processed_props[key] = processed_list
        elif isinstance(value, dict):
            # Recursively process nested objects
            print(f"{indent}  📂 Processing nested dict '{key}'")
            processed_props[key] = process_shape_base64_props(value, project_id, depth + 1)
        else:
            processed_props[key] = value

    return processed_props

def process_and_save_assets(project_id: str, canvas_data: Dict) -> Dict:
    """
    Process canvas data to extract base64 images and save them to disk
    Replaces base64 strings with URL references to reduce document size

    Strategy: Loop through ALL records, process ALL props recursively
    """
    # Canvas data structure: canvas_data -> document -> store
    if 'document' not in canvas_data:
        print("⚠️  No 'document' key in canvas_data")
        return canvas_data

    if 'store' not in canvas_data['document']:
        print("⚠️  No 'store' key in canvas_data['document']")
        return canvas_data

    store = canvas_data['document']['store']
    records_processed = 0

    print(f"\n{'='*60}")
    print(f"🔄 Processing canvas assets for project: {project_id}")
    print(f"📊 Total store records: {len(store)}")
    print(f"{'='*60}\n")

    # Process ALL records - look for props in each one
    for record_id, record in store.items():
        if not isinstance(record, dict):
            continue

        # Check if this record has props
        if 'props' in record:
            props = record['props']
            if isinstance(props, dict) and len(props) > 0:
                print(f"\n🔍 Processing record: {record_id}")
                print(f"   Props keys: {list(props.keys())}")

                # Recursively process all props to find and replace base64 data
                record['props'] = process_shape_base64_props(props, project_id)
                records_processed += 1

    print(f"\n{'='*60}")
    print(f"✅ Processing complete: {records_processed} records with props processed")
    print(f"{'='*60}\n")
    return canvas_data

def restore_base64_props(props: Dict) -> Dict:
    """
    Recursively process props to convert URL references back to base64 data URIs
    This is the reverse of process_shape_base64_props
    """
    if not isinstance(props, dict):
        return props

    restored_props = {}

    for key, value in props.items():
        if isinstance(value, str):
            # Check if this is a URL reference to our stored assets
            if value.startswith('/canvas-assets/'):
                # Convert URL back to base64 data URI
                base64_data = load_url_to_base64(value)
                restored_props[key] = base64_data if base64_data else value
            else:
                restored_props[key] = value
        elif isinstance(value, list):
            # Process arrays
            restored_list = []
            for item in value:
                if isinstance(item, dict):
                    # Recursively process nested objects
                    restored_list.append(restore_base64_props(item))
                elif isinstance(item, str) and item.startswith('/canvas-assets/'):
                    # String in array that is a URL reference
                    base64_data = load_url_to_base64(item)
                    restored_list.append(base64_data if base64_data else item)
                else:
                    restored_list.append(item)
            restored_props[key] = restored_list
        elif isinstance(value, dict):
            # Recursively process nested objects
            restored_props[key] = restore_base64_props(value)
        else:
            restored_props[key] = value

    return restored_props

def restore_canvas_assets(canvas_data: Dict) -> Dict:
    """
    Process canvas data when loading to convert URL references back to base64 data URIs
    This ensures TLDraw receives data in the format it expects
    """
    # Canvas data structure: canvas_data -> document -> store
    if 'document' not in canvas_data:
        return canvas_data

    if 'store' not in canvas_data['document']:
        return canvas_data

    store = canvas_data['document']['store']

    print(f"\n{'='*60}")
    print(f"🔄 Restoring canvas assets to base64 format")
    print(f"📊 Total store records: {len(store)}")
    print(f"{'='*60}\n")

    # Process ALL records - look for props with URL references
    for record_id, record in store.items():
        if not isinstance(record, dict):
            continue

        # Check if this record has props
        if 'props' in record:
            props = record['props']
            if isinstance(props, dict) and len(props) > 0:
                # Recursively restore all URL references back to base64
                record['props'] = restore_base64_props(props)

    print(f"✅ Restoration complete\n")
    return canvas_data