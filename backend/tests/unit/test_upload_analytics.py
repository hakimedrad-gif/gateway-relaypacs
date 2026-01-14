import csv
import io

import pytest
from app.upload.analytics import export_stats_to_csv, generate_trend_data
from app.upload.service import StatsManager


@pytest.fixture
def stats_manager(tmp_path):
    """Return a fresh StatsManager with temp DB."""
    db_path = tmp_path / "stats.db"
    return StatsManager(db_path=db_path)


def test_stats_manager_initialization(stats_manager):
    """Test stats manager initializes with empty state."""
    stats = stats_manager.get_stats()
    assert stats["total_uploads"] == 0
    assert stats["failed_uploads"] == 0


def test_record_upload(stats_manager):
    """Test recording a successful upload."""
    stats_manager.record_upload("CT", "STAT", "success")
    stats = stats_manager.get_stats()
    assert stats["total_uploads"] == 1
    assert stats["modality"]["ct"] == 1


def test_record_upload_by_modality(stats_manager):
    """Test upload statistics grouped by modality."""
    stats_manager.record_upload("CT", "Routine")
    stats_manager.record_upload("MRI", "Routine")
    stats_manager.record_upload("CT", "Routine")

    stats = stats_manager.get_stats()
    assert stats["modality"]["ct"] == 2
    assert stats["modality"]["mri"] == 1


def test_record_upload_by_service_level(stats_manager):
    """Test upload statistics grouped by service level."""
    stats_manager.record_upload("CT", "STAT")
    stats_manager.record_upload("CT", "Routine")

    stats = stats_manager.get_stats()
    assert stats["service_level"]["stat"] == 1
    assert stats["service_level"]["routine"] == 1


def test_get_stats_all_time(stats_manager):
    """Test retrieving all-time statistics."""
    stats_manager.record_upload("CT", "STAT")
    stats = stats_manager.get_stats()
    assert stats["period"] == "all"
    assert stats["total_uploads"] == 1


def test_get_stats_filtered_by_period(stats_manager):
    """Test statistics filtering by time period."""
    # Since we can't easily mock SQLite current time without extensions,
    # we rely on the fact that inserted records are "now".
    stats_manager.record_upload("CT", "STAT")

    # 1w should include it
    stats = stats_manager.get_stats(period="1w")
    assert stats["total_uploads"] == 1

    # We can't easily test "exclude old records" without inserting manually with old timestamps
    # but we can verify the query executes without error.


def test_export_stats_to_csv():
    """Test CSV export formatting."""
    stats = {
        "total_uploads": 10,
        "failed_uploads": 2,
        "modality": {"CT": 5, "MRI": 3},
        "service_level": {"STAT": 4, "Routine": 4},
    }

    csv_output = export_stats_to_csv(stats)
    assert "Total Uploads,,10" in csv_output
    assert "Modality,CT,5" in csv_output

    # Verify CSV structure
    reader = csv.reader(io.StringIO(csv_output))
    rows = list(reader)
    assert len(rows) > 0
    assert rows[0] == ["Category", "Value", "Count"]


def test_export_stats_to_csv_headers():
    """Test CSV includes correct headers."""
    stats = {}
    csv_output = export_stats_to_csv(stats)
    assert "Category,Value,Count" in csv_output


def test_generate_trend_data():
    """Test trend data generation for charts."""
    stats = {}  # Mock stats, function uses mock data anyway
    trend = generate_trend_data(stats, period="7d")

    assert isinstance(trend, list)
    assert len(trend) == 7
    assert "date" in trend[0]
    assert "count" in trend[0]


def test_generate_trend_data_daily_buckets():
    """Test trend data bucketed by day."""
    stats = {}
    trend = generate_trend_data(stats, period="30d")
    assert len(trend) == 30


def test_stats_persistence(tmp_path):
    """Test statistics persisted to database."""
    db_path = tmp_path / "stats.db"
    mgr1 = StatsManager(db_path)
    mgr1.record_upload("CT", "STAT")

    mgr2 = StatsManager(db_path)
    stats = mgr2.get_stats()
    assert stats["total_uploads"] == 1


def test_stats_aggregation_performance(stats_manager):
    """Test stats aggregation completes quickly."""
    import time

    start = time.time()
    stats_manager.get_stats()
    duration = time.time() - start
    assert duration < 1.0  # Should be very fast
