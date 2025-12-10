from typing import Optional, Dict, Any
import logging
from fastapi import HTTPException

from services.RAG_service import (
    search_plants as service_search_plants,
    search_plants_with_images as service_search_plants_with_images,
    get_plant_details as service_get_plant_details,
    rebuild_database as service_rebuild_database,
    init_chroma,
    DB_PATH,
    DATA_PATH,
)
from core.config import get_settings

# Setup logging
logger = logging.getLogger(__name__)
settings = get_settings()


# =============================================================================
# CONTROLLER FUNCTIONS
# =============================================================================

class RAGController:
    """Controller for RAG plant search operations"""
    
    @staticmethod
    async def search_plants(query: str, max_results: Optional[int] = None) -> Dict[str, Any]:
        """
        Search for plants using natural language query.
        
        Args:
            query: Natural language search query
            max_results: Maximum number of results (uses config default if None)
            
        Returns:
            Dictionary with query, plants list, and count
            
        Raises:
            HTTPException: If search fails
        """
        try:
            logger.info(f"Processing plant search: '{query}' (max_results={max_results})")
            
            # Validate query
            if not query or not query.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Query cannot be empty"
                )
            
            # Use service to search
            plants = service_search_plants(
                query=query.strip(),
                max_results=max_results
            )
            
            logger.info(f"Search returned {len(plants)} results")
            
            return {
                "query": query,
                "plants": plants,
                "count": len(plants)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Plant search failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Plant search failed: {str(e)}"
            )
    
    @staticmethod
    async def search_plants_with_images(query: str, max_results: Optional[int] = None) -> Dict[str, Any]:
        """
        Search for plants and return botanical name + image for each.
        
        Args:
            query: Natural language search query
            max_results: Maximum number of results (uses config default if None)
            
        Returns:
            Dictionary with query, plants (with images), and count
            
        Raises:
            HTTPException: If search fails
        """
        try:
            logger.info(f"Processing plant search with images: '{query}' (max_results={max_results})")
            
            # Validate query
            if not query or not query.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Query cannot be empty"
                )
            
            # Use service to search with images
            plants = service_search_plants_with_images(
                query=query.strip(),
                max_results=max_results
            )
            
            logger.info(f"Search returned {len(plants)} results with images")
            
            return {
                "query": query,
                "plants": plants,  # List of {botanical_name, image}
                "count": len(plants)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Plant search with images failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Plant search with images failed: {str(e)}"
            )
    
    @staticmethod
    async def get_plant_details(botanical_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific plant.
        
        Args:
            botanical_name: Botanical name of the plant
            
        Returns:
            Dictionary with plant details
            
        Raises:
            HTTPException: If plant not found or retrieval fails
        """
        try:
            logger.info(f"Retrieving plant details: '{botanical_name}'")
            
            # Validate input
            if not botanical_name or not botanical_name.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Botanical name cannot be empty"
                )
            
            # Get details from service
            details = service_get_plant_details(botanical_name.strip())
            
            if details is None:
                logger.warning(f"Plant not found: '{botanical_name}'")
                raise HTTPException(
                    status_code=404,
                    detail=f"Plant not found: {botanical_name}"
                )
            
            logger.info(f"Successfully retrieved details for '{botanical_name}'")
            return details
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get plant details: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve plant details: {str(e)}"
            )
    
    @staticmethod
    async def check_database_status() -> Dict[str, Any]:
        """
        Check if the ChromaDB database is initialized and ready.
        
        Returns:
            Dictionary with initialization status and message
        """
        try:
            logger.info("Checking database status")
            
            # Check if database exists and has content
            initialized = DB_PATH.exists() and any(DB_PATH.iterdir())
            
            # Check if data file exists
            data_exists = DATA_PATH.exists()
            
            # Build status message
            if initialized:
                message = f"ChromaDB is initialized at {DB_PATH.relative_to(DB_PATH.parent.parent)}"
                if not data_exists:
                    message += f" (Warning: Source data file not found at {DATA_PATH.relative_to(DB_PATH.parent.parent)})"
            else:
                message = "ChromaDB is not initialized."
                if not data_exists:
                    message += f" Source data file not found at {DATA_PATH.relative_to(DB_PATH.parent.parent)}."
                else:
                    message += " Run POST /api/rag/rebuild to initialize."
            
            status = {
                "initialized": initialized,
                "data_file_exists": data_exists,
                "db_path": str(DB_PATH.relative_to(DB_PATH.parent.parent)),
                "data_path": str(DATA_PATH.relative_to(DB_PATH.parent.parent)),
                "message": message
            }
            
            logger.info(f"Database status: initialized={initialized}, data_exists={data_exists}")
            return status
            
        except Exception as e:
            logger.error(f"Status check failed: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Status check failed: {str(e)}"
            )
    
    @staticmethod
    async def rebuild_database_async() -> Dict[str, Any]:
        """
        Rebuild the ChromaDB database (synchronous version for background task).
        
        Returns:
            Dictionary with success status and message
        """
        try:
            logger.info("Starting database rebuild")
            result = service_rebuild_database()
            logger.info(f"Database rebuild completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Database rebuild failed: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Database rebuild failed: {str(e)}"
            }
    
    @staticmethod
    async def initialize_database() -> Dict[str, Any]:
        """
        Initialize the database on startup if needed.
        
        Returns:
            Dictionary with initialization status
        """
        try:
            logger.info("Initializing ChromaDB on startup")
            init_chroma()
            
            return {
                "success": True,
                "message": "Database initialization complete"
            }
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Database initialization failed: {str(e)}"
            }
    
    @staticmethod
    async def get_example_queries() -> Dict[str, Any]:
        """
        Get example search queries organized by category.
        
        Returns:
            Dictionary with categorized example queries
        """
        examples = {
            "shade_plants": [
                "plants that grow well in shade",
                "shade-tolerant groundcovers",
                "trees for shaded areas",
                "species that thrive in low light"
            ],
            "wildlife": [
                "plants that attract butterflies",
                "bird-attracting trees",
                "fauna-friendly native species",
                "flowers that attract bees"
            ],
            "landscape_function": [
                "tall trees for privacy screening",
                "fast-growing hedge plants",
                "erosion control groundcovers",
                "plants for slope stabilization",
                "windbreak species"
            ],
            "aesthetic": [
                "plants with red flowers",
                "trees with colorful foliage",
                "ornamental species for focal points",
                "plants with interesting bark texture"
            ],
            "maintenance": [
                "low-maintenance native plants",
                "drought-tolerant species",
                "plants that require little pruning",
                "hardy plants for urban environments"
            ],
            "size": [
                "small trees under 5 meters",
                "compact shrubs for small gardens",
                "tall canopy trees over 15 meters",
                "medium-sized trees for residential areas"
            ],
            "native": [
                "native Singapore species",
                "indigenous trees suitable for urban planting",
                "native plants that attract local wildlife"
            ]
        }
        
        return {
            "categories": examples,
            "total_examples": sum(len(v) for v in examples.values()),
            "category_count": len(examples)
        }
    
    @staticmethod
    async def run_test_queries() -> Dict[str, Any]:
        """
        Run a series of test queries to verify the RAG system.
        
        Returns:
            Dictionary with test results
        """
        test_queries = [
            "shade-loving groundcovers",
            "plants that attract butterflies",
            "tall fast-growing trees",
            "native species with red flowers",
            "drought-tolerant plants",
            "small trees for urban gardens"
        ]
        
        results = {}
        success_count = 0
        
        for query in test_queries:
            try:
                logger.info(f"Running test query: '{query}'")
                plants = service_search_plants(query, max_results=5)
                results[query] = {
                    "success": True,
                    "count": len(plants),
                    "plants": plants
                }
                success_count += 1
                
            except Exception as e:
                logger.error(f"Test query failed for '{query}': {e}")
                results[query] = {
                    "success": False,
                    "error": str(e)
                }
        
        return {
            "total_queries": len(test_queries),
            "successful": success_count,
            "failed": len(test_queries) - success_count,
            "results": results
        }
    
    @staticmethod
    async def health_check() -> Dict[str, str]:
        """
        Simple health check.
        
        Returns:
            Dictionary with health status
        """
        return {
            "status": "healthy",
            "service": "RAG Plant Search",
            "version": settings.api_version
        }
        
rag_controller = RAGController()