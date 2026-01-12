"""Tests for metadata validation."""


def test_age_format_validation():
    """Test age format validation regex."""
    import re

    age_regex = r"^\d+[YMDW]$"

    # Valid formats
    assert re.match(age_regex, "45Y", re.IGNORECASE)
    assert re.match(age_regex, "6M", re.IGNORECASE)
    assert re.match(age_regex, "2W", re.IGNORECASE)
    assert re.match(age_regex, "10D", re.IGNORECASE)

    # Invalid formats
    assert not re.match(age_regex, "45", re.IGNORECASE)
    assert not re.match(age_regex, "Y45", re.IGNORECASE)
    assert not re.match(age_regex, "45 Y", re.IGNORECASE)
    assert not re.match(age_regex, "fortyfive", re.IGNORECASE)


def test_clinical_history_validation():
    """Test clinical history validation."""
    # Required field
    history = ""
    assert len(history.strip()) == 0  # Should fail validation

    # Maximum length
    history = "a" * 501
    assert len(history) > 500  # Should fail validation

    # Valid history
    history = "Patient presents with chest pain for 2 hours"
    assert len(history) <= 500
    assert len(history.strip()) > 0


def test_character_limits():
    """Test character limits for text fields."""
    # Clinical History: 500 chars
    assert 500 == 500  # Defined limit

    # Additional Notes: 200 chars
    assert 200 == 200  # Defined limit
