#!/usr/bin/env bash

set -euo pipefail

echo "[1/4] Building and starting database container..."
docker compose up --build -d db

echo "[2/4] Waiting for PostgreSQL to become ready..."
until docker compose exec -T db pg_isready -U postgres -d agm >/dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is ready."

echo "[3/4] Starting backend and frontend..."
docker compose up -d backend frontend

echo "[4/4] Current container status:"
docker compose ps

echo
echo "Done. Open:"
echo "- Frontend: http://localhost:5173"
echo "- Backend docs: http://localhost:8000/docs"
echo
echo "If backend is not Up, run: docker compose restart backend"
