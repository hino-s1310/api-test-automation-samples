"""
テスト生成ルーターのユニットテスト

エンドポイントのバリデーション・エラーハンドリングをテスト。
AI APIとDB操作はモックする。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client():
    """テスト用FastAPIクライアント"""
    return TestClient(app)


@pytest.fixture
def valid_file_id():
    """有効なファイルID"""
    return "12345678-1234-1234-1234-123456789012"


@pytest.fixture
def mock_file_data():
    """モックファイルデータ"""
    return {
        "id": "12345678-1234-1234-1234-123456789012",
        "filename": "test.pdf",
        "markdown": "# Test API\n\n## GET /health\n\nヘルスチェックエンドポイント",
        "status": "completed",
        "created_at": "2025-01-01T00:00:00",
        "updated_at": "2025-01-01T00:00:00",
        "file_size": 1024,
        "processing_time": 1.5,
    }


# ===========================
# POST /files/{file_id}/generate-tests
# ===========================


class TestGenerateTestsEndpoint:
    """テスト生成エンドポイントのテスト"""

    def test_returns_503_when_ai_unavailable(self, client, valid_file_id):
        """AI APIが利用できない場合503を返す"""
        with patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service:
            mock_service.is_available.return_value = False

            response = client.post(
                f"/files/{valid_file_id}/generate-tests",
                json={},
            )

        assert response.status_code == 503

    def test_returns_400_for_invalid_file_id(self, client):
        """無効なファイルIDの場合400を返す"""
        with patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service:
            mock_service.is_available.return_value = True

            response = client.post(
                "/files/invalid-id/generate-tests",
                json={},
            )

        assert response.status_code == 400
        assert "無効なファイルID" in response.json()["detail"]

    def test_returns_404_for_nonexistent_file(self, client, valid_file_id):
        """ファイルが存在しない場合404を返す"""
        with patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service, patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service:
            mock_service.is_available.return_value = True
            mock_file_service.validate_file_id.return_value = True
            mock_file_service.get_file.return_value = None

            response = client.post(
                f"/files/{valid_file_id}/generate-tests",
                json={},
            )

        assert response.status_code == 404

    def test_returns_400_for_empty_markdown(self, client, valid_file_id):
        """Markdownが空の場合400を返す"""
        with patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service, patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service:
            mock_service.is_available.return_value = True
            mock_file_service.validate_file_id.return_value = True
            mock_file_service.get_file.return_value = {
                "id": valid_file_id,
                "markdown": "",
                "status": "completed",
            }

            response = client.post(
                f"/files/{valid_file_id}/generate-tests",
                json={},
            )

        assert response.status_code == 400
        assert "空" in response.json()["detail"]

    def test_returns_400_for_invalid_framework(self, client, valid_file_id, mock_file_data):
        """無効なフレームワークの場合400を返す"""
        with patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service, patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service:
            mock_service.is_available.return_value = True
            mock_file_service.validate_file_id.return_value = True
            mock_file_service.get_file.return_value = mock_file_data

            response = client.post(
                f"/files/{valid_file_id}/generate-tests",
                json={"test_framework": "invalid_framework"},
            )

        assert response.status_code == 400
        assert "無効なテストフレームワーク" in response.json()["detail"]

    def test_returns_400_for_invalid_language(self, client, valid_file_id, mock_file_data):
        """無効な言語の場合400を返す"""
        with patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service, patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service:
            mock_service.is_available.return_value = True
            mock_file_service.validate_file_id.return_value = True
            mock_file_service.get_file.return_value = mock_file_data

            response = client.post(
                f"/files/{valid_file_id}/generate-tests",
                json={"language": "ruby"},
            )

        assert response.status_code == 400
        assert "無効な言語" in response.json()["detail"]

    def test_returns_400_for_invalid_test_type(self, client, valid_file_id, mock_file_data):
        """無効なテスト種類の場合400を返す"""
        with patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service, patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service:
            mock_service.is_available.return_value = True
            mock_file_service.validate_file_id.return_value = True
            mock_file_service.get_file.return_value = mock_file_data

            response = client.post(
                f"/files/{valid_file_id}/generate-tests",
                json={"test_type": "stress"},
            )

        assert response.status_code == 400
        assert "無効なテスト種類" in response.json()["detail"]


# ===========================
# GET /files/{file_id}/generated-tests
# ===========================


class TestListGeneratedTestsEndpoint:
    """テスト生成一覧エンドポイントのテスト"""

    def test_returns_400_for_invalid_file_id(self, client):
        """無効なファイルIDの場合400を返す"""
        with patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service:
            mock_file_service.validate_file_id.return_value = False

            response = client.get("/files/invalid-id/generated-tests")

        assert response.status_code == 400

    def test_returns_404_for_nonexistent_file(self, client, valid_file_id):
        """ファイルが存在しない場合404を返す"""
        with patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service:
            mock_file_service.validate_file_id.return_value = True
            mock_file_service.get_file.return_value = None

            response = client.get(
                f"/files/{valid_file_id}/generated-tests"
            )

        assert response.status_code == 404

    def test_returns_empty_list_when_no_tests(self, client, valid_file_id, mock_file_data):
        """テストが存在しない場合空リストを返す"""
        with patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service, patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service:
            mock_file_service.validate_file_id.return_value = True
            mock_file_service.get_file.return_value = mock_file_data
            mock_service.get_generated_tests.return_value = []

            response = client.get(
                f"/files/{valid_file_id}/generated-tests"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["tests"] == []
        assert data["total_count"] == 0


# ===========================
# GET /files/{file_id}/generated-tests/{test_id}
# ===========================


class TestGetGeneratedTestEndpoint:
    """テスト生成詳細エンドポイントのテスト"""

    def test_returns_400_for_invalid_file_id(self, client):
        """無効なファイルIDの場合400を返す"""
        with patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service:
            mock_file_service.validate_file_id.return_value = False

            response = client.get(
                "/files/invalid-id/generated-tests/1"
            )

        assert response.status_code == 400

    def test_returns_404_for_nonexistent_test(self, client, valid_file_id):
        """テストが存在しない場合404を返す"""
        with patch(
            "src.api.routers.test_generation.file_service"
        ) as mock_file_service, patch(
            "src.api.routers.test_generation.test_generation_service"
        ) as mock_service:
            mock_file_service.validate_file_id.return_value = True
            mock_service.get_generated_test_by_id.return_value = None

            response = client.get(
                f"/files/{valid_file_id}/generated-tests/999"
            )

        assert response.status_code == 404
