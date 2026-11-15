"""Pytest configuration and shared fixtures for Saath AI tests."""

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app

VALID_TEST_TOKEN = "test-token-at-least-32-characters-long-for-security"


def pytest_configure() -> None:
    """Initialize test environment variables before test collection begins."""
    os.environ["AI_SERVICE_TOKEN"] = VALID_TEST_TOKEN
    os.environ["ENVIRONMENT"] = "development"
    os.environ["LOG_LEVEL"] = "error"


@pytest.fixture(autouse=True)
def setup_test_env() -> Generator[None, None, None]:
    """Ensure test environment variables are set and cached settings cleared."""
    os.environ["AI_SERVICE_TOKEN"] = VALID_TEST_TOKEN
    os.environ["ENVIRONMENT"] = "development"
    os.environ["LOG_LEVEL"] = "error"
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide a TestClient with fresh app instance."""
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
