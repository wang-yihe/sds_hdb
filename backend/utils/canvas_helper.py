import base64
import uuid
from pathlib import Path
from typing import Optional, Dict

from core.config import get_settings

ASSET_STORAGE_ROOT = Path(get_settings().canvas_asset_dir)

def save_base64_to_disk(base64_data: str, project_id: str) -> Optional[str]:
    try:
        if ',' not in base64_data:
            return None
            
        header, encoded = base64_data.split(',', 1)
        
        if ':' not in header or ';' not in header:
            return None
            
        mime_type = header.split(';')[0].split(':')[1]
        
        if '/' not in mime_type:
            return None
            
        extension = mime_type.split('/')[1]
        binary_data = base64.b64decode(encoded)

        file_name = f"{uuid.uuid4().hex}.{extension}"
        project_asset_dir = ASSET_STORAGE_ROOT / project_id
        project_asset_dir.mkdir(parents=True, exist_ok=True)
        file_path = project_asset_dir / file_name

        file_path.write_bytes(binary_data)
        
        return f"/canvas-assets/{project_id}/{file_name}"
        
    except Exception:
        return None

def process_and_save_assets(project_id: str, canvas_data: Dict) -> Dict:
    if 'store' not in canvas_data:
        return canvas_data

    store = canvas_data['store']
    
    # Iterate through all records in the store
    for record_id, record in store.items():
        # Check if this is an asset record
        if record_id.startswith('asset:') and record.get('type') in ('image', 'video'):
            props = record.get('props', {})
            src = props.get('src', '')
            
            # If src is base64, save to disk and replace with URL
            if src and src.startswith('data:'):
                new_url = save_base64_to_disk(src, project_id)
                if new_url:
                    record['props']['src'] = new_url
                    
    return canvas_data