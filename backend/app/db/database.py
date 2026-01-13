"""Database connection and session management."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

settings = get_settings()

# Database URL from environment
DATABASE_URL = settings.database_url

# Create SQLAlchemy engine
# Create SQLAlchemy engine
# Use check_same_thread=False only for SQLite
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
else:
    # PostgreSQL production pool settings
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,          # Base number of connections
        max_overflow=10,       # Max additional connections
        pool_timeout=30,       # Wait time before timeout
        pool_recycle=1800,     # Recycle connections every 30 mins
        echo=False
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.
    Yields a session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
