import os, base64, requests, sys
from typing import Optional
from dotenv import load_dotenv

# Load .env from this backend folder explicitly
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def _get_headers():
    api_key = os.getenv("OPENAI_API_KEY")
    org = os.getenv("OPENAI_ORG")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Create a key at https://platform.openai.com/ "
            "and put it in backend/.env (OPENAI_API_KEY=sk-...) or export it in your shell."
        )
    headers = {"Authorization": f"Bearer {api_key}"}
    if org:
        headers["OpenAI-Organization"] = org
    return headers

def _raise_with_body(resp: requests.Response):
    try:
        body = resp.text
    except Exception:
        body = "<no body>"
    msg = f"{resp.status_code} {resp.reason}: {body}"
    print(f"[OpenAI API ERROR] {msg}", file=sys.stderr)
    resp.raise_for_status()  # will raise HTTPError with status line; body is printed above

def gpt_image_edit(
    image_b64: str,
    prompt: str,
    mask_b64: Optional[str] = None,
    size: str = "1024x1024",
    model: str = "gpt-image-1",
) -> str:
    """
    Calls OpenAI Images Edit API and returns base64 PNG of the edited image.
    Note: mask is a SOFT hint; server will re-composite for hard-mask behavior.
    """
    url = "https://api.openai.com/v1/images/edits"
    headers = _get_headers()

    # First attempt: field name "image" (common)
    files = {
        "image": ("image.png", base64.b64decode(image_b64), "image/png"),
    }
    if mask_b64:
        files["mask"] = ("mask.png", base64.b64decode(mask_b64), "image/png")

    data = {"prompt": prompt, "size": size, "model": model}
    r = requests.post(url, headers=headers, data=data, files=files, timeout=600)
    if not r.ok:
        # Some stacks require 'image[]' instead of 'image' — try once more:
        files_alt = {
            "image[]": ("image.png", base64.b64decode(image_b64), "image/png"),
        }
        if mask_b64:
            files_alt["mask"] = ("mask.png", base64.b64decode(mask_b64), "image/png")
        r2 = requests.post(url, headers=headers, data=data, files=files_alt, timeout=600)
        if not r2.ok:
            _raise_with_body(r2)
        return r2.json()["data"][0]["b64_json"]

    return r.json()["data"][0]["b64_json"]

def gpt_image_generate(
    prompt: str,
    size: str = "1024x1024",
    model: str = "gpt-image-1",
) -> str:
    """
    Pure image generation from text prompt. Returns base64 PNG.
    """
    url = "https://api.openai.com/v1/images/generations"
    headers = _get_headers()
    payload = {"prompt": prompt, "size": size, "model": model}
    r = requests.post(url, headers=headers, json=payload, timeout=600)
    if not r.ok:
        _raise_with_body(r)
    return r.json()["data"][0]["b64_json"]