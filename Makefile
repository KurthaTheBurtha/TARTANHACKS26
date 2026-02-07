# CareMap — root Makefile for local dev (backend + frontend)
# Prerequisites: Python 3.11+, Node 18+, pip, npm

.PHONY: dev-backend dev-frontend dev-mobile dev-all install help

# Default: show help
help:
	@echo "CareMap local dev targets:"
	@echo "  make dev-backend   — start FastAPI backend (reload, 0.0.0.0:8000)"
	@echo "  make dev-frontend  — start Next.js web app (bill-parser, port 3000)"
	@echo "  make dev-mobile    — start Expo app (integrations-abhay/mobile)"
	@echo "  make dev-all       — start backend + frontend concurrently"
	@echo "  make install       — install backend + frontend deps (no mobile)"
	@echo ""
	@echo "Optional: BACKEND_PORT=8000, copy .env.example -> .env in backend/ and bill-parser/.env.local"

# Backend: FastAPI with reload, bind 0.0.0.0, port from env or 8000
dev-backend:
	@echo "Starting backend (FastAPI) at http://0.0.0.0:$${BACKEND_PORT:-8000} ..."
	@cd backend && pip install -q -r requirements.txt && uvicorn app.main:app --reload --host 0.0.0.0 --port $${BACKEND_PORT:-8000}

# Frontend: Next.js (bill-parser) — CareMap page at /caremap
dev-frontend:
	@echo "Starting frontend (Next.js) at http://localhost:3000 ..."
	@cd bill-parser && npm install && npm run dev

# Mobile: Expo (optional)
dev-mobile:
	@echo "Starting Expo at integrations-abhay/mobile ..."
	@cd integrations-abhay/mobile && npm install && npx expo start

# Run backend in background, frontend in foreground. Ctrl+C stops frontend; backend may keep running (kill separately or use two terminals).
dev-all:
	@echo "Starting backend + frontend (backend in background)..."
	@(cd backend && pip install -q -r requirements.txt && uvicorn app.main:app --reload --host 0.0.0.0 --port $${BACKEND_PORT:-8000}) & \
	(cd bill-parser && npm install && npm run dev); \
	wait

# Install deps only (backend + bill-parser)
install:
	@echo "Installing backend deps..."
	@cd backend && pip install -r requirements.txt
	@echo "Installing frontend deps..."
	@cd bill-parser && npm install
	@echo "Done. Run make dev-backend and make dev-frontend (or make dev-all)."
