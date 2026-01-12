"""Tests for analytics endpoints."""


def test_stats_export_endpoint(client):
    """Test CSV export endpoint."""
    # Login first to get auth
    login_response = client.post(
        "/auth/login", json={"username": "admin", "password": "adminuser@123"}
    )
    token = login_response.json()["access_token"]

    # Test export
    response = client.get("/upload/stats/export", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "Content-Disposition" in response.headers
    assert "relaypacs_stats" in response.headers["Content-Disposition"]

    # Verify CSV content
    csv_content = response.text
    assert "Category" in csv_content
    assert "Value" in csv_content


def test_trend_data_endpoint(client):
    """Test trend data endpoint."""
    # Login first
    login_response = client.post(
        "/auth/login", json={"username": "admin", "password": "adminuser@123"}
    )
    token = login_response.json()["access_token"]

    # Test trend data
    response = client.get(
        "/upload/stats/trend?period=7d", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "period" in data
    assert data["period"] == "7d"
    assert "data" in data
    assert isinstance(data["data"], list)
    assert "summary" in data


def test_trend_data_different_periods(client):
    """Test trend data with different time periods."""
    login_response = client.post(
        "/auth/login", json={"username": "admin", "password": "adminuser@123"}
    )
    token = login_response.json()["access_token"]

    for period in ["7d", "30d", "90d"]:
        response = client.get(
            f"/upload/stats/trend?period={period}", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == period
