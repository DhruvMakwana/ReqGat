# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (FastAPI)
```bash
# Start PostgreSQL
docker compose -f reqgat/docker-compose.yml up db -d

# Install dependencies
cd reqgat/backend && pip install -r requirements.txt

# Run dev server
cd reqgat/backend && uvicorn app.main:app --reload --port 8000

# Run database migrations
cd reqgat/backend && alembic upgrade head

# Create new migration after model changes
cd reqgat/backend && alembic revision --autogenerate -m "description"
```

### Frontend (Next.js)
```bash
cd reqgat/frontend && npm install
cd reqgat/frontend && npm run dev      # dev server on :3000
cd reqgat/frontend && npm run build    # production build
cd reqgat/frontend && npm run lint     # ESLint
```

### Full Stack via Docker
```bash
docker compose -f reqgat/docker-compose.yml up      # backend + db
# Frontend runs separately: cd reqgat/frontend && npm run dev
```

### Environment Setup
Copy `reqgat/backend/.env.example` → `reqgat/backend/.env` and `reqgat/frontend/.env.local.example` → `reqgat/frontend/.env.local`. The backend needs `DATABASE_URL`, `SECRET_KEY`, and `ENCRYPTION_KEY` (Fernet 32-byte key).

## Architecture

### Overview
ReqGat is a multi-tenant requirements gathering SaaS. The workflow is: **Discovery** (AI structures free text into requirements) → **Requirements** (manage/review) → **Scenarios** (AI generates edge/exception/conditional cases) → **Documents** (generate BRD/FRD) → **Traceability** (link to Jira/Azure DevOps tasks).

### Backend (`reqgat/backend/app/`)
- **Routers** (`api/`): 8 routers registered in `main.py` — auth, settings, projects, discovery, requirements, scenarios, documents, traceability
- **Models** (`models/`): SQLAlchemy 2.0 ORM with async — Tenant, User, Project, Requirement, Scenario, Task, Document
- **Schemas** (`schemas/`): Pydantic models with `from_attributes=True` for ORM conversion
- **Services** (`services/`): `ai_service.py` (BYOK AI providers), `document_service.py` (docx/pdf generation)
- **Core** (`core/`): config (Pydantic Settings), database (async engine), security (JWT + bcrypt + Fernet), deps (FastAPI dependencies)

### Frontend (`reqgat/frontend/`)
- **App Router** (`app/`): Next.js 14 with client components (`"use client"` throughout)
- **API Client** (`lib/api.ts`): Centralized typed client — all endpoints mirror backend routes, auto-injects Bearer token
- **Auth** (`lib/auth.ts`): localStorage-based (`reqgat_token`, `reqgat_user`) — no SSR auth
- **UI** (`components/ui/`): Radix UI primitives wrapped with Tailwind + CVA variants
- **Layout** (`components/layout/`): `AppLayout` wraps all authenticated pages (auth guard + sidebar)

## Critical Patterns

### Tenant Isolation
Every query MUST filter by `tenant_id`. The dependency chain is: `HTTPBearer` → `get_current_user()` → `get_current_tenant()`. All route handlers receive the tenant via `Depends(get_current_tenant)` and scope queries accordingly. Never allow cross-tenant data access.

### BYOK AI Service
Tenants store their own encrypted API keys (Claude or OpenAI). `get_ai_provider(tenant)` in `services/ai_service.py` decrypts the key and returns the configured provider. Both providers implement the `AIProvider` protocol with `structure_requirements()` and `expand_scenarios()` methods.

### Adding a New Backend Endpoint
1. Model in `models/` (SQLAlchemy mapped columns + relationships)
2. Schema in `schemas/` (Pydantic input/output models)
3. Router in `api/` (use `get_current_tenant` dependency)
4. Register router in `main.py`
5. Migration: `alembic revision --autogenerate -m "..."`

### Adding a New Frontend Page
1. Create route in `app/` directory
2. Mark `"use client"` — all pages are client components
3. Import typed methods from `@/lib/api`
4. Use Radix UI components from `@/components/ui/`
5. Wrap with `<AppLayout>` for auth + sidebar

### User Type & Onboarding
Users have a `user_type` field (nullable) — distinct from `role` (admin/consultant/reviewer). Currently allowed values: `service_provider`, `service_consumer`. After signup, users are redirected to `/onboarding` to select their type. `AppLayout` checks `user_type` via `GET /auth/me` and redirects to `/onboarding` if null, so all authenticated pages are guarded. The `PATCH /auth/me/user-type` endpoint updates it.

### Document Generation
`document_service.py` generates BRD/FRD as .docx (python-docx) and .pdf (WeasyPrint HTML→PDF). Validation: all requirements must be reviewed/final, and every what_to_do requirement needs at least one accepted scenario before generation.

## Git Workflow
- Always create feature branches from `main` — never push directly to main
- Remote uses SSH alias: `git@github.com-personal:DhruvMakwana/ReqGat.git`
- Commit author: `dmakwana503@gmail.com`

## Custom Skills
Available in `.claude/skills/`:
- `/new-feature <name>` — Create feature branch + scaffold backend/frontend boilerplate
- `/test-api <endpoint>` — Test FastAPI endpoints with curl and validate responses
- `/migrate <description>` — Generate and apply Alembic migrations safely

## Self-Improvement
During any session, if you identify an opportunity to improve the development workflow, proactively suggest it:
- **New skill**: If a task is being done repeatedly (e.g., generating test data, deploying, creating components), propose creating a new skill in `.claude/skills/`
- **New hook**: If a guardrail or automation would prevent mistakes (e.g., auto-linting, blocking dangerous commands), propose adding a hook in `.claude/settings.json`
- **Settings change**: If a permission, environment variable, or configuration would streamline work, propose updating settings
- **CLAUDE.md update**: If you learn new patterns, conventions, or architecture decisions during a session, propose updating this file

Always ask the user before making these changes — explain what you want to add and why.
