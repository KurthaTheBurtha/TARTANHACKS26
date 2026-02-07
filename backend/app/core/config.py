from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = "https://mock.supabase.co"
    supabase_key: str = "mock-key"
    supabase_service_role_key: str = "mock-service-key"
    supabase_jwt_secret: str = "mock-jwt-secret"
    supabase_storage_bucket: str = "documents"
    
    # Database
    database_url: str = "postgresql://mock:mock@localhost/mock"
    
    # Application
    environment: str = "development"
    log_level: str = "INFO"
    api_v1_prefix: str = "/v1"
    
    # Security
    allowed_origins: str = "http://localhost:3000,http://localhost:8080"
    
    # Storage
    signed_url_expires_in: int = 600  # seconds
    
    # OpenAI (optional)
    openai_api_key: Optional[str] = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimension: int = 1536
    
    # Demo mode
    demo_mode: bool = False
    demo_user_id: str = "demo_user"
    demo_policy_doc_id: str = "policy_001"
    
    # Test auth override
    test_bypass_auth: bool = False
    auth_mode: str = "jwt"  # "jwt" or "test"

    # CareMap orchestrator (optional)
    bill_parser_url: Optional[str] = None  # e.g. http://localhost:3000/api (Next.js parse-bill)
    functions_base_url: Optional[str] = None  # e.g. http://localhost:54321/functions/v1 (Supabase Edge)
    caremap_temp_dir: Optional[str] = None  # temp dir for uploads; default system temp
    caremap_ingest_require_auth: bool = True  # set False for demo to allow unauthenticated ingest

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
