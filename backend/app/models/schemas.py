from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Document Schemas
class LineItem(BaseModel):
    description: str
    cpt: str
    billed: float
    allowed: float
    plan_paid: float
    you_owe: float
    network_status: str


class Extraction(BaseModel):
    patient_responsibility: float
    provider: str
    service_date: str
    line_items: List[LineItem]
    plain_english_summary: str
    next_steps: List[str]


class DocumentResponse(BaseModel):
    id: str
    type: str
    status: str
    created_at: str


class DocumentAnalysisResponse(BaseModel):
    doc: DocumentResponse
    extraction: Optional[Extraction] = None
    warning: Optional[str] = None


# Chat Schemas
class Citation(BaseModel):
    doc_id: str
    chunk_id: str
    label: str


class AssistantResponse(BaseModel):
    text: str
    citations: List[Citation]
    confidence: float
    disclaimer: str


class ChatMessageResponse(BaseModel):
    session_id: str
    message_id: str
    assistant: AssistantResponse


class CreateChatSessionRequest(BaseModel):
    user_id: Optional[str] = None


class CreateChatSessionResponse(BaseModel):
    session_id: str
    created_at: str


class CreateChatMessageRequest(BaseModel):
    content: str
    role: str = "user"


class CreateChatStreamRequest(BaseModel):
    text: str
    policy_doc_id: Optional[str] = None


class CreateChatMessageResponse(BaseModel):
    message_id: str
    session_id: str
    assistant: AssistantResponse


# Document Upload Schemas
class UploadInfo(BaseModel):
    bucket: str
    path: str
    signed_url: Optional[str] = None
    expires_in: Optional[int] = None


class DocumentUploadResponse(BaseModel):
    doc: DocumentResponse
    upload: UploadInfo
    warning: Optional[str] = None


# Provider Schemas
class NetworkEvidence(BaseModel):
    doc_id: str
    chunk_id: str
    label: str


class NetworkStatus(BaseModel):
    status: str  # "likely_in_network" | "unknown" | "likely_out_of_network"
    confidence: float
    reasons: List[str]
    evidence: List[NetworkEvidence] = []


class Provider(BaseModel):
    provider_id: str
    name: str
    lat: float
    lng: float
    address: str
    phone: Optional[str] = None
    types: List[str] = []
    distance_miles: float
    network: NetworkStatus
    npi: Optional[str] = None


class CacheInfo(BaseModel):
    hit: bool
    ttl_seconds: int


class CenterPoint(BaseModel):
    lat: float
    lng: float


class ProviderSearchResponse(BaseModel):
    query: str
    center: CenterPoint
    radius_miles: int
    providers: List[Provider]
    cache: CacheInfo


# Policy Ingest Schemas
class PolicyIngestResponse(BaseModel):
    doc_id: str
    status: str
    chunks_created: int
    embedding_model: str
    notes: Optional[str] = None


# Me / Whoami Schemas
class MeResponse(BaseModel):
    user_id: str
    auth_source: str
    scopes: List[str] = []
    issued_at: Optional[str] = None


# Health Check
class HealthResponse(BaseModel):
    ok: bool
