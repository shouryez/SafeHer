import pytest
import requests
import os

@pytest.fixture(scope="session")
def base_url():
    """Get backend URL from environment"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL not set")
    return url.rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def auth_token(base_url, api_client):
    """Get auth token for test user (or create one)"""
    # Try to login with existing test user
    try:
        response = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "test@safeher.com", "password": "password123"}
        )
        if response.status_code == 200:
            return response.json()["token"]
    except:
        pass
    
    # If login fails, user exists but wrong password, or create new test user
    import uuid
    test_email = f"test_{uuid.uuid4().hex[:8]}@safeher.com"
    response = api_client.post(
        f"{base_url}/api/auth/register",
        json={
            "name": "Test User",
            "email": test_email,
            "password": "password123",
            "phone": "+1234567890"
        }
    )
    if response.status_code != 200:
        pytest.fail(f"Failed to create test user: {response.text}")
    return response.json()["token"]

@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }
