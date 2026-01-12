"""Extended upload router with CSV export and trend data endpoints."""

# Append these endpoints to the existing upload/router.py


@router.get("/stats/export")
async def export_statistics(
    period: str | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """
    Export upload statistics as CSV file.

    Returns CSV file for download with statistics breakdown.
    """
    # Get stats using existing stats_manager
    stats_data = stats_manager.get_stats(period)

    # Convert to CSV
    csv_content = export_stats_to_csv(stats_data)

    # Return as downloadable CSV
    filename = f"relaypacs_stats_{period or 'all'}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/stats/trend")
async def get_trend_data(
    period: str = "7d",
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get trend data for time-series visualization.

    Returns daily upload counts for the specified period.
    """
    # Get current stats
    stats_data = stats_manager.get_stats(period)

    # Generate trend data (currently mock, will be replaced with DB queries)
    trend_data = generate_trend_data(stats_data, period)

    return {
        "period": period,
        "data": trend_data,
        "summary": stats_data,
    }
