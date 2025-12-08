from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional
import logging

from controllers.rag_controller import rag_controller
from core.config import get_settings
from schemas.rag_schema import (
    PlantSearchResponse,
    PlantDetailsResponse,
    DatabaseStatusResponse,
    RebuildResponse,
    HealthResponse
)
# Setup logging
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Create router
app = APIRouter()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================
class PlantSearchRequest(BaseModel):
    query: str = Field(
        ..., 
        description="Natural language search query",
        examples=[
            "tall trees for shade",
            "butterfly-attracting plants",
            "groundcovers for full sun",
            "native species with red flowers"
        ]
    )
    max_results: Optional[int] = Field(
        default=None,  # Will use settings.rag_max_results if None
        ge=1,
        le=50,
        description="Maximum number of results to return"
    )

@app.on_event("startup")
async def startup_event():
    """Initialize ChromaDB on application startup"""
    try:
        logger.info("RAG router startup: initializing database...")
        result = await rag_controller.initialize_database()
        if result["success"]:
            logger.info("RAG database initialization complete")
        else:
            logger.error(f"RAG database initialization failed: {result['message']}")
    except Exception as e:
        logger.error(f"Failed to initialize RAG on startup: {e}")


# =============================================================================
# ENDPOINTS
# =============================================================================
@app.post("/search", response_model=PlantSearchResponse)
async def search_plants(request: PlantSearchRequest):
    """
    Search for plants using natural language queries.
    
    This endpoint uses semantic search and LLM-powered recommendations to find
    plants matching your description.
    
    **Example queries:**
    - "tall trees for shade"
    - "butterfly-attracting plants" 
    - "groundcovers suitable for full sun"
    - "native species with red flowers"
    - "fast-growing plants for privacy screening"
    
    **Returns:**
    - List of botanical names matching the query
    - Empty list if no matches found
    """
    result = await rag_controller.search_plants(
        query=request.query,
        max_results=request.max_results
    )
    return PlantSearchResponse(**result)


@app.post("/search-with-images")
async def search_plants_with_images(request: PlantSearchRequest):
    """
    Search for plants and return botanical names with generated images.
    
    This endpoint:
    1. Searches for plants matching your query
    2. For each plant, checks if an image exists or generates a new one
    3. Returns botanical name + base64 PNG image
    
    **Example queries:**
    - "tall trees for shade"
    - "butterfly-attracting plants" 
    - "groundcovers suitable for full sun"
    
    **Returns:**
    - List of objects with botanical_name and image (base64 PNG)
    - Limit to max 5 results recommended due to image generation cost
    """
    result = await rag_controller.search_plants_with_images(
        query=request.query,
        max_results=request.max_results or 5  # Default to 5 for image searches
    )
    return result


@app.get("/plant/{botanical_name}", response_model=PlantDetailsResponse)
async def get_plant_details(botanical_name: str):
    """
    Get detailed information about a specific plant.
    
    **Parameters:**
    - botanical_name: Exact or partial botanical name (e.g., "Ficus benjamina")
    
    **Returns:**
    - Detailed plant information including metadata and full description
    """
    details = await rag_controller.get_plant_details(botanical_name)
    return PlantDetailsResponse(**details)


@app.get("/status", response_model=DatabaseStatusResponse)
async def check_database_status():
    """
    Check if the ChromaDB database is initialized and ready.
    
    **Returns:**
    - Initialization status and message
    - Database and data file paths
    """
    status = await rag_controller.check_database_status()
    return DatabaseStatusResponse(**status)


@app.post("/rebuild", response_model=RebuildResponse)
async def rebuild_database(background_tasks: BackgroundTasks):
    """
    Rebuild the ChromaDB database from the Excel data file.
    
    **Warning:** This will delete and recreate the entire vector database.
    Use this endpoint if:
    - The database is corrupted
    - The source Excel file has been updated
    - You need to reinitialize the database
    
    The rebuild happens in the background.
    
    **Returns:**
    - Success status and message
    """
    # Start rebuild in background
    background_tasks.add_task(rag_controller.rebuild_database_async)
    
    logger.info("Database rebuild started in background")
    
    return RebuildResponse(
        success=True,
        message="Database rebuild started in background. This may take a few minutes."
    )


@app.get("/examples")
async def get_example_queries():

    return await rag_controller.get_example_queries()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    health = await rag_controller.health_check()
    return HealthResponse(**health)


@app.post("/test")
async def run_test_queries():
    return await rag_controller.run_test_queries()