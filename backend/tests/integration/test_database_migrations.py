import pytest
from alembic import command
from alembic.config import Config
from app.config import get_settings
from app.db.database import Base
from sqlalchemy import create_engine, inspect


@pytest.fixture
def migration_db_engine():
    """Create a separate engine for migration testing to avoid interfering with session fixture."""
    settings = get_settings()
    # Use the same test DB path
    engine = create_engine(settings.database_url)
    return engine


def test_database_migrations(migration_db_engine):
    """Test full migration cycle: Up -> Down -> Up."""
    settings = get_settings()

    # 1. Clean verify initial state (tables might exist from other tests)
    # We drop everything to simulate fresh start
    Base.metadata.drop_all(bind=migration_db_engine)

    # Ensure alembic_version is also dropped if it exists from previous run
    with migration_db_engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()

    # Configure Alembic
    # We assume we run from backend/ directory where alembic.ini is
    alembic_cfg = Config("alembic.ini")
    # Override URL to use test DB
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)

    # 2. Test Upgrade to Head
    try:
        command.upgrade(alembic_cfg, "head")
    except Exception as e:
        pytest.fail(f"Alembic upgrade failed: {e}")

    # Verify tables created
    inspector = inspect(migration_db_engine)
    tables = inspector.get_table_names()
    assert "users" in tables
    assert "study_uploads" in tables
    assert "alembic_version" in tables

    # 3. Test Downgrade to Base
    try:
        command.downgrade(alembic_cfg, "base")
    except Exception as e:
        pytest.fail(f"Alembic downgrade failed: {e}")

    # Verify tables (should be empty or minimal)
    inspector = inspect(migration_db_engine)
    tables = inspector.get_table_names()
    # Depending on base, tables might be gone. Usually base = empty.
    # Note: alembic_version table might get deleted or become empty depending on implementation
    assert "users" not in tables
    assert "study_uploads" not in tables

    # 4. Re-Upgrade to Head to leave DB in consistent state for other tests?
    # Actually other tests use metadata.create_all, so they might conflict if we don't clean up.
    # But this test file might run in parallel or sequence.
    # Best to restore it.
    command.upgrade(alembic_cfg, "head")


from sqlalchemy import text
