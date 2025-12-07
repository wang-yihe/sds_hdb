from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings for SDS HDB App."""
    # RAG Configuration
    google_api_key: str = ""  # For Gemini LLM
    rag_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    rag_chat_model: str = "gemini-2.5-flash"
    rag_db_path: str = "storage/chroma_db"
    rag_data_path: str = "data/full_dataset.xlsx"
    rag_max_results: int = 10
    rag_retrieval_k: int = 5  # Number of documents to retrieve
    rag_fetch_k: int = 10  # MMR fetch_k parameter
    rag_lambda_mult: float = 0.5  # MMR diversity parameter
    
    # Storage Configuration
    canvas_asset_dir: str = "storage/canvas_assets"
    # Server Configuration
    app_port: int = 8000
    app_base_path: str = ""
    environment: str = "development"  # "development" or "production"
    
    #API KEYS
    OPENAI_API_KEY: str = ""

    # MongoDB Configuration
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "SDS_HDB"
    
    # MongoDB connection options
    mongodb_min_pool_size: int = 10
    mongodb_max_pool_size: int = 50
    mongodb_server_selection_timeout: int = 5000  # milliseconds

    # JWT Authentication
    secret_key: str = "your-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS Configuration
    allow_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]
    allow_credentials: bool = True
    allow_methods: list[str] = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    allow_headers: list[str] = ["Content-Type", "Authorization"]

    # API Configuration
    api_title: str = "Backend API"
    api_version: str = "1.0.0"
    api_description: str = "Backend API for SDS HDB App"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"  # Ignore extra fields in .env
    )

    @property
    def mongodb_connection_string(self) -> str:
        """
        Get MongoDB connection string with options.
        Useful if you want to add connection pooling or other options.
        """
        if self.environment == "production":
            # For MongoDB Atlas or production, use full connection string
            return self.mongodb_url
        else:
            # For local development
            return self.mongodb_url

    @property
    def cors_origins(self) -> list[str]:
        """
        Get CORS origins based on environment.
        In production, you might want to restrict this.
        """
        if self.environment == "production":
            # Return only your production domains
            return [origin for origin in self.allow_origins if "localhost" not in origin]
        return self.allow_origins
    
@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()