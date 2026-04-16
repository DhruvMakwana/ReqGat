from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import auth, network, projects, discovery, requirements, scenarios, traceability, documents, settings as settings_api

app = FastAPI(
    title="ReqGat API",
    description="AI-driven requirement engineering platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(network.router)
app.include_router(settings_api.router)
app.include_router(projects.router)
app.include_router(discovery.router)
app.include_router(requirements.router)
app.include_router(scenarios.router)
app.include_router(traceability.router)
app.include_router(documents.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "reqgat-api"}
