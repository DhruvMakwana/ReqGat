# ReqGat — AI-Driven Requirement Engineering Platform

## Stack
- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Backend**: Python 3.11 + FastAPI + SQLAlchemy 2.0
- **Database**: PostgreSQL
- **AI**: BYOK — Claude API + OpenAI API (user provides their own key)
- **Documents**: python-docx (.docx) + WeasyPrint (PDF)

---

## Local Development Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL) OR a local PostgreSQL instance

### 2. Start the Database

```bash
# Option A: Docker
cd reqgat
docker-compose up db -d

# Option B: Local PostgreSQL
createdb reqgat
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env if needed (DATABASE_URL, SECRET_KEY, ENCRYPTION_KEY)

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install  # or pnpm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
```

App available at: http://localhost:3000

---

## First Run

1. Open http://localhost:3000
2. Click **Sign up** → create your organization and admin account
3. Go to **Settings** → add your Claude or OpenAI API key
4. Create a **New Project** (ERP / CRM / Custom)
5. Run **AI Discovery** → describe your business need in plain text
6. Review AI suggestions → accept/reject/edit items
7. Go to **Requirements** → advance statuses to "reviewed" → "final"
8. Go to **Scenarios** → generate AI scenarios for each requirement → accept
9. Go to **Documents** → click **Generate BRD & FRD** → download .docx and .pdf
10. Go to **Traceability** → link requirements to tasks

---

## Environment Variables

### Backend (.env)
| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://reqgat:reqgat_dev@localhost:5432/reqgat` |
| `SECRET_KEY` | JWT signing secret | Change in production! |
| `ENCRYPTION_KEY` | Fernet key for API key encryption | Change in production! |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry | 1440 (24h) |
| `STORAGE_PATH` | Document storage directory | `./storage/documents` |
| `CORS_ORIGINS` | Allowed origins (JSON list) | `["http://localhost:3000"]` |

### Frontend (.env.local)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL |

---

## Architecture

```
reqgat/
├── backend/          # FastAPI + SQLAlchemy
│   └── app/
│       ├── api/      # Route handlers (8 modules)
│       ├── models/   # SQLAlchemy ORM models
│       ├── schemas/  # Pydantic schemas
│       ├── services/ # AI service, document generation
│       └── core/     # Config, DB, security, deps
│
└── frontend/         # Next.js App Router
    ├── app/          # Pages (auth, dashboard, projects/[id]/*)
    ├── components/   # UI components
    └── lib/          # API client, auth helpers
```

## MVP Modules

| Module | Backend | Frontend |
|---|---|---|
| 1. Auth & Tenant | `/auth`, `/settings` | Login/register, Settings |
| 2. Project Management | `/projects` | Dashboard, New Project |
| 3. Discovery Engine | `/projects/{id}/discovery` | Discovery wizard |
| 4. Requirements | `/projects/{id}/requirements` | Requirements list |
| 5. Scenario Engine | `/requirements/{id}/scenarios` | Scenarios per req |
| 6. Scenario Matrix | (served by requirements API) | Coverage matrix view |
| 7. Document Engine | `/projects/{id}/documents` | Generate + download |
| 8. Traceability | `/requirements/{id}/tasks` | Traceability table |
