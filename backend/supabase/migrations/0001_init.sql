-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'EOB', 'BILL', 'SOB', 'POLICY', etc.
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded', -- 'uploaded', 'processing', 'analyzed', 'error'
    storage_path TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Document extractions table
CREATE TABLE doc_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    patient_responsibility DECIMAL(10, 2),
    provider TEXT,
    service_date DATE,
    plain_english_summary TEXT,
    next_steps JSONB, -- Array of strings
    raw_extraction JSONB, -- Full extraction data
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(doc_id)
);

CREATE INDEX idx_doc_extractions_doc_id ON doc_extractions(doc_id);

-- Line items table (for EOBs/bills)
CREATE TABLE line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extraction_id UUID NOT NULL REFERENCES doc_extractions(id) ON DELETE CASCADE,
    description TEXT,
    cpt VARCHAR(20),
    billed DECIMAL(10, 2),
    allowed DECIMAL(10, 2),
    plan_paid DECIMAL(10, 2),
    you_owe DECIMAL(10, 2),
    network_status VARCHAR(50), -- 'in_network', 'out_network', 'unknown'
    line_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_line_items_extraction_id ON line_items(extraction_id);
CREATE INDEX idx_line_items_cpt ON line_items(cpt);

-- Policy chunks table (for RAG/vector search)
CREATE TABLE policy_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    metadata JSONB, -- Additional metadata (section, page, etc.)
    embedding vector(1536), -- OpenAI ada-002 dimension, adjust as needed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_chunks_doc_id ON policy_chunks(doc_id);
CREATE INDEX idx_policy_chunks_embedding ON policy_chunks USING ivfflat (embedding vector_cosine_ops);

-- Chat sessions table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    assistant_response JSONB, -- Structured assistant response with citations
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Providers cache table
CREATE TABLE providers_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npi VARCHAR(10) UNIQUE,
    name TEXT NOT NULL,
    specialty TEXT,
    address TEXT,
    city TEXT,
    state VARCHAR(2),
    zip VARCHAR(10),
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_providers_cache_npi ON providers_cache(npi);
CREATE INDEX idx_providers_cache_name ON providers_cache USING gin(to_tsvector('english', name));

-- Network rules table (for provider network status)
CREATE TABLE network_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES providers_cache(id) ON DELETE CASCADE,
    plan_id TEXT, -- Could reference a plans table
    network_status VARCHAR(50) NOT NULL, -- 'in_network', 'out_network'
    effective_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_rules_provider_id ON network_rules(provider_id);
CREATE INDEX idx_network_rules_plan_id ON network_rules(plan_id);
CREATE INDEX idx_network_rules_effective_date ON network_rules(effective_date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doc_extractions_updated_at BEFORE UPDATE ON doc_extractions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_cache_updated_at BEFORE UPDATE ON providers_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_rules_updated_at BEFORE UPDATE ON network_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own extractions" ON doc_extractions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = doc_extractions.doc_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own extractions" ON doc_extractions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = doc_extractions.doc_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own line items" ON line_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM doc_extractions 
            JOIN documents ON documents.id = doc_extractions.doc_id
            WHERE doc_extractions.id = line_items.extraction_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own line items" ON line_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM doc_extractions 
            JOIN documents ON documents.id = doc_extractions.doc_id
            WHERE doc_extractions.id = line_items.extraction_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own policy chunks" ON policy_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = policy_chunks.doc_id 
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own chat sessions" ON chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );
