from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

# ヘルスチェックAPIをテストする
def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()

    # 値の型をチェックする
    assert isinstance(data["status"], str)
    assert isinstance(data["version"], str)
    assert isinstance(data["timestamp"], str)
    assert isinstance(data["uptime"], float)

    # 値の内容をチェックする
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"

    # uptimeの範囲をチェックする
    assert 0.0 <= data["uptime"] < 1.0

