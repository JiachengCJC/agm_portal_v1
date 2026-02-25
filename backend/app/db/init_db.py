from app.db.base import Base
from app.db.session import engine

# Import models so SQLAlchemy knows about them before creating tables.
from app.models import user  # noqa: F401
from app.models import project  # noqa: F401
from app.models import audit  # noqa: F401


def init_db() -> None:
    # For MVP simplicity: create tables if they don't exist.
    # In production, use Alembic migrations.
    Base.metadata.create_all(bind=engine)
    # It only creates tables.

"""
How it fits in the Startup Flow
1. Docker starts the Postgres container.

2. FastAPI starts the Backend container.

3. FastAPI triggers the @app.on_event("startup") function.

4. That function calls init_db().

5. init_db() builds your tables so that when the very next line calls _seed_users(), 
the "User" table is ready and waiting.
"""