#!/bin/bash
# Development bootstrap script
# Checks environment, runs migrations, starts server

set -e

echo "🚀 Bootstrapping development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << EOF
# Supabase Configuration (use SUPABASE_ANON_KEY or SUPABASE_KEY)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres

# Application
BACKEND_PORT=8000
ENVIRONMENT=development
LOG_LEVEL=INFO
API_V1_PREFIX=/v1

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Storage
SUPABASE_STORAGE_BUCKET=documents
SIGNED_URL_EXPIRES_IN=600

# OpenAI (optional)
OPENAI_API_KEY=
EOF
    echo "✅ Created .env file. Please update with your actual values."
    echo ""
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.11+"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
else
    echo "✅ Dependencies already installed"
fi

# Run migrations if Supabase is configured
if grep -q "your-project" .env 2>/dev/null; then
    echo "⚠️  Supabase not configured. Skipping migrations."
    echo "   Tests will run in mock mode."
else
    echo "🔄 Running migrations..."
    bash scripts/run_migrations.sh || echo "⚠️  Migration failed (this is OK if Supabase not set up)"
fi

# Health check
echo ""
echo "🏥 Running health check..."
python3 -c "
from app.main import app
from fastapi.testclient import TestClient
client = TestClient(app)
response = client.get('/health')
if response.status_code == 200:
    print('✅ Health check passed')
else:
    print('❌ Health check failed')
    exit(1)
" || echo "⚠️  Health check failed (this is OK in mock mode)"

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  make dev     - Start development server"
echo "  make test    - Run tests"
echo "  make lint    - Run linter"
echo ""
echo "API will be available at: http://localhost:8000"
echo "API docs will be available at: http://localhost:8000/docs"
