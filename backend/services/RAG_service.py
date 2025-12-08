import os
import base64
from pathlib import Path
from typing import List, Optional, Dict
import pandas as pd
from openai import OpenAI

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings

from core.config import get_settings

settings = get_settings()

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / settings.rag_db_path
DATA_PATH = ROOT / settings.rag_data_path
IMAGES_DIR = ROOT / "storage" / "generated_plants"  # Store generated plant images

# Ensure images directory exists
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Initialize models (lazy loading)
_chat_model = None
_embedding_model = None
_openai_client = None


def get_chat_model():
    """Lazy load Gemini chat model"""
    global _chat_model
    if _chat_model is None:
        api_key = get_settings().google_api_key
        if not api_key:
            raise ValueError(
                "GOOGLE_API_KEY not found. Set it in .env file or environment variables."
            )
        _chat_model = ChatGoogleGenerativeAI(
            model=settings.rag_chat_model,
            google_api_key=api_key,
        )
    return _chat_model


def get_embedding_model():
    """Lazy load embedding model"""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = HuggingFaceEmbeddings(
            model_name=settings.rag_embedding_model
        )
    return _embedding_model


def get_openai_client():
    """Lazy load OpenAI client for image generation"""
    global _openai_client
    if _openai_client is None:
        api_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY not found. Set it in .env file or environment variables."
            )
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


# =============================================================================
# DOCUMENT BUILDING
# =============================================================================
def build_doc_from_row(row: pd.Series) -> Document:
    """Convert one Excel row into a LangChain Document for embedding."""
    
    def g(col_name: str) -> str:
        """Safe getter: NaN -> empty string, strip spaces"""
        return str(row.get(col_name, "") or "").strip()

    # Extract all fields
    number = g("Number")
    botanical = g("Botanical Name")
    plant_type = g("Plant Type")
    habit = g("Habit")
    crownshaft = g("Crownshaft")
    trunk = g("Trunk / Stem")
    leaves = g("Leaves")
    height_m = g("Height (m)")
    spread_m = g("Spread (m)")
    girth_m = g("Girth (m)")
    planting_area = g("Planting  Area")
    flowers = g("Flowers")
    fruits = g("Fruits")
    native = g("Native")
    fauna = g("Fauna Attracting")
    features_remarks = g("Distinctive Features / Remarks")
    appearance_summary = g("Appearance Summary")

    # Build structured content for embedding
    page_content = f"""
Number: {number}
Botanical Name: {botanical}
Plant Type: {plant_type}

Habit / Form: {habit}
Crownshaft: {crownshaft}
Trunk / Stem: {trunk}
Leaves: {leaves}

Height (m): {height_m}  |  Spread (m): {spread_m}  |  Girth (m): {girth_m}
Planting Area: {planting_area}

Flowers: {flowers}
Fruits: {fruits}

Native: {native}
Fauna Attracting: {fauna}
Distinctive Features / Remarks: {features_remarks}

Summary: {appearance_summary}
""".strip()

    # Metadata for filtering/display
    metadata = {
        "number": number,
        "botanical_name": botanical,
        "plant_type": plant_type,
        "native": native,
        "fauna_attracting": fauna,
        "height_m": height_m,
        "spread_m": spread_m,
    }

    return Document(page_content=page_content, metadata=metadata)


# =============================================================================
# VECTOR DB INITIALIZATION
# =============================================================================
def init_chroma(force_rebuild: bool = False) -> bool:
    """Initialize ChromaDB from Excel file."""
    # Check if DB already exists
    if not force_rebuild and DB_PATH.exists() and any(DB_PATH.iterdir()):
        print("[ChromaDB] Database already exists, skipping rebuild")
        return False

    # Check if data file exists
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Data file not found: {DATA_PATH}")

    print(f"[ChromaDB] Building database from {DATA_PATH}")
    
    # Load Excel
    df = pd.read_excel(DATA_PATH)
    df.columns = [str(c).strip() for c in df.columns]
    df = df.fillna("")

    # Convert rows to documents
    documents = []
    for _, row in df.iterrows():
        doc = build_doc_from_row(row)
        if doc.page_content.strip():
            documents.append(doc)

    print(f"[ChromaDB] Loaded {len(documents)} plant documents")

    # Create vector store
    Chroma.from_documents(
        documents=documents,
        embedding=get_embedding_model(),
        persist_directory=str(DB_PATH),
    )
    
    print(f"[ChromaDB] Database created at {DB_PATH}")
    return True


def get_retriever(k: int | None = None):
    """Get ChromaDB retriever for semantic search."""
    if k is None:
        k = settings.rag_retrieval_k
        
    vs = Chroma(
        persist_directory=str(DB_PATH),
        embedding_function=get_embedding_model(),
    )
    return vs.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": k,
            "fetch_k": settings.rag_fetch_k,
            "lambda_mult": settings.rag_lambda_mult,
        },
    )


# =============================================================================
# RAG CHAIN
# =============================================================================
def format_docs(docs) -> str:
    """Format retrieved documents for LLM context"""
    chunks = []
    for i, d in enumerate(docs, start=1):
        meta = d.metadata or {}
        botanical = meta.get("botanical_name", "Unknown botanical name")
        plant_type = meta.get("plant_type", "")
        
        header = f"[{i}] {botanical}"
        if plant_type:
            header += f" – {plant_type}"
        
        chunks.append(f"{header}\n{d.page_content}")
    
    return "\n\n---\n\n".join(chunks)


SYSTEM_MESSAGE = SystemMessage(
    content=(
        "You are a plant selection assistant. "
        "You are given contextual entries from a plant database. "
        "Use ONLY the information in the context to answer. "
        "Your entire response MUST follow these strict rules:\n"
        "1. Output ONLY botanical species names.\n"
        "2. One species per line.\n"
        "3. No bullets, no numbering, no descriptions, no extra words.\n"
        "4. Do NOT include plant type or comments.\n"
        "5. If the context does not contain any suitable plants, output exactly: NO_MATCH"
    )
)

HUMAN_TEMPLATE = HumanMessagePromptTemplate.from_template(
    "Question:\n{question}\n\n"
    "Plant database context:\n{context}\n\n"
    "Using ONLY the context above, return ONLY the botanical names of the plants that match.\n"
    "One name per line.\n"
    "If none match, output NO_MATCH."
)

CHAT_TEMPLATE = ChatPromptTemplate.from_messages([
    SYSTEM_MESSAGE,
    HUMAN_TEMPLATE,
])


def make_rag_chain(k: int | None = None):
    """Create RAG chain: retriever -> prompt -> LLM -> parser"""
    if k is None:
        k = settings.rag_retrieval_k
        
    retriever = get_retriever(k=k)
    output_parser = StrOutputParser()
    
    return (
        {
            "context": lambda q: format_docs(retriever.invoke(q)),
            "question": RunnablePassthrough(),
        }
        | CHAT_TEMPLATE
        | get_chat_model()
        | output_parser
    )


# =============================================================================
# IMAGE GENERATION
# =============================================================================
def get_image_path(botanical_name: str) -> Path:
    """Get the path where a plant image would be stored"""
    safe_name = botanical_name.replace(" ", "_").replace("/", "-")
    return IMAGES_DIR / f"{safe_name}.png"


def check_existing_image(botanical_name: str) -> Optional[str]:
    """Check if an image already exists for this plant, return base64 if found"""
    image_path = get_image_path(botanical_name)
    
    if image_path.exists():
        with open(image_path, "rb") as f:
            img_bytes = f.read()
            return base64.b64encode(img_bytes).decode('utf-8')
    
    return None


def build_image_prompt(botanical_name: str) -> str:
    """Build prompt for OpenAI image generation"""
    return (
        f"Generate a realistic, botanically accurate image of the species '{botanical_name}'. "
        f"Show a full-grown mature tree with full canopy, trunk, branching structure, "
        f"correct leaf arrangement, bark details, and accurate proportions. "
        f"Isolate the tree on a completely transparent background suitable for a PNG file. "
        f"No shadows, no floor, no gradients, no sky, no textures around the tree. "
        f"Produce a clean silhouette with no artifacts."
    )


def generate_plant_image(botanical_name: str, size: int = 1024) -> str:
    """
    Generate a plant image using OpenAI, or return existing one.
    Returns base64 encoded PNG image.
    """
    # Check if image already exists
    existing_image = check_existing_image(botanical_name)
    if existing_image:
        print(f"[Image] Using existing image for {botanical_name}")
        return existing_image
    
    print(f"[Image] Generating new image for {botanical_name}")
    
    # Generate new image
    client = get_openai_client()
    prompt = build_image_prompt(botanical_name)
    
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size="1024x1024",  # Fixed to literal string
        n=1,
    )
    
    # Validate response
    if not response.data or len(response.data) == 0:
        raise ValueError(f"No image data returned for {botanical_name}")
    
    # Get base64 image from response
    b64_image = response.data[0].b64_json
    
    if not b64_image:
        raise ValueError(f"No b64_json in response for {botanical_name}")
    
    # Save to disk for future use
    img_bytes = base64.b64decode(b64_image)
    image_path = get_image_path(botanical_name)
    
    with open(image_path, "wb") as f:
        f.write(img_bytes)
    
    print(f"[Image] Saved image to {image_path}")
    
    return b64_image


# =============================================================================
# PUBLIC API
# =============================================================================
def search_plants(query: str, max_results: int | None = None) -> List[str]:
    """
    Search for plants using natural language query.
    Returns list of botanical names.
    """
    if max_results is None:
        max_results = settings.rag_max_results
        
    # Ensure DB is initialized
    if not DB_PATH.exists() or not any(DB_PATH.iterdir()):
        print("[ChromaDB] Database not found, initializing...")
        init_chroma()
    
    # Run RAG chain
    rag_chain = make_rag_chain(k=max_results)
    result = rag_chain.invoke(query)
    
    # Parse response
    if result.strip() == "NO_MATCH":
        return []
    
    # Split by newlines and clean
    plants = [line.strip() for line in result.split('\n') if line.strip()]
    
    # Limit results
    return plants[:max_results]


def search_plants_with_images(query: str, max_results: int | None = None) -> List[Dict]:
    """
    Search for plants and return botanical name + image for each.
    
    Returns:
        List of dicts with 'botanical_name' and 'image' (base64 PNG)
    """
    if max_results is None:
        max_results = settings.rag_max_results
    
    # Get plant names from search
    plant_names = search_plants(query, max_results)
    
    # Get/generate image for each plant
    results = []
    for botanical_name in plant_names:
        try:
            image = generate_plant_image(botanical_name)
            results.append({
                "botanical_name": botanical_name,
                "image": image  # base64 PNG
            })
        except Exception as e:
            print(f"[Error] Failed to get image for {botanical_name}: {e}")
            # Still include the plant but with no image
            results.append({
                "botanical_name": botanical_name,
                "image": None
            })
    
    return results


def get_plant_details(botanical_name: str) -> Optional[dict]:
    """Get detailed information about a specific plant from the vector store."""
    retriever = get_retriever(k=1)
    
    # Search for exact match
    results = retriever.invoke(botanical_name)
    
    if not results:
        return None
    
    doc = results[0]
    return {
        "botanical_name": doc.metadata.get("botanical_name"),
        "plant_type": doc.metadata.get("plant_type"),
        "native": doc.metadata.get("native"),
        "fauna_attracting": doc.metadata.get("fauna_attracting"),
        "height_m": doc.metadata.get("height_m"),
        "spread_m": doc.metadata.get("spread_m"),
        "content": doc.page_content,
    }


def rebuild_database() -> dict:
    """Force rebuild the ChromaDB database."""
    try:
        init_chroma(force_rebuild=True)
        return {"success": True, "message": "Database rebuilt successfully"}
    except Exception as e:
        return {"success": False, "message": str(e)}


# =============================================================================
# TESTING
# =============================================================================
if __name__ == "__main__":
    # Initialize DB
    print("Initializing ChromaDB...")
    init_chroma()
    
    # Test search with images
    query = "tall trees for shade"
    print(f"\nSearching: {query}")
    results = search_plants_with_images(query, max_results=3)
    
    print(f"\nFound {len(results)} plants:")
    for plant in results:
        print(f"  - {plant['botanical_name']}")
        print(f"    Image: {'✓' if plant['image'] else '✗'}")