from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.user import User
from app.api.routes import auth, projects, analytics, ingest, assistant

# If the table is empty, it automatically creates two "Demo" users: a Management user and a Researcher user.
def _seed_users() -> None:
    """Seed demo users if DB is empty (MVP only)."""
    # It is a temporary, secure "bridge" that allows your Python code to translate and send data to your database 
    # and then safely disconnect so the system stays fast and organized.
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
            db.commit() # Save these IDs into the permanent filing cabinet (the Database).
    finally:
        db.close()

# Create the APP
app = FastAPI(title=settings.APP_NAME)

# (http://localhost:5173,http://localhost:3000) and turns it into a Python list.
origins = [o.strip() for o in settings.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

# set what website can talk to your API(backend).
"""
In Production (prod): It only allows the specific addresses in your origins list 
(like your real website URL).

In Development: It uses ["*"], which is a Wildcard. It tells the browser: "Let any website talk to me." 
This makes your life easier while coding so you don't get blocked during testing.
"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if settings.ENV == "prod" else ["*"],
    allow_credentials=True, # It’s okay to send sensitive info.
    allow_methods=["*"], # This defines what actions the guest can take. Using ["*"] means: "I allow all types of actions."
    allow_headers=["*"], # what extra info can be sent in the request "envelope". ["*"] means: "I accept all types of headers."
)

# Your app is split into different files (Auth, Projects, Analytics). 
# These lines act like extension cords, plugging those specific features into the main app.
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(projects.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(ingest.router, prefix=settings.API_V1_PREFIX)
app.include_router(assistant.router, prefix=settings.API_V1_PREFIX)

# This function runs automatically the moment you start the server.
@app.on_event("startup")
def on_startup() -> None:
    init_db() # Checks the database and creates any missing tables.
    _seed_users() # adds the "Demo" users if the database is empty.


@app.get("/health")
def health():
    return {"status": "ok"}
