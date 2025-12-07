from pydantic import BaseModel, Field
from typing import Optional, List

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


class PlantSearchResponse(BaseModel):
    query: str
    plants: List[str]
    count: int


class PlantDetailsResponse(BaseModel):
    botanical_name: Optional[str]
    plant_type: Optional[str]
    native: Optional[str]
    fauna_attracting: Optional[str]
    height_m: Optional[str]
    spread_m: Optional[str]
    content: str


class DatabaseStatusResponse(BaseModel):
    initialized: bool
    data_file_exists: bool
    db_path: str
    data_path: str
    message: str


class RebuildResponse(BaseModel):
    success: bool
    message: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str