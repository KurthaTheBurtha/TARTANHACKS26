from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase (canonical: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
    supabase_url: str = Field(default="https://mock.supabase.co", description="SUPABASE_URL")
    supabase_key: str = Field(
        default="mock-key",
        validation_alias=AliasChoices("SUPABASE_ANON_KEY", "SUPABASE_KEY"),
        description="Anon key; use SUPABASE_ANON_KEY or SUPABASE_KEY",
    )
    supabase_service_role_key: str = Field(default="mock-service-key", description="Backend only; never expose to client")
    supabase_jwt_secret: str = Field(default="mock-jwt-secret", description="JWT verification")
    supabase_storage_bucket: str = "documents"

    # Database
    database_url: str = "postgresql://mock:mock@localhost/mock"

    # Application
    environment: str = "development"
    log_level: str = "INFO"
    api_v1_prefix: str = "/v1"
    backend_port: int = Field(default=8000, description="BACKEND_PORT for dev server")

    # Security (CORS: Next.js, Expo dev, localhost variants)
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:8080,http://localhost:8081,http://127.0.0.1:3000,http://127.0.0.1:8081",
        description="ALLOWED_ORIGINS comma-separated for CORS",
    )

    # Storage
    signed_url_expires_in: int = 600  # seconds

    # OpenAI (optional; when missing, mock/stub mode is used)
    openai_api_key: Optional[str] = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimension: int = 1536

    # LLM provider for text generation (openai | gemini); default from env LLM_PROVIDER
    llm_provider: str = Field(default="openai", description="LLM_PROVIDER: openai or gemini")
    gemini_api_key: Optional[str] = None

    # Demo mode
    demo_mode: bool = False
    demo_user_id: str = "demo_user"
    demo_policy_doc_id: str = "policy_001"

    # Test auth override
    test_bypass_auth: bool = False
    auth_mode: str = "jwt"  # "jwt" or "test"

    # CareMap orchestrator (optional)
    bill_parser_url: Optional[str] = None
    functions_base_url: Optional[str] = None
    caremap_temp_dir: Optional[str] = None
    caremap_ingest_require_auth: bool = True

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    def is_mock_supabase(self) -> bool:
        return "mock" in (self.supabase_url or "").lower() or self.supabase_key == "mock-key"

    def is_mock_openai(self) -> bool:
        return not (self.openai_api_key and self.openai_api_key.strip())


settings = Settings()
