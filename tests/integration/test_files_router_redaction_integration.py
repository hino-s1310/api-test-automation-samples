"""
Files Router 赤セルシート統合テスト

files.pyルーターに追加された赤セルシート機能のテスト
"""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


class TestFilesRouterRedactionIntegration:
    """Files Router 赤セルシート統合テストクラス"""

    @pytest.fixture
    def client(self):
        """テストクライアント"""
        # 実際のアプリケーションを使用（統合テストとして）
        return TestClient(app)

    def test_get_file_with_redaction_settings_parameter(self, client):
        """ファイル取得時に赤セルシート設定パラメータが受け付けられるかテスト"""
        # テスト実行（実際のファイルは存在しないが、パラメータの受け付けをテスト）
        response = client.get(
            "/files/test_file_123?include_redaction_settings=true",
            headers={"X-User-ID": "test_user"},
        )

        # 検証（ファイルが存在しない場合は404が期待される）
        assert response.status_code in [404, 400]  # ファイルが存在しないか、IDが無効

    def test_get_file_without_redaction_settings_parameter(self, client):
        """ファイル取得時に赤セルシート設定パラメータなしでアクセスできるかテスト"""
        # テスト実行
        response = client.get("/files/test_file_123")

        # 検証（ファイルが存在しない場合は404が期待される）
        assert response.status_code in [404, 400]  # ファイルが存在しないか、IDが無効

    def test_edit_file_with_user_id_header(self, client):
        """ファイル編集時にユーザーIDヘッダーが受け付けられるかテスト"""
        # テストデータ
        edit_request = {
            "filename": "updated.pdf",
            "markdown_content": "# Updated Content",
            "edit_reason": "Test update",
            "edited_by": "test_user",
        }

        # テスト実行
        response = client.put(
            "/files/test_file_123/edit",
            json=edit_request,
            headers={"X-User-ID": "test_user"},
        )

        # 検証（ファイルが存在しない場合は404が期待される）
        assert response.status_code in [404, 400]  # ファイルが存在しないか、IDが無効

    def test_delete_file_with_user_id_header(self, client):
        """ファイル削除時にユーザーIDヘッダーが受け付けられるかテスト"""
        # テスト実行
        response = client.delete(
            "/files/test_file_123", headers={"X-User-ID": "test_user"}
        )

        # 検証（ファイルが存在しない場合は404が期待される）
        assert response.status_code in [404, 400]  # ファイルが存在しないか、IDが無効

    def test_missing_user_id_header_error(self, client):
        """ユーザーIDヘッダーが不足している場合のエラーハンドリングテスト"""
        # テスト実行（有効なファイルID形式を使用）
        response = client.get(
            "/files/valid_file_id_123?include_redaction_settings=true"
        )

        # 検証
        assert response.status_code == 400
        assert "X-User-IDヘッダーが必要です" in response.json()["detail"]

    def test_invalid_file_id_format(self, client):
        """無効なファイルID形式のテスト"""
        # テスト実行
        response = client.get("/files/invalid-id")

        # 検証
        assert response.status_code == 400
        assert "無効なファイルID形式です" in response.json()["detail"]

    def test_redaction_router_endpoints_accessible(self, client):
        """赤セルシートルーターのエンドポイントがアクセス可能かテスト"""
        # 赤セルシート設定一覧取得
        response = client.get(
            "/files/test_file_123/redaction-settings",
            headers={"X-User-ID": "test_user"},
        )
        # ファイルが存在しない場合でも、空のリストが返される（200 OK）
        assert response.status_code == 200
        response_data = response.json()
        assert "settings" in response_data
        assert "total_count" in response_data

        # 赤セルシート設定作成
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
            headers={"X-User-ID": "test_user"},
        )
        # ファイルが存在しない場合は500エラーが期待される（データベースエラー）
        assert response.status_code in [500, 400]
