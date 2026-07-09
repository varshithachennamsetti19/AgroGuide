from fastapi.testclient import TestClient
import sys
import os

# Adjust path to import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Python Vision Classifier"}

def test_analyze_blurry_override():
    response = client.post(
        "/analyze",
        files={"file": ("blurry_sample.jpg", b"dummy content", "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["reason"] == "blurry"

def test_analyze_dark_override():
    response = client.post(
        "/analyze",
        files={"file": ("dark_sample.jpg", b"dummy content", "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["reason"] == "dark"

def test_analyze_healthy_override():
    response = client.post(
        "/analyze",
        files={"file": ("healthy_leaf.jpg", b"dummy content", "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["healthy"] is True
    assert data["crop"] == "Cotton"

def test_rerank_documents():
    response = client.post(
        "/rerank",
        json={
            "query": "organic pest control tomato blight",
            "documents": [
                "Tomato leaf blight can be controlled organically using copper-based sprays and crop rotation.",
                "Weather reports suggest rain in Andhra Pradesh tomorrow.",
                "Rice blast is treated using biocontrol agents."
            ]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "scores" in data
    assert len(data["scores"]) == 3
    # First document has terms overlap with query, should score higher than second
    assert data["scores"][0] > data["scores"][1]
