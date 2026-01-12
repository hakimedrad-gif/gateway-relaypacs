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
