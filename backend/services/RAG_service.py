"""
RAG Service for Plant Database
Handles ChromaDB vector store, semantic search, and LLM-powered plant recommendations
"""

import os
from pathlib import Path
from typing import List, Optional
import pandas as pd
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings

from core.config import get_settings

# =============================================================================
# CONFIGURATION
# =============================================================================
settings = get_settings()

ROOT = Path(__file__).parent.parent
DB_PATH = ROOT / settings.rag_db_path
DATA_PATH = ROOT / settings.rag_data_path

# Initialize models (lazy loading handled by functions)
_chat_model = None
_embedding_model = None


def get_chat_model():
    """Lazy load chat model"""
    global _chat_model
    if _chat_model is None:
        api_key = settings.google_api_key or os.environ.get("GOOGLE_API_KEY")
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


# =============================================================================
# DOCUMENT BUILDING
# =============================================================================
def build_doc_from_row(row: pd.Series) -> Document:
    """
    Convert one Excel row into a LangChain Document for embedding.
    
    Expected columns in Excel:
      Number, Botanical Name, Plant Type, Habit, Crownshaft, Trunk / Stem, 
      Leaves, Height (m), Spread (m), Girth (m), Planting Area, Flowers, 
      Fruits, Native, Fauna Attracting, Distinctive Features / Remarks, 
      Appearance Summary
    """
    
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
    planting_area = g("Planting  Area")  # note: two spaces in Excel
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
    """
    Initialize ChromaDB from Excel file.
    
    Args:
        force_rebuild: If True, rebuild even if DB exists
        
    Returns:
        True if DB was built/rebuilt, False if already existed
    """
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
        if doc.page_content.strip():  # Only add non-empty documents
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
    """
    Get ChromaDB retriever for semantic search.
    
    Args:
        k: Number of results to retrieve (defaults to settings.rag_retrieval_k)
        
    Returns:
        LangChain retriever instance
    """
    if k is None:
        k = settings.rag_retrieval_k
        
    vs = Chroma(
        persist_directory=str(DB_PATH),
        embedding_function=get_embedding_model(),
    )
    return vs.as_retriever(
        search_type="mmr",  # Maximal Marginal Relevance for diversity
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


# System prompt for plant recommendations
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
    """
    Create RAG chain: retriever -> prompt -> LLM -> parser
    
    Args:
        k: Number of documents to retrieve (defaults to settings.rag_retrieval_k)
    """
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
# PUBLIC API
# =============================================================================
def search_plants(query: str, max_results: int | None = None) -> List[str]:
    """
    Search for plants using natural language query.
    
    Args:
        query: Natural language search query
               Examples: "tall trees for shade", "butterfly-attracting plants",
                        "groundcovers for full sun", "native species with red flowers"
        max_results: Maximum number of results to return (defaults to settings.rag_max_results)
        
    Returns:
        List of botanical names matching the query
        Empty list if no matches found
        
    Examples:
        >>> search_plants("shade-loving groundcovers")
        ['Ficus pumila', 'Wedelia trilobata']
        
        >>> search_plants("trees that attract birds")
        ['Syzygium grande', 'Ficus benjamina', ...]
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


def get_plant_details(botanical_name: str) -> Optional[dict]:
    """
    Get detailed information about a specific plant from the vector store.
    
    Args:
        botanical_name: Exact or partial botanical name
        
    Returns:
        Dictionary with plant details or None if not found
    """
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
    """
    Force rebuild the ChromaDB database.
    
    Returns:
        Status dictionary with success/error message
    """
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
    
    # Test queries
    test_queries = [
        "Which groundcovers are suitable for close turfing in full sun?",
        "Which plants attract butterflies?",
        "Which tall and fast-growing plants require little maintenance?",
        "Which plants form dense mats suitable for covering bare soil?",
        "native trees with red flowers",
    ]
    
    for query in test_queries:
        print(f"\n{'='*80}")
        print(f"Q: {query}")
        print(f"{'='*80}")
        results = search_plants(query)
        print(f"Found {len(results)} plants:")
        for plant in results:
            print(f"  - {plant}")