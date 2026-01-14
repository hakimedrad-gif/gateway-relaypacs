"""Simple trend chart component for analytics dashboard."""

from typing import Any


def generate_trend_data(stats: dict[str, Any], period: str = "7d") -> list[dict[str, Any]]:
    """
    Generate time-series trend data for dashboard charts.

    Args:
        stats: Upload statistics
        period: Time period (7d, 30d, 90d)

    Returns:
        List of data points with date and count
    """
    # Placeholder implementation - in production, query database for historical data
    # For now, return mock trend data
    import datetime

    end_date = datetime.datetime.now()
    days = 7 if period == "7d" else 30 if period == "30d" else 90

    trend_data = []
    for i in range(days):
        date = end_date - datetime.timedelta(days=days - i - 1)
        # Mock count - in production, this would be queried from database
        count = (i % 5) + 1  # Simple mock pattern
        trend_data.append({"date": date.strftime("%Y-%m-%d"), "count": count})

    return trend_data


def export_stats_to_csv(stats: dict[str, Any]) -> str:
    """
    Export statistics to CSV format.

    Args:
        stats: Upload statistics

    Returns:
        CSV string
    """
    import csv
    import io

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(["Category", "Value", "Count"])

    # Total stats
    writer.writerow(["Total Uploads", "", stats.get("total_uploads", 0)])
    writer.writerow(["Failed Uploads", "", stats.get("failed_uploads", 0)])

    # Modality breakdown
    for modality, count in stats.get("modality", {}).items():
        writer.writerow(["Modality", modality, count])

    # Service level breakdown
    for level, count in stats.get("service_level", {}).items():
        writer.writerow(["Service Level", level, count])

    return output.getvalue()


class StatsManager:
    """
    Simple in-memory stats manager for dashboard analytics.
    In production, this would aggregate data from the database.
    """

    def __init__(self) -> None:
        self._stats: dict[str, Any] = {
            "total_uploads": 0,
            "failed_uploads": 0,
            "successful_uploads": 0,
            "modality": {},
            "service_level": {},
        }

    def record_upload(self, modality: str, service_level: str, status: str = "success") -> None:
        """Record statistics for a completed upload."""
        self._stats["total_uploads"] += 1

        if status == "success":
            self._stats["successful_uploads"] += 1
        elif status == "failed":
            self._stats["failed_uploads"] += 1

        if modality:
            m_key = modality.lower()
            current = self._stats["modality"].get(m_key, 0)
            self._stats["modality"][m_key] = current + 1

        if service_level:
            s_key = service_level.lower()
            current = self._stats["service_level"].get(s_key, 0)
            self._stats["service_level"][s_key] = current + 1

    def get_stats(self, period: str = "7d") -> dict[str, Any]:
        """Get aggregated stats for the specified period."""
        stats = self._stats.copy()
        stats["period"] = period
        import datetime

        stats["last_updated"] = datetime.datetime.now().isoformat()
        return stats


# Singleton instance
stats_manager = StatsManager()
