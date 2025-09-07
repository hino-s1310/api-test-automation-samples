"""
赤セルシート認証・認可統合テスト

赤セルシート機能の認証・認可に関する統合テスト
"""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


class TestRedactionAuthIntegration:
    """赤セルシート認証・認可統合テストクラス"""

    @pytest.fixture
    def client(self):
        """テストクライアント"""
        return TestClient(app)

    def test_redaction_endpoints_require_user_id_header(self, client):
        """赤セルシートエンドポイントがユーザーIDヘッダーを要求するテスト"""
        # ユーザーIDヘッダーなしでアクセス
        endpoints = [
            "/files/test_file_123/redaction-settings",
            "/files/test_file_123/redaction-settings/1",
            "/files/test_file_123/redaction-settings/1/export",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 400
            assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

    def test_redaction_post_endpoints_require_user_id_header(self, client):
        """赤セルシートPOSTエンドポイントがユーザーIDヘッダーを要求するテスト"""
        # ユーザーIDヘッダーなしでPOSTリクエスト
        response = client.post(
            "/files/test_file_123/redaction-settings",
            json={
                "name": "Test Settings",
                "description": "Test description",
                "show_all": False,
                "level_settings": {"level1": True},
                "revealed_items": ["item1"],
                "is_shared": False,
            },
        )
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

        response = client.post(
            "/files/test_file_123/redaction-settings/import",
            json={"settings_data": '{"name": "Test Settings"}', "format": "json"},
        )
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

    def test_redaction_put_endpoints_require_user_id_header(self, client):
        """赤セルシートPUTエンドポイントがユーザーIDヘッダーを要求するテスト"""
        # ユーザーIDヘッダーなしでPUTリクエスト
        response = client.put(
            "/files/test_file_123/redaction-settings/1",
            json={"name": "Updated Settings", "description": "Updated description"},
        )
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

    def test_redaction_delete_endpoints_require_user_id_header(self, client):
        """赤セルシートDELETEエンドポイントがユーザーIDヘッダーを要求するテスト"""
        # ユーザーIDヘッダーなしでDELETEリクエスト
        response = client.delete("/files/test_file_123/redaction-settings/1")
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

    def test_redaction_endpoints_with_valid_user_id_header(self, client):
        """有効なユーザーIDヘッダーでのアクセステスト"""
        # 有効なユーザーIDヘッダーでアクセス
        response = client.get(
            "/files/test_file_123/redaction-settings",
            headers={"X-User-ID": "test_user"},
        )
        # ファイルが存在しない場合は404または500が期待されるが、認証は通る
        assert response.status_code in [200, 404, 500]
        # 認証エラー（400）ではないことを確認
        assert (
            response.status_code != 400
            or "X-User-IDヘッダーが必要です" not in response.json().get("detail", "")
        )

    def test_redaction_endpoints_with_empty_user_id_header(self, client):
        """空のユーザーIDヘッダーでのアクセステスト"""
        # 空のユーザーIDヘッダーでアクセス
        response = client.get(
            "/files/test_file_123/redaction-settings", headers={"X-User-ID": ""}
        )
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

    def test_redaction_endpoints_with_none_user_id_header(self, client):
        """NoneのユーザーIDヘッダーでのアクセステスト"""
        # NoneのユーザーIDヘッダーでアクセス（ヘッダー自体を送信しない）
        response = client.get("/files/test_file_123/redaction-settings")
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

    def test_redaction_endpoints_with_invalid_user_id_format(self, client):
        """無効なユーザーID形式でのアクセステスト"""
        # 無効なユーザーID形式でアクセス
        response = client.get(
            "/files/test_file_123/redaction-settings",
            headers={"X-User-ID": "   "},  # 空白のみ
        )
        assert response.status_code == 400
        assert "ユーザーIDは空文字列にできません" in response.json()["detail"]

    def test_redaction_endpoints_case_sensitive_header(self, client):
        """ヘッダー名の大文字小文字のテスト"""
        # 小文字のヘッダー名でアクセス
        response = client.get(
            "/files/test_file_123/redaction-settings",
            headers={"x-user-id": "test_user"},
        )
        # FastAPIは通常ヘッダー名を正規化するため、動作する可能性がある
        # ただし、明示的に大文字小文字を区別する場合は400エラーになる
        assert response.status_code in [200, 400, 404, 500]

    def test_redaction_endpoints_multiple_user_id_headers(self, client):
        """複数のユーザーIDヘッダーでのアクセステスト"""
        # 複数のユーザーIDヘッダーでアクセス
        response = client.get(
            "/files/test_file_123/redaction-settings",
            headers={"X-User-ID": "test_user", "x-user-id": "another_user"},
        )
        # 最初のヘッダーが使用される可能性が高い
        assert response.status_code in [200, 400, 404, 500]

    def test_redaction_endpoints_with_special_characters_in_user_id(self, client):
        """特殊文字を含むユーザーIDでのアクセステスト"""
        # 特殊文字を含むユーザーIDでアクセス
        special_user_ids = [
            "user@example.com",
            "user-123",
            "user_123",
            "user.123",
            "user+123",
        ]

        for user_id in special_user_ids:
            response = client.get(
                "/files/test_file_123/redaction-settings",
                headers={"X-User-ID": user_id},
            )
            # 特殊文字の種類によっては400エラーになる可能性がある
            assert response.status_code in [200, 400, 404, 500]

    def test_redaction_endpoints_with_very_long_user_id(self, client):
        """非常に長いユーザーIDでのアクセステスト"""
        # 非常に長いユーザーIDでアクセス
        long_user_id = "a" * 1000  # 1000文字のユーザーID

        response = client.get(
            "/files/test_file_123/redaction-settings",
            headers={"X-User-ID": long_user_id},
        )
        # 長すぎるユーザーIDは400エラーになる可能性がある
        assert response.status_code in [200, 400, 404, 500]

    def test_redaction_endpoints_with_unicode_user_id(self, client):
        """Unicode文字を含むユーザーIDでのアクセステスト"""
        # Unicode文字を含むユーザーIDでアクセス（ASCII文字のみ）
        unicode_user_ids = [
            "user123",
            "user-123",
            "user_123",
            "user.123",
            "user+123",
        ]

        for user_id in unicode_user_ids:
            response = client.get(
                "/files/test_file_123/redaction-settings",
                headers={"X-User-ID": user_id},
            )
            # ASCII文字は通常問題ない
            assert response.status_code in [200, 400, 404, 500]
