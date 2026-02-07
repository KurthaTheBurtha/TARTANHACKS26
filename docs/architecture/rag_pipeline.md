# RAG Pipeline Architecture

## Overview

The Retrieval-Augmented Generation (RAG) pipeline enables insurance-aware chat by grounding responses in user-uploaded policy documents. The system ingests policy PDFs, chunks and embeds them, stores vectors in Supabase, and retrieves relevant chunks to generate grounded responses with citations.

## Components

### 1. Policy Document Ingestion

**Flow:**
1. User uploads policy PDF via `POST /v1/policies/upload` → receives signed URL
2. Mobile uploads PDF directly to Supabase Storage
3. User calls `POST /v1/policies/{doc_id}/ingest`
4. Backend downloads PDF, extracts text, chunks, embeds, stores in `policy_chunks`

**Services:**
- `pdf_extract.py`: Extracts text from PDF (pdfplumber/pypdf, fallback-friendly)
- `chunker.py`: Splits text into overlapping chunks (1000 chars, 150 overlap)
- `embedder.py`: Generates embeddings (OpenAI or deterministic hash fallback)
- `policies_repo.py`: Stores chunks in `policy_chunks` table with vectors

**Storage:**
- Policy documents stored in `documents` table (type=POLICY/SOB)
- Chunks stored in `policy_chunks` with:
  - `chunk_text`: Text content
  - `embedding`: Vector embedding (1536-dim for OpenAI, 256-dim for fallback)
  - `metadata`: JSONB with label, source info
  - `chunk_index`: Ordering within document

### 2. RAG Retrieval

**Flow:**
1. User sends chat message
2. Query embedding generated (same model as chunks)
3. Vector search in `policy_chunks` (filtered by user_id)
4. Top-k chunks returned with similarity scores

**Services:**
- `embedder.py`: `embed_query()` generates query embedding
- `retriever.py`: `search_chunks()` performs vector search

**Vector Search:**
- Uses pgvector cosine similarity (`<=>` operator)
- Always filters by `user_id` via JOIN with `documents` table
- Returns top-k chunks (default: 5)
- Falls back to text-based keyword matching if vector search unavailable

**Security:**
- **Critical**: Always filter by `user_id` to prevent data leakage
- RLS policies on `policy_chunks` ensure users can only access their own chunks

### 3. Response Generation

**Flow:**
1. Retrieved chunks passed to generator
2. LLM (if available) or stub generates response
3. Citations extracted from retrieved chunks
4. Response persisted to `chat_messages` with citations metadata

**Services:**
- `generator.py`: `generate_response()` creates assistant response

**LLM Integration:**
- If `OPENAI_API_KEY` present: Uses GPT-4o-mini with context from top chunks
- Prompt includes user question + relevant policy excerpts
- Response includes citations to source chunks
- If no key: Returns stub response with citations

**Stub Fallback:**
- Uses first retrieved chunk to generate simple response
- Includes citations from retrieved chunks
- Lower confidence score (0.65 vs 0.75 for LLM)

### 4. Chat Endpoint

**Endpoint:** `POST /v1/chat/sessions/{session_id}/messages`

**Process:**
1. Verify session ownership (user_id match)
2. Persist user message to `chat_messages`
3. Retrieve relevant chunks via RAG
4. Generate assistant response
5. Persist assistant message with citations in `assistant_response` JSONB
6. Return response with citations

**Response Shape:**
```json
{
  "session_id": "uuid",
  "message_id": "uuid",
  "assistant": {
    "text": "Response text...",
    "citations": [
      {
        "doc_id": "uuid",
        "chunk_id": "uuid",
        "label": "Policy excerpt label"
      }
    ],
    "confidence": 0.75,
    "disclaimer": "..."
  }
}
```

## Embedding Models

### OpenAI (Production)
- Model: `text-embedding-3-small`
- Dimension: 1536
- Cost: ~$0.02 per 1M tokens

### Deterministic Fallback (Development)
- Method: Hash-based vectorization
- Dimension: 256
- Algorithm: SHA-256 hash → float vector
- Properties: Deterministic, no external calls, consistent for testing

## Chunking Strategy

- **Chunk Size**: 1000 characters
- **Overlap**: 150 characters
- **Break Points**: Prefer sentence boundaries (`. `, `!\n`, `?\n`)
- **Metadata**: Each chunk includes:
  - `label`: Human-readable section identifier
  - `source`: Original filename
  - `chunk_index`: Position in document

## Database Schema

### `policy_chunks` Table
```sql
CREATE TABLE policy_chunks (
    id UUID PRIMARY KEY,
    doc_id UUID REFERENCES documents(id),
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(1536),  -- Adjust dimension as needed
    metadata JSONB,
    created_at TIMESTAMPTZ
);
```

### `chat_messages` Table
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    role VARCHAR(20),  -- 'user' or 'assistant'
    content TEXT,
    assistant_response JSONB,  -- Contains citations, confidence, disclaimer
    created_at TIMESTAMPTZ
);
```

## Error Handling

### Fallback Behavior
- **No OpenAI key**: Uses deterministic embeddings + stub responses
- **PDF extraction fails**: Returns error with helpful message
- **No chunks found**: Returns message asking user to upload policy
- **Vector search fails**: Falls back to text-based keyword matching

### Logging
- **PHI-safe**: Never logs extracted text or user queries
- Logs: doc_id, chunk_count, query_length, similarity scores (aggregated)

## Performance Considerations

### Vector Search
- Index on `embedding` column using ivfflat (created in migration)
- Filter by `user_id` first (indexed) before vector search
- Limit results to top-k (default: 5) to reduce response time

### Chunking
- Balance chunk size: too small = fragmented context, too large = poor retrieval
- Overlap ensures continuity across chunk boundaries
- Consider document structure (sections, headers) for better chunking

## Future Enhancements

1. **Hybrid Search**: Combine vector similarity with keyword matching
2. **Re-ranking**: Use cross-encoder to re-rank retrieved chunks
3. **Multi-document**: Support querying across multiple policy documents
4. **Citation Highlighting**: Return exact text spans for citations
5. **Streaming Responses**: Stream LLM responses for better UX
6. **Cache Embeddings**: Cache query embeddings for repeated questions
7. **Fine-tuning**: Fine-tune embedding model on insurance domain
