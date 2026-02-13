from copy import deepcopy
from fastapi.testclient import TestClient
import pytest

from src import app as mh_app


@pytest.fixture(autouse=True)
def restore_activities():
    """Backup and restore the in-memory `activities` dict for each test."""
    original = deepcopy(mh_app.activities)
    yield
    mh_app.activities = original


@pytest.fixture()
def client():
    return TestClient(mh_app.app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_success(client):
    email = "test.student@mergington.edu"
    activity = "Tennis Club"

    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert resp.json()["message"] == f"Signed up {email} for {activity}"

    # verify participant was added
    assert email in mh_app.activities[activity]["participants"]


def test_signup_already_signed_up_returns_400(client):
    activity = "Chess Club"
    existing = mh_app.activities[activity]["participants"][0]

    resp = client.post(f"/activities/{activity}/signup", params={"email": existing})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Student already signed up"


def test_signup_nonexistent_activity_returns_404(client):
    resp = client.post("/activities/NoSuchClub/signup", params={"email": "a@b.com"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Activity not found"


def test_unregister_success(client):
    activity = "Basketball Team"
    email = mh_app.activities[activity]["participants"][0]

    resp = client.post(f"/activities/{activity}/unregister", params={"email": email})
    assert resp.status_code == 200
    assert resp.json()["message"] == f"Unregistered {email} from {activity}"
    assert email not in mh_app.activities[activity]["participants"]


def test_unregister_not_signed_up_returns_400(client):
    activity = "Gym Class"
    email = "not.registered@mergington.edu"

    resp = client.post(f"/activities/{activity}/unregister", params={"email": email})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Student not signed up for this activity"


def test_unregister_nonexistent_activity_returns_404(client):
    resp = client.post("/activities/NoClub/unregister", params={"email": "x@y.com"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Activity not found"
