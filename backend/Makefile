.PHONY: dev test test-quick lint format install clean bootstrap migrate check check-ci smoke demo

# Development (BACKEND_PORT env var, default 8000)
dev:
	@echo "Starting development server..."
	@uvicorn app.main:app --reload --host 0.0.0.0 --port $${BACKEND_PORT:-8000}

# Testing
test:
	@echo "Running tests..."
	@pytest -v

test-quick:
	@echo "Running tests (mock mode, quiet)..."
	@TEST_BYPASS_AUTH=true AUTH_MODE=mock pytest -q

# Linting
lint:
	@echo "Running linter..."
	@ruff check . || true
	@echo "Checking Python syntax..."
	@python -m compileall -q . || true

# Formatting
format:
	@echo "Formatting code..."
	@ruff format . || true

# High-signal pre-push check (strict)
check:
	@echo "==> Formatting (fail if changes needed)..."
	@ruff format --check .
	@echo "==> Lint..."
	@ruff check .
	@echo "==> Checking Python syntax..."
	@python -m compileall -q .
	@echo "==> Tests..."
	@pytest -q

check-ci: check

# Smoke run: seed (best-effort) + basic endpoint calls
smoke:
	@echo "==> Running demo seed (best-effort)..."
	@python scripts/seed_demo.py || echo "WARN: seed_demo.py failed or missing; continuing..."
	@echo "==> Smoke curl calls..."
	@bash scripts/smoke.sh

# Demo: bootstrap + seed + run
demo:
	@echo "==> Bootstrapping..."
	@bash scripts/dev_bootstrap.sh
	@echo "==> Seeding demo (best-effort)..."
	@python scripts/seed_demo.py || echo "WARN: seed_demo.py failed or missing; continuing..."
	@echo "==> Starting server..."
	@uvicorn app.main:app --host 0.0.0.0 --port 8000

# Installation
install:
	@echo "Installing dependencies..."
	@pip install -r requirements.txt

# Clean
clean:
	@echo "Cleaning up..."
	@find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true

# Bootstrap development environment
bootstrap:
	@bash scripts/dev_bootstrap.sh

# Run migrations
migrate:
	@bash scripts/run_migrations.sh
