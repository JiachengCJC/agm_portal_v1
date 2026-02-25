from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.user import User
from app.api.routes import auth, projects, analytics, ingest


def _seed_users() -> None:
    """Seed demo users if DB is empty (MVP only)."""
    db: Session = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(
                User(
                    email="management@example.com",
                    full_name="Demo Management",
                    role="management",
                    hashed_password=hash_password("password"),
                )
            )
            db.add(
                User(
                    email="researcher@example.com",
                    full_name="Demo Researcher",
                    role="researcher",
                    hashed_password=hash_password("password"),
                )
            )
            db.commit()
    finally:
        db.close()


app = FastAPI(title=settings.APP_NAME)

origins = [o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if settings.ENV == "prod" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(projects.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(ingest.router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    _seed_users()


@app.get("/health")
def health():
    return {"status": "ok"}
