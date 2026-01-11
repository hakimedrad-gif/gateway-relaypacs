import pytest
from app.upload.service import StatsManager


@pytest.fixture
def temp_db_file(tmp_path):
    db_file = tmp_path / "stats.db"
    return db_file


def test_stats_manager_initialization(temp_db_file):
    manager = StatsManager(db_path=str(temp_db_file))
    stats = manager.get_stats()
    assert stats["total_uploads"] == 0
    assert stats["modality"] == {}
    assert stats["service_level"] == {}


def test_record_upload(temp_db_file):
    manager = StatsManager(db_path=str(temp_db_file))

    manager.record_upload("CT", "emergency")
    stats = manager.get_stats()
    assert stats["total_uploads"] == 1
    assert stats["modality"]["ct"] == 1
    assert stats["service_level"]["emergency"] == 1

    manager.record_upload("CT", "routine")
    stats = manager.get_stats()
    assert stats["total_uploads"] == 2
    assert stats["modality"]["ct"] == 2
    assert stats["service_level"]["routine"] == 1


def test_stats_persistence(temp_db_file):
    manager = StatsManager(db_path=str(temp_db_file))
    manager.record_upload("MR", "stat")

    # Create new manager instance with same file
    manager2 = StatsManager(db_path=str(temp_db_file))
    stats2 = manager2.get_stats()
    assert stats2["total_uploads"] == 1
    assert stats2["modality"]["mr"] == 1
    assert stats2["service_level"]["stat"] == 1


def test_record_status_tracking(temp_db_file):
    manager = StatsManager(db_path=str(temp_db_file))

    # Successful upload
    manager.record_upload("CT", "emergency", status="success")
    # Failed upload
    manager.record_upload("MR", "stat", status="failed")

    stats = manager.get_stats()
    assert stats["total_uploads"] == 1
    assert stats["failed_uploads"] == 1
    assert stats["modality"]["ct"] == 1
    assert "mr" not in stats["modality"]
    assert stats["last_updated"] is not None


def test_get_stats_with_period(temp_db_file):
    import sqlite3
    from datetime import datetime, timedelta

    manager = StatsManager(db_path=str(temp_db_file))

    # Insert older record manually
    old_time = (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d %H:%M:%S")
    recent_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with sqlite3.connect(temp_db_file) as conn:
        conn.execute(
            "INSERT INTO upload_stats (modality, service_level, status, timestamp) VALUES (?, ?, ?, ?)",
            ("ct", "emergency", "success", old_time),
        )
        conn.execute(
            "INSERT INTO upload_stats (modality, service_level, status, timestamp) VALUES (?, ?, ?, ?)",
            ("mr", "stat", "success", recent_time),
        )

    # Test 'all'
    stats_all = manager.get_stats(period="all")
    assert stats_all["total_uploads"] == 2

    # Test '1m' (30 days) - should only see MR
    stats_1m = manager.get_stats(period="1m")
    assert stats_1m["total_uploads"] == 1
    assert "mr" in stats_1m["modality"]
    assert "ct" not in stats_1m["modality"]
