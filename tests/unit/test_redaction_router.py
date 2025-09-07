"""
RedactionRouterのテスト

機密情報設定ルーターのテストを実装
"""

from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.routers.redaction import get_persistence_service, get_redaction_service
from src.api.services.redaction_persistence_service import RedactionPersistenceService
from src.api.services.redaction_service import RedactionService


class TestRedactionRouter:
    """RedactionRouterのテストクラス"""

    @pytest.fixture
    def mock_redaction_service(self):
        """モックRedactionService"""
        return Mock(spec=RedactionService)

    @pytest.fixture
    def mock_persistence_service(self):
        """モックRedactionPersistenceService"""
        return Mock(spec=RedactionPersistenceService)

    @pytest.fixture
    def client(self, mock_redaction_service, mock_persistence_service):
        """テストクライアント"""
        # dependency_overridesを使用してサービスをモックに置き換える

        app.dependency_overrides = {
            get_redaction_service: lambda: mock_redaction_service,
            get_persistence_service: lambda: mock_persistence_service,
        }
        yield TestClient(app)
        # テスト後にクリーンアップ
        app.dependency_overrides.clear()

    def test_get_redaction_settings_success(self, client, mock_redaction_service):
        """機密情報設定の取得成功テスト"""
        # テストデータ（循環参照を避けるため固定値を使用）
        file_id = "test_file_123"
        settings_id = 1
        expected_result = {
            "id": "1",
            "file_id": file_id,
            "user_id": "test_user",
            "name": "Test Settings",
            "description": "Test description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }
        mock_redaction_service.get_redaction_settings.return_value = expected_result

        # テスト実行
        response = client.get(
            f"/files/{file_id}/redaction-settings/{settings_id}",
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 200
        assert response.json() == expected_result
        mock_redaction_service.get_redaction_settings.assert_called_once_with(
            settings_id
        )

    def test_get_redaction_settings_not_found(self, client, mock_redaction_service):
        """機密情報設定の取得失敗テスト"""
        # モックの設定
        mock_redaction_service.get_redaction_settings.return_value = None

        # テスト実行
        response = client.get(
            "/files/test_file_123/redaction-settings/999",
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 404
        assert "機密情報設定が見つかりません" in response.json()["detail"]

    def test_create_redaction_settings_success(self, client, mock_redaction_service):
        """機密情報設定の作成成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        request_data = {
            "name": "Test Settings",
            "description": "Test description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
        }
        expected_result = {
            "id": "1",
            "file_id": file_id,
            "user_id": "test_user",
            **request_data,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }
        mock_redaction_service.create_redaction_settings.return_value = expected_result

        # テスト実行
        response = client.post(
            f"/files/{file_id}/redaction-settings",
            json=request_data,
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 201
        assert response.json() == expected_result
        mock_redaction_service.create_redaction_settings.assert_called_once()

    def test_create_redaction_settings_validation_error(
        self, client, mock_redaction_service
    ):
        """機密情報設定の作成バリデーションエラーテスト"""
        # モックの設定
        from src.api.repositories.redaction_repository import RedactionValidationError

        mock_redaction_service.create_redaction_settings.side_effect = (
            RedactionValidationError("バリデーションエラー")
        )

        # テスト実行
        response = client.post(
            "/files/test_file_123/redaction-settings",
            json={"name": ""},  # 無効なデータ
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 400
        assert "バリデーションエラー" in response.json()["detail"]

    def test_update_redaction_settings_success(self, client, mock_redaction_service):
        """機密情報設定の更新成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        settings_id = 1
        request_data = {
            "name": "Updated Settings",
            "description": "Updated description",
        }
        expected_result = {
            "id": "1",
            "file_id": file_id,
            "user_id": "test_user",
            "name": "Updated Settings",
            "description": "Updated description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }
        mock_redaction_service.update_redaction_settings.return_value = expected_result

        # テスト実行
        response = client.put(
            f"/files/{file_id}/redaction-settings/{settings_id}",
            json=request_data,
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 200
        assert response.json() == expected_result
        mock_redaction_service.update_redaction_settings.assert_called_once()

    def test_update_redaction_settings_not_found(self, client, mock_redaction_service):
        """機密情報設定の更新失敗テスト"""
        # モックの設定
        mock_redaction_service.update_redaction_settings.return_value = None

        # テスト実行
        response = client.put(
            "/files/test_file_123/redaction-settings/999",
            json={"name": "Updated Settings"},
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 404
        assert "機密情報設定が見つかりません" in response.json()["detail"]

    def test_delete_redaction_settings_success(self, client, mock_redaction_service):
        """機密情報設定の削除成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        settings_id = 1
        mock_redaction_service.delete_redaction_settings.return_value = True

        # テスト実行
        response = client.delete(
            f"/files/{file_id}/redaction-settings/{settings_id}",
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 204
        mock_redaction_service.delete_redaction_settings.assert_called_once_with(
            settings_id
        )

    def test_delete_redaction_settings_not_found(self, client, mock_redaction_service):
        """機密情報設定の削除失敗テスト"""
        # モックの設定
        mock_redaction_service.delete_redaction_settings.return_value = False

        # テスト実行
        response = client.delete(
            "/files/test_file_123/redaction-settings/999",
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 404
        assert "機密情報設定が見つかりません" in response.json()["detail"]

    def test_list_redaction_settings_success(self, client, mock_redaction_service):
        """機密情報設定の一覧取得成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        expected_result = {
            "settings": [
                {
                    "id": "1",
                    "file_id": file_id,
                    "user_id": "test_user",
                    "name": "Test Settings 1",
                    "description": "Test description 1",
                    "show_all": False,
                    "level_settings": {"level1": True},
                    "revealed_items": ["item1"],
                    "is_shared": False,
                    "created_at": "2024-01-01T00:00:00",
                    "updated_at": "2024-01-01T00:00:00",
                },
                {
                    "id": "2",
                    "file_id": file_id,
                    "user_id": "test_user",
                    "name": "Test Settings 2",
                    "description": "Test description 2",
                    "show_all": True,
                    "level_settings": {"level1": False, "level2": True},
                    "revealed_items": ["item2"],
                    "is_shared": True,
                    "created_at": "2024-01-01T00:00:00",
                    "updated_at": "2024-01-01T00:00:00",
                },
            ],
            "total_count": 2,
            "limit": 10,
            "offset": 0,
        }
        mock_redaction_service.list_redaction_settings.return_value = expected_result

        # テスト実行
        response = client.get(
            f"/files/{file_id}/redaction-settings", headers={"X-User-ID": "test_user"}
        )

        # 検証
        assert response.status_code == 200
        assert response.json() == expected_result
        mock_redaction_service.list_redaction_settings.assert_called_once()

    def test_export_redaction_settings_success(self, client, mock_persistence_service):
        """機密情報設定のエクスポート成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        settings_id = 1
        mock_persistence_service.export_settings_to_json.return_value = (
            '{"name": "Test Settings"}'
        )

        # テスト実行
        response = client.get(
            f"/files/{file_id}/redaction-settings/{settings_id}/export",
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]
        mock_persistence_service.export_settings_to_json.assert_called_once_with(
            settings_id
        )

    def test_export_redaction_settings_not_found(
        self, client, mock_persistence_service
    ):
        """機密情報設定のエクスポート失敗テスト"""
        # モックの設定
        mock_persistence_service.export_settings_to_json.side_effect = ValueError(
            "設定が見つかりません"
        )

        # テスト実行
        response = client.get(
            "/files/test_file_123/redaction-settings/999/export",
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 404
        assert "設定が見つかりません" in response.json()["detail"]

    def test_import_redaction_settings_success(self, client, mock_persistence_service):
        """機密情報設定のインポート成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        settings_data = {
            "name": "Imported Settings",
            "description": "Imported description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
        }
        request_data = {
            "settings_data": '{"name": "Imported Settings", "description": "Imported description", "show_all": false, "level_settings": {"level1": true}, "revealed_items": ["item1"], "is_shared": false}',
            "format": "json",
        }
        expected_result = {
            "id": "1",
            "file_id": file_id,
            "user_id": "test_user",
            **settings_data,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }
        mock_persistence_service.import_settings_from_json.return_value = (
            expected_result
        )

        # テスト実行
        response = client.post(
            f"/files/{file_id}/redaction-settings/import",
            json=request_data,
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 201
        assert response.json() == expected_result
        mock_persistence_service.import_settings_from_json.assert_called_once()

    def test_import_redaction_settings_validation_error(
        self, client, mock_persistence_service
    ):
        """機密情報設定のインポートバリデーションエラーテスト"""
        # モックの設定
        from src.api.repositories.redaction_repository import RedactionValidationError

        mock_persistence_service.import_settings_from_json.side_effect = (
            RedactionValidationError("バリデーションエラー")
        )

        # テスト実行
        response = client.post(
            "/files/test_file_123/redaction-settings/import",
            json={"settings_data": '{"name": ""}', "format": "json"},  # 無効なデータ
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 400
        assert "バリデーションエラー" in response.json()["detail"]

    def test_missing_user_id_header(self, client):
        """ユーザーIDヘッダーが不足している場合のテスト"""
        # テスト実行
        response = client.post(
            "/files/test_file_123/redaction-settings", json={"name": "Test Settings"}
        )

        # 検証
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

    def test_invalid_file_id_format(self, client, mock_redaction_service):
        """無効なファイルID形式のテスト"""
        # モックの設定
        mock_redaction_service.get_redaction_settings.return_value = {
            "id": "1",
            "file_id": "invalid-id",
            "user_id": "test_user",
            "name": "Test Settings",
            "description": "Test description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }

        # テスト実行
        response = client.get(
            "/files/invalid-id/redaction-settings/1", headers={"X-User-ID": "test_user"}
        )

        # 検証
        assert response.status_code == 200  # モックが返されるため200になる
        assert response.json()["file_id"] == "invalid-id"

    def test_invalid_settings_id_format(self, client):
        """無効な設定ID形式のテスト"""
        # テスト実行
        response = client.get(
            "/files/test_file_123/redaction-settings/invalid-id",
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 422  # FastAPIの自動バリデーションエラー

    def test_database_error_handling(self, client, mock_redaction_service):
        """データベースエラーハンドリングのテスト"""
        # モックの設定
        from src.api.repositories.redaction_repository import RedactionDatabaseError

        mock_redaction_service.get_redaction_settings.side_effect = (
            RedactionDatabaseError("データベースエラー")
        )

        # テスト実行
        response = client.get(
            "/files/test_file_123/redaction-settings/1",
            headers={"X-User-ID": "test_user"},
        )

        # 検証
        assert response.status_code == 500
        assert "データベースエラー" in response.json()["detail"]

    def test_unauthorized_access(self, client):
        """認証されていないアクセスのテスト"""
        # テスト実行
        response = client.get("/files/test_file_123/redaction-settings/1")

        # 検証
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]
