# AGM Portal MVP (DSA3101 Project-10 style)

This is a **Minimum Viable Product** for a centralized **AI Project Management & Analytics Portal** aligned with the SingHealth AI Office problem statement:
- standardised project data capture
- basic governance fields (risk/compliance)
- portfolio-level analytics dashboard
- **read-only** ingestion of mocked AMGrant exports (CSV)

## What you get (MVP scope)

### 1) Project Registry
- Create / edit projects with key metadata
- Researcher view: only their own projects
- Management view: all projects

### 2) Governance Guardrails (lightweight)
- Required: institution, domain, AI type, maturity stage, risk, compliance status
- Audit log entries created for create/update/delete/ingest

### 3) Portfolio Intelligence Dashboard (management/admin only)
- Total & active projects
- Maturity pipeline (bar chart)
- Risk distribution (pie chart)

### 4) Mock AMGrant Integration (read-only)
- Upload a CSV export and the backend will **create or update** projects by `(title, institution)`
- Endpoint: `POST /api/v1/integrations/amgrant/ingest`

---

## Tech stack

- **Frontend**: React + TypeScript + Vite + Tailwind + Recharts
- **Backend**: FastAPI + SQLAlchemy + Postgres
- **Auth**: JWT (email+password)
- **Infra**: Docker + docker-compose

---

## Quickstart (local)

### Prereqs
- Docker Desktop (or Docker Engine)

### Run
```bash
docker compose up --build
```

### Open
- Frontend: http://localhost:5173
- Backend Swagger docs: http://localhost:8000/docs

### Demo users (seeded on first startup)
- `management@example.com` / `password` (can access Dashboard + Import)
- `researcher@example.com` / `password`

### Try AMGrant ingestion
Upload `infra/amgrant_mock.csv` on the **Import** page.

---

## Data model (MVP)

### users
- `email`, `role` (`researcher|management|admin`), `hashed_password`

### projects
- metadata: `title`, `institution`, `domain`, `ai_type`
- lifecycle: `maturity_stage`, `status`
- governance: `risk_level`, `compliance_status`, `approvals`, `data_sensitivity`
- funding: `funding_amount_sgd`, `start_date`, `end_date`

### project_updates
- lightweight status notes (for periodic updates)

### audit_logs
- tracks create/update/delete/ingest actions

---

## Cloud deployment (suggested path)

There are many valid ways to deploy. Here’s a clean “course-friendly” approach:

### Option A: Render (backend + Postgres) + Vercel (frontend)
1. Create a managed Postgres DB on Render.
2. Deploy `backend/` as a Docker Web Service.
   - Set env vars:
     - `DATABASE_URL` (Render connection string; keep SQLAlchemy prefix)
     - `SECRET_KEY` (strong random)
     - `ENV=prod`
     - `BACKEND_CORS_ORIGINS=https://<your-frontend-domain>`
3. Deploy `frontend/` on Vercel as a static site.
   - Set env var at build time:
     - `VITE_API_URL=https://<your-backend-domain>/api/v1`

### Option B: Single-host deployment (any VM)
- Run the same `docker-compose.yml` on a VM (DigitalOcean/Linode/AWS Lightsail)
- Put Nginx in front for TLS (Let’s Encrypt)

---

## Next steps (after MVP)

- RBAC refinement (separate institutions, project-level permissions)
- Better governance gating rules (required fields by stage)
- Discrepancy detection between AMGrant vs Portal fields (flag for review)
- Richer analytics (bottleneck analysis, time-in-stage, funding breakdown)
- Optional: RAG-style “AI Copilot” grounded in project data (local or private deployment)

