# AGM Portal MVP

AGM Portal is a Dockerized AI project management portal.
It combines project tracking, governance metadata, analytics, CSV ingestion, and an LLM chat assistant.

## What This Project Does

- Centralized AI project registry
- Governance capture (maturity, data sensitivity, status)
- Portfolio analytics dashboard
- AMGrant-style CSV ingest (create/update project records)
- LLM assistant with 3 provider methods:
  - Method 1: OpenAI API
  - Method 2: Ollama
  - Method 3: Local model server (LM Studio/OpenAI-compatible)

## Stack

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- Orchestration: Docker Compose

## Prerequisites

- Docker Desktop
- Optional, depending on LLM method:
  - OpenAI API key (Method 1)
  - Ollama installed (Method 2)
  - LM Studio installed (Method 3)

## Quick Start

Run from project root:

```bash
docker compose up -d db
docker compose up -d backend frontend
docker compose ps
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health endpoint: [http://localhost:8000/health](http://localhost:8000/health)

Demo users (seeded only when DB is empty):

- `management@example.com` / `password`
- `researcher@example.com` / `password`

## Daily Operations

### Stop everything

```bash
docker compose down
```

This stops/removes containers but keeps database data.

### Run again (keep existing data)

```bash
docker compose up -d db backend frontend
```

### Restart app services only

```bash
docker compose restart backend frontend
```

### Rebuild app images (keep database data)

Use this after backend/frontend code changes:

```bash
docker compose up -d --build backend frontend
```

### Full clean reset (delete all DB data and rebuild)

Warning: this removes PostgreSQL data volume.

```bash
docker compose down -v --remove-orphans
docker compose up -d --build db backend frontend
docker compose ps
```

Optional Docker cache/image cleanup:

```bash
docker image prune -f
docker builder prune -f
```

## LLM Assistant Method Switching

You can control method from:

1. Frontend mode value (`CHAT_MODE`)
2. Backend environment defaults (`config.py`)

Current chatbox sends `CHAT_MODE` to backend, so that is the direct switch.

### Step 1: Set chatbox mode

Edit `frontend/src/components/AssistantChat.tsx`:

```ts
const CHAT_MODE = 3
```

Mode mapping:

- `1` = OpenAI API
- `2` = Ollama
- `3` = Local OpenAI-compatible server

### Step 2: Configure backend `backend/app/core/config.py`

Update `backend/app/core/config.py` :

```bash
# General
LLM_MODE=3

# Method 1: OpenAI
OPENAI_API_KEY= "sk-..."
OPENAI_MODEL=gpt-4o-mini

# Method 2: Ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=phi3:mini

# Method 3: Local server (LM Studio)
LOCAL_LLM_BASE_URL=http://host.docker.internal:1234/v1
LOCAL_LLM_MODEL=phi-3-mini-128k-instruct-imatrix-smashed
LOCAL_LLM_API_KEY=
```

## Method-by-Method Setup

### Method 1: OpenAI API

1. Set `CHAT_MODE = 1` and `LLM_MODE = 1`
2. Set `OPENAI_API_KEY` in `backend/app/core/config.py`
3. Set `OPENAI_MODEL` in `backend/app/core/config.py`
4. Rebuild/restart backend/frontend

### Method 2: Ollama

1. Install Ollama: [https://ollama.com/download](https://ollama.com/download)
2. Pull model in terminal:
  ```bash
   ollama pull phi3:mini
  ```
3. Verify model exists:
  ```bash
   ollama list
  ```
4. Set `CHAT_MODE = 2` and `LLM_MODE = 2`
5. Set `backend/app/core/config.py` values:
  - `OLLAMA_BASE_URL=http://host.docker.internal:11434`
  - `OLLAMA_MODEL=phi3:mini`
6. Rebuild/restart backend/frontend

### Method 3: Local model server (LM Studio)

1. Install LM Studio: [https://lmstudio.ai/](https://lmstudio.ai/)
2. Download your model in **LM Studio** (for example phi-3-mini-128k-instruct-imatrix-smashed)
3. **Go to the Local Server tab**: In the LM Studio sidebar, select the **Developer/Local Server** tab
4. **Load your model**: In the "Load Model" dropdown menu, select the model you just downloaded.
5. Click the **Start Server** button (or toggle the status switch **from "Stopped" to "Running"**)
6. Set `CHAT_MODE = 3` and `LLM_MODE = 3`
7. Set `backend/app/core/config.py` values:
  - `LOCAL_LLM_BASE_URL=http://host.docker.internal:1234/v1`
  - `LOCAL_LLM_MODEL=<your loaded model identifier>`
8. Rebuild/restart backend/frontend



Apply changes:

```bash
docker compose up -d --build backend frontend
```

## Fallback Behavior

If the selected LLM provider is unavailable or fails, backend automatically returns fallback responses.

## AMGrant CSV Ingestion

Use sample file:

- `infra/amgrant_mock.csv`

Upload from Import page, it creates/updates projects which inside the csv

Avoid using LLM Chatbox if you have loaded `amgrant_mock_50rows.csv` as it may run out of context length very easily