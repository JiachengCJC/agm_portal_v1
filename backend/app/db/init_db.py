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
