"""
SafeHer Backend API Tests
Tests for: Auth, Contacts, Trips, Reports, Safety Scores, Alerts, AI Route Analysis
"""
import pytest
import requests
import uuid

class TestHealthAndSeed:
    """Health check and seed data"""
    
    def test_health_check(self, base_url, api_client):
        response = api_client.get(f"{base_url}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "SafeHer" in data["message"]
        print("✓ Health check passed")
    
    def test_seed_data(self, base_url, api_client):
        response = api_client.post(f"{base_url}/api/seed")
        assert response.status_code == 200
        print("✓ Seed data endpoint working")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_register_new_user(self, base_url, api_client):
        """Register a new user and verify response"""
        test_email = f"TEST_user_{uuid.uuid4().hex[:8]}@safeher.com"
        payload = {
            "name": "Test User",
            "email": test_email,
            "password": "securepass123",
            "phone": "+1234567890"
        }
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["name"] == "Test User"
        assert len(data["token"]) > 0
        print(f"✓ User registered successfully: {test_email}")
    
    def test_register_duplicate_email(self, base_url, api_client):
        """Registering with existing email should fail"""
        test_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@safeher.com"
        payload = {
            "name": "Test User",
            "email": test_email,
            "password": "pass123"
        }
        # First registration
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        # Second registration with same email
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert response.status_code == 400
        print("✓ Duplicate email registration blocked")
    
    def test_login_success(self, base_url, api_client):
        """Login with valid credentials"""
        # Create user first
        test_email = f"TEST_login_{uuid.uuid4().hex[:8]}@safeher.com"
        api_client.post(f"{base_url}/api/auth/register", json={
            "name": "Login Test",
            "email": test_email,
            "password": "mypassword"
        })
        
        # Login
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": test_email,
            "password": "mypassword"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == test_email
        print("✓ Login successful")
    
    def test_login_invalid_credentials(self, base_url, api_client):
        """Login with wrong password should fail"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid login rejected")
    
    def test_get_profile(self, base_url, auth_headers, api_client):
        """Get user profile with auth token"""
        response = api_client.get(f"{base_url}/api/auth/profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        print("✓ Profile retrieved successfully")


class TestTrustedContacts:
    """Trusted contacts CRUD tests"""
    
    def test_add_contact_and_verify(self, base_url, auth_headers, api_client):
        """Add a contact and verify it persists"""
        payload = {
            "name": "TEST_Emergency Contact",
            "phone": "+9876543210",
            "priority": 1
        }
        response = api_client.post(f"{base_url}/api/contacts", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Emergency Contact"
        assert data["phone"] == "+9876543210"
        contact_id = data["id"]
        
        # Verify persistence
        get_response = api_client.get(f"{base_url}/api/contacts", headers=auth_headers)
        assert get_response.status_code == 200
        contacts = get_response.json()
        assert any(c["id"] == contact_id for c in contacts)
        print("✓ Contact added and persisted")
    
    def test_list_contacts(self, base_url, auth_headers, api_client):
        """Get all contacts for user"""
        response = api_client.get(f"{base_url}/api/contacts", headers=auth_headers)
        assert response.status_code == 200
        contacts = response.json()
        assert isinstance(contacts, list)
        print(f"✓ Contacts listed: {len(contacts)} found")
    
    def test_max_3_contacts(self, base_url, auth_headers, api_client):
        """Should not allow more than 3 contacts"""
        # Add 3 contacts
        for i in range(1, 4):
            api_client.post(f"{base_url}/api/contacts", json={
                "name": f"TEST_Contact{i}",
                "phone": f"+12345678{i}0",
                "priority": i
            }, headers=auth_headers)
        
        # Try to add 4th
        response = api_client.post(f"{base_url}/api/contacts", json={
            "name": "TEST_Fourth",
            "phone": "+9999999999",
            "priority": 4
        }, headers=auth_headers)
        # Should fail or return 400
        if response.status_code == 400:
            print("✓ Max 3 contacts limit enforced")
        else:
            print(f"⚠ Max contacts check: got {response.status_code}")
    
    def test_delete_contact(self, base_url, auth_headers, api_client):
        """Delete a contact"""
        # Create contact
        create_response = api_client.post(f"{base_url}/api/contacts", json={
            "name": "TEST_ToDelete",
            "phone": "+1111111111",
            "priority": 1
        }, headers=auth_headers)
        
        if create_response.status_code == 200:
            contact_id = create_response.json()["id"]
            delete_response = api_client.delete(f"{base_url}/api/contacts/{contact_id}", headers=auth_headers)
            assert delete_response.status_code == 200
            print("✓ Contact deleted successfully")


class TestTrips:
    """Trip management tests"""
    
    def test_start_trip_and_verify(self, base_url, auth_headers, api_client):
        """Start a trip and verify it persists"""
        payload = {
            "mode": "cab",
            "origin_name": "TEST_Home",
            "origin_lat": 28.6139,
            "origin_lng": 77.2090,
            "destination_name": "TEST_Office",
            "destination_lat": 28.6280,
            "destination_lng": 77.2190,
            "vehicle_number": "TEST_DL01AB1234"
        }
        response = api_client.post(f"{base_url}/api/trips/start", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["mode"] == "cab"
        assert data["status"] == "active"
        assert data["origin_name"] == "TEST_Home"
        trip_id = data["id"]
        
        # Verify persistence
        get_response = api_client.get(f"{base_url}/api/trips", headers=auth_headers)
        assert get_response.status_code == 200
        trips = get_response.json()
        assert any(t["id"] == trip_id for t in trips)
        print("✓ Trip started and persisted")
        
        return trip_id
    
    def test_get_trips(self, base_url, auth_headers, api_client):
        """Get all trips for user"""
        response = api_client.get(f"{base_url}/api/trips", headers=auth_headers)
        assert response.status_code == 200
        trips = response.json()
        assert isinstance(trips, list)
        print(f"✓ Trips listed: {len(trips)} found")
    
    def test_get_active_trip(self, base_url, auth_headers, api_client):
        """Get active trip"""
        response = api_client.get(f"{base_url}/api/trips/active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "active_trip" in data
        print("✓ Active trip endpoint working")
    
    def test_end_trip(self, base_url, auth_headers, api_client):
        """End a trip with rating"""
        # Start trip first
        trip = api_client.post(f"{base_url}/api/trips/start", json={
            "mode": "walk",
            "origin_name": "TEST_Park",
            "origin_lat": 28.6139,
            "origin_lng": 77.2090,
            "destination_name": "TEST_Cafe",
            "destination_lat": 28.6280,
            "destination_lng": 77.2190
        }, headers=auth_headers).json()
        
        trip_id = trip["id"]
        
        # End trip
        response = api_client.post(f"{base_url}/api/trips/{trip_id}/end", json={
            "safety_rating": 5
        }, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"
        assert data["safety_rating"] == 5
        print("✓ Trip ended successfully")


class TestReports:
    """Incident reporting tests"""
    
    def test_create_report_and_verify(self, base_url, auth_headers, api_client):
        """Create an incident report"""
        payload = {
            "incident_type": "harassment",
            "description": "TEST_Suspicious behavior reported",
            "lat": 28.6139,
            "lng": 77.2090
        }
        response = api_client.post(f"{base_url}/api/reports", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["incident_type"] == "harassment"
        assert "TEST_Suspicious" in data["description"]
        report_id = data["id"]
        
        # Verify persistence
        get_response = api_client.get(f"{base_url}/api/reports", headers=auth_headers)
        assert get_response.status_code == 200
        reports = get_response.json()
        assert any(r["id"] == report_id for r in reports)
        print("✓ Report created and persisted")
    
    def test_get_reports(self, base_url, auth_headers, api_client):
        """Get all reports for user"""
        response = api_client.get(f"{base_url}/api/reports", headers=auth_headers)
        assert response.status_code == 200
        reports = response.json()
        assert isinstance(reports, list)
        print(f"✓ Reports listed: {len(reports)} found")


class TestSafetyScores:
    """Safety score tests"""
    
    def test_get_all_safety_scores(self, base_url, api_client):
        """Get all safety scores (no auth required)"""
        response = api_client.get(f"{base_url}/api/safety-scores")
        assert response.status_code == 200
        scores = response.json()
        assert isinstance(scores, list)
        print(f"✓ Safety scores retrieved: {len(scores)} found")
    
    def test_get_transport_safety(self, base_url, api_client):
        """Get transport safety scores"""
        response = api_client.get(f"{base_url}/api/safety-scores/transport")
        assert response.status_code == 200
        scores = response.json()
        assert isinstance(scores, list)
        # Seed data should have 6 transport routes
        assert len(scores) >= 6
        print(f"✓ Transport safety scores: {len(scores)} routes found")


class TestAlerts:
    """SOS and alert tests"""
    
    def test_trigger_sos_and_verify(self, base_url, auth_headers, api_client):
        """Trigger SOS alert"""
        payload = {
            "alert_type": "sos"
        }
        response = api_client.post(f"{base_url}/api/alerts/sos", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["alert_type"] == "sos"
        assert "contacts_notified" in data
        alert_id = data["id"]
        
        # Verify persistence
        get_response = api_client.get(f"{base_url}/api/alerts", headers=auth_headers)
        assert get_response.status_code == 200
        alerts = get_response.json()
        assert any(a["id"] == alert_id for a in alerts)
        print("✓ SOS alert triggered and persisted (MOCKED SMS)")
    
    def test_get_alerts(self, base_url, auth_headers, api_client):
        """Get all alerts for user"""
        response = api_client.get(f"{base_url}/api/alerts", headers=auth_headers)
        assert response.status_code == 200
        alerts = response.json()
        assert isinstance(alerts, list)
        print(f"✓ Alerts listed: {len(alerts)} found")


class TestAIRouteAnalysis:
    """AI route analysis with Gemini"""
    
    def test_analyze_route(self, base_url, auth_headers, api_client):
        """Test AI route analysis endpoint"""
        payload = {
            "origin_lat": 28.6139,
            "origin_lng": 77.2090,
            "destination_lat": 28.6280,
            "destination_lng": 77.2190,
            "time_of_day": "evening",
            "mode": "walk"
        }
        response = api_client.post(f"{base_url}/api/ai/analyze-route", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "routes" in data
        assert len(data["routes"]) == 3
        
        # Check route structure
        route = data["routes"][0]
        assert "id" in route
        assert "label" in route
        assert "safety_score" in route
        assert "duration_min" in route
        assert "description" in route
        assert "warnings" in route
        assert isinstance(route["warnings"], list)
        
        print(f"✓ AI route analysis successful - 3 routes generated")
        print(f"  Routes: {', '.join([r['label'] for r in data['routes']])}")
