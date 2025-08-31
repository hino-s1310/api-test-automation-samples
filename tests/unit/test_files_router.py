"""
ファイルルーターのユニットテスト

routers/files.pyの各エンドポイントの機能適合性をテスト
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.routers.files import router
from tests.unit.fixtures import (
    FileTestData,
    create_file_data,
)


class TestFilesRouter:
    """ファイルルーターのテストクラス"""

    @pytest.fixture
    def files_router_client(self):
        """ファイルルーター専用のテストクライアント"""
        from fastapi import FastAPI

        app = FastAPI()
        app.include_router(router)
        return TestClient(app)

    @pytest.fixture
    def mock_file_service(self):
        """FileServiceのモック"""
        with patch("src.api.routers.files.file_service") as mock_service:
            yield mock_service

    @pytest.fixture
    def mock_pdf_service(self):
        """PDFServiceのモック"""
        with patch("src.api.routers.files.pdf_service") as mock_service:
            yield mock_service

    @pytest.fixture
    def sample_file_id(self):
        """テスト用ファイルID"""
        return "12345678-1234-5678-9abc-123456789def"

    @pytest.fixture
    def sample_file_data(self):
        """テスト用ファイルデータ"""
        return FileTestData.valid_file_data()

    @pytest.fixture
    def sample_upload_response(self):
        """テスト用アップロードレスポンス"""
        return {
            "success": True,
            "file_id": "12345678-1234-5678-9abc-123456789def",
            "markdown": "# Test Content\n\nThis is test content.",
            "status": "completed",
        }

    @pytest.fixture
    def sample_edit_request(self):
        """テスト用編集リクエスト"""
        return {
            "filename": "updated_file.md",
            "markdown_content": "# Updated Content\n\nThis is updated content.",
            "edit_reason": "Content improvement",
            "edited_by": "test_user",
        }

    @pytest.fixture
    def sample_search_request(self):
        """テスト用検索リクエスト"""
        return {
            "query": "test",
            "status": "completed",
            "is_edited": False,
            "page": 1,
            "per_page": 10,
        }


class TestUploadPDF(TestFilesRouter):
    """PDFアップロードエンドポイントのテスト"""

    def test_upload_pdf_success(
        self, files_router_client, mock_pdf_service, sample_upload_response
    ):
        """PDFアップロード成功のテスト"""
        # モック設定
        mock_pdf_service.process_pdf_upload = AsyncMock(
            return_value=sample_upload_response
        )

        # テスト実行
        with open("tests/data/test_markdown.pdf", "rb") as f:
            response = files_router_client.post(
                "/files/upload",
                files={"file": ("test.pdf", f.read(), "application/pdf")},
            )

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "PDFファイルのアップロードと変換が完了しました"
        assert data["id"] == sample_upload_response["file_id"]
        assert data["markdown"] == sample_upload_response["markdown"]
        assert data["status"] == sample_upload_response["status"]

    def test_upload_pdf_failure(self, files_router_client, mock_pdf_service):
        """PDFアップロード失敗のテスト"""
        # モック設定
        mock_pdf_service.process_pdf_upload = AsyncMock(
            return_value={"success": False, "error": "無効なPDFファイルです"}
        )

        # テスト実行
        with open("tests/data/test_markdown.pdf", "rb") as f:
            response = files_router_client.post(
                "/files/upload",
                files={"file": ("test.pdf", f.read(), "application/pdf")},
            )

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "無効なPDFファイルです" in data["detail"]

    def test_upload_pdf_service_exception(self, files_router_client, mock_pdf_service):
        """PDFサービスで例外が発生した場合のテスト"""
        # モック設定
        mock_pdf_service.process_pdf_upload = AsyncMock(
            side_effect=Exception("Service error")
        )

        # テスト実行
        with open("tests/data/test_markdown.pdf", "rb") as f:
            response = files_router_client.post(
                "/files/upload",
                files={"file": ("test.pdf", f.read(), "application/pdf")},
            )

        # アサーション
        assert response.status_code == 500
        data = response.json()
        assert "ファイル処理中にエラーが発生しました" in data["detail"]


class TestGetFile(TestFilesRouter):
    """ファイル取得エンドポイントのテスト"""

    def test_get_file_success(
        self, files_router_client, mock_file_service, sample_file_id, sample_file_data
    ):
        """ファイル取得成功のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.get_file.return_value = sample_file_data

        # テスト実行
        response = files_router_client.get(f"/files/{sample_file_id}")

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_file_data["id"]
        assert data["filename"] == sample_file_data["filename"]
        assert data["markdown"] == sample_file_data["markdown_content"]
        assert data["status"] == sample_file_data["status"]

    def test_get_file_invalid_id(self, files_router_client, mock_file_service):
        """無効なファイルIDでのテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = False

        # テスト実行
        response = files_router_client.get("/files/invalid-id")

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "無効なファイルID形式です" in data["detail"]

    def test_get_file_not_found(
        self, files_router_client, mock_file_service, sample_file_id
    ):
        """ファイルが見つからない場合のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.get_file.return_value = None

        # テスト実行
        response = files_router_client.get(f"/files/{sample_file_id}")

        # アサーション
        assert response.status_code == 404
        data = response.json()
        assert "ファイルが見つかりません" in data["detail"]


class TestListFiles(TestFilesRouter):
    """ファイル一覧取得エンドポイントのテスト"""

    def test_list_files_success(self, files_router_client, mock_file_service):
        """ファイル一覧取得成功のテスト"""
        # モック設定
        mock_response = {
            "files": [FileTestData.valid_file_data()],
            "total_count": 1,
            "page": 1,
            "per_page": 10,
        }
        mock_file_service.list_files.return_value = mock_response

        # テスト実行
        response = files_router_client.get("/files/")

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert len(data["files"]) == 1
        assert data["total_count"] == 1
        assert data["page"] == 1
        assert data["per_page"] == 10

    def test_list_files_with_pagination(self, files_router_client, mock_file_service):
        """ページネーション付きファイル一覧取得のテスト"""
        # モック設定
        mock_response = {
            "files": [FileTestData.valid_file_data()],
            "total_count": 25,
            "page": 2,
            "per_page": 5,
        }
        mock_file_service.list_files.return_value = mock_response

        # テスト実行
        response = files_router_client.get("/files/?page=2&per_page=5")

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["per_page"] == 5
        assert data["total_count"] == 25

    def test_list_files_validation_error(self, files_router_client):
        """バリデーションエラーのテスト"""
        # テスト実行（無効なページ番号）
        response = files_router_client.get("/files/?page=0")

        # アサーション
        assert response.status_code == 422


class TestSearchFiles(TestFilesRouter):
    """ファイル検索エンドポイントのテスト"""

    def test_search_files_success(
        self, files_router_client, mock_file_service, sample_search_request
    ):
        """ファイル検索成功のテスト"""
        # モック設定
        mock_response = {
            "files": [FileTestData.valid_file_data()],
            "total_count": 1,
            "page": 1,
            "per_page": 10,
        }
        mock_file_service.search_files.return_value = mock_response

        # テスト実行
        response = files_router_client.post("/files/search", json=sample_search_request)

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        assert "total_count" in data
        assert "filters" in data
        assert data["filters"]["query"] == "test"

    def test_search_files_with_filters(self, files_router_client, mock_file_service):
        """フィルター付き検索のテスト"""
        # モック設定
        mock_response = {
            "files": [],
            "total_count": 0,
            "page": 1,
            "per_page": 10,
        }
        mock_file_service.search_files.return_value = mock_response

        # テスト実行
        search_data = {
            "status": "completed",
            "is_edited": True,
            "page": 2,
            "per_page": 5,
        }
        response = files_router_client.post("/files/search", json=search_data)

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert data["filters"]["status"] == "completed"
        assert data["filters"]["is_edited"] is True

    def test_search_files_service_exception(
        self, files_router_client, mock_file_service
    ):
        """検索サービスで例外が発生した場合のテスト"""
        # モック設定
        mock_file_service.search_files.side_effect = Exception("Search error")

        # テスト実行
        response = files_router_client.post("/files/search", json={"query": "test"})

        # アサーション
        assert response.status_code == 500
        data = response.json()
        assert "ファイル検索中にエラーが発生しました" in data["detail"]


class TestUpdateFile(TestFilesRouter):
    """ファイル更新エンドポイントのテスト"""

    def test_update_file_success(
        self, files_router_client, mock_file_service, mock_pdf_service, sample_file_id
    ):
        """ファイル更新成功のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_pdf_service.reconvert_pdf = AsyncMock(return_value={"success": True})

        updated_file_data = create_file_data(
            id=sample_file_id,
            filename="updated.pdf",
            markdown_content="# Updated Content",
            status="completed",
        )
        mock_file_service.get_file.return_value = updated_file_data

        # テスト実行
        with open("tests/data/test_markdown.pdf", "rb") as f:
            response = files_router_client.put(
                f"/files/{sample_file_id}",
                files={"file": ("updated.pdf", f.read(), "application/pdf")},
            )

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_file_id
        assert data["filename"] == "updated.pdf"

    def test_update_file_invalid_id(self, files_router_client, mock_file_service):
        """無効なファイルIDでの更新テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = False

        # テスト実行
        with open("tests/data/test_markdown.pdf", "rb") as f:
            response = files_router_client.put(
                "/files/invalid-id",
                files={"file": ("test.pdf", f.read(), "application/pdf")},
            )

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "無効なファイルID形式です" in data["detail"]

    def test_update_file_reconvert_failure(
        self, files_router_client, mock_file_service, mock_pdf_service, sample_file_id
    ):
        """再変換失敗のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_pdf_service.reconvert_pdf = AsyncMock(
            return_value={"success": False, "error": "Conversion failed"}
        )

        # テスト実行
        with open("tests/data/test_markdown.pdf", "rb") as f:
            response = files_router_client.put(
                f"/files/{sample_file_id}",
                files={"file": ("test.pdf", f.read(), "application/pdf")},
            )

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "Conversion failed" in data["detail"]


class TestDeleteFile(TestFilesRouter):
    """ファイル削除エンドポイントのテスト"""

    def test_delete_file_success(
        self, files_router_client, mock_file_service, sample_file_id
    ):
        """ファイル削除成功のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.delete_file.return_value = True

        # テスト実行
        response = files_router_client.delete(f"/files/{sample_file_id}")

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert "ファイルが正常に削除されました" in data["message"]

    def test_delete_file_invalid_id(self, files_router_client, mock_file_service):
        """無効なファイルIDでの削除テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = False

        # テスト実行
        response = files_router_client.delete("/files/invalid-id")

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "無効なファイルID形式です" in data["detail"]

    def test_delete_file_not_found(
        self, files_router_client, mock_file_service, sample_file_id
    ):
        """存在しないファイルの削除テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.delete_file.return_value = False

        # テスト実行
        response = files_router_client.delete(f"/files/{sample_file_id}")

        # アサーション
        assert response.status_code == 404
        data = response.json()
        assert "ファイルが見つかりません" in data["detail"]


class TestEditFile(TestFilesRouter):
    """ファイル編集エンドポイントのテスト"""

    def test_edit_file_success(
        self,
        files_router_client,
        mock_file_service,
        sample_file_id,
        sample_edit_request,
    ):
        """ファイル編集成功のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.edit_file.return_value = {
            "success": True,
            "filename": "updated_file.md",
            "markdown": "# Updated Content",
            "status": "completed",
            "updated_at": "2024-01-01T00:00:00Z",
            "last_edited_at": "2024-01-01T00:00:00Z",
            "edit_count": 1,
            "is_edited": True,
        }

        # テスト実行
        response = files_router_client.put(
            f"/files/{sample_file_id}/edit", json=sample_edit_request
        )

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_file_id
        assert data["filename"] == "updated_file.md"
        assert data["edit_count"] == 1
        assert data["is_edited"] is True

    def test_edit_file_invalid_id(self, files_router_client, mock_file_service):
        """無効なファイルIDでの編集テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = False

        # テスト実行
        response = files_router_client.put(
            "/files/invalid-id/edit", json={"filename": "test.md"}
        )

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "無効なファイルID形式です" in data["detail"]

    def test_edit_file_service_failure(
        self,
        files_router_client,
        mock_file_service,
        sample_file_id,
        sample_edit_request,
    ):
        """編集サービス失敗のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.edit_file.return_value = {
            "success": False,
            "error": "Edit failed",
        }

        # テスト実行
        response = files_router_client.put(
            f"/files/{sample_file_id}/edit", json=sample_edit_request
        )

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "Edit failed" in data["detail"]


class TestBatchDeleteFiles(TestFilesRouter):
    """一括削除エンドポイントのテスト"""

    def test_batch_delete_success(self, files_router_client, mock_file_service):
        """一括削除成功のテスト"""
        # モック設定
        mock_file_service.batch_delete_files.return_value = {
            "success": True,
            "deleted_count": 2,
            "failed_count": 0,
            "failed_files": [],
        }

        # テスト実行
        response = files_router_client.delete(
            "/files/batch-delete", params={"file_ids": ["file1", "file2"]}
        )

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert "2件のファイルが一括削除されました" in data["message"]
        assert data["deleted_count"] == 2
        assert data["failed_count"] == 0

    def test_batch_delete_empty_file_ids(self, files_router_client):
        """空のファイルIDリストでのテスト"""
        # テスト実行
        response = files_router_client.delete(
            "/files/batch-delete", params={"file_ids": []}
        )

        # アサーション
        # FastAPIのバリデーションで422エラーが返される
        assert response.status_code == 422

    def test_batch_delete_service_failure(self, files_router_client, mock_file_service):
        """一括削除サービス失敗のテスト"""
        # モック設定
        mock_file_service.batch_delete_files.return_value = {
            "success": False,
            "error": "Batch delete failed",
        }

        # テスト実行
        response = files_router_client.delete(
            "/files/batch-delete", params={"file_ids": ["file1"]}
        )

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "Batch delete failed" in data["detail"]


class TestFileLogs(TestFilesRouter):
    """ファイルログ取得エンドポイントのテスト"""

    def test_get_file_logs_success(
        self, files_router_client, mock_file_service, sample_file_id
    ):
        """ファイルログ取得成功のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.get_conversion_logs.return_value = [
            {"id": 1, "action": "upload", "status": "success"}
        ]

        # テスト実行
        response = files_router_client.get(f"/files/{sample_file_id}/logs")

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert len(data["logs"]) == 1

    def test_get_file_logs_invalid_id(self, files_router_client, mock_file_service):
        """無効なファイルIDでのログ取得テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = False

        # テスト実行
        response = files_router_client.get("/files/invalid-id/logs")

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "無効なファイルID形式です" in data["detail"]


class TestFileEditHistory(TestFilesRouter):
    """ファイル編集履歴取得エンドポイントのテスト"""

    def test_get_file_edit_history_success(
        self, files_router_client, mock_file_service, sample_file_id
    ):
        """編集履歴取得成功のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.get_file_edit_history.return_value = [
            {
                "id": 1,
                "file_id": sample_file_id,
                "original_filename": "original.md",
                "edited_filename": "edited.md",
                "original_content": "# Original Content",
                "edited_content": "# Edited Content",
                "edited_by": "test_user",
                "created_at": "2024-01-01T00:00:00Z",
            }
        ]

        # テスト実行
        response = files_router_client.get(f"/files/{sample_file_id}/history")

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert len(data["history"]) == 1

    def test_get_file_edit_history_invalid_id(
        self, files_router_client, mock_file_service
    ):
        """無効なファイルIDでの履歴取得テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = False

        # テスト実行
        response = files_router_client.get("/files/invalid-id/history")

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "無効なファイルID形式です" in data["detail"]


class TestFileRevert(TestFilesRouter):
    """ファイル復元エンドポイントのテスト"""

    def test_revert_file_success(
        self, files_router_client, mock_file_service, sample_file_id
    ):
        """ファイル復元成功のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.revert_file_to_version.return_value = {
            "success": True,
            "filename": "reverted.md",
            "markdown": "# Reverted Content",
            "status": "completed",
            "updated_at": "2024-01-01T00:00:00Z",
            "last_edited_at": "2024-01-01T00:00:00Z",
            "edit_count": 2,
            "is_edited": True,
        }

        # テスト実行
        response = files_router_client.post(
            f"/files/{sample_file_id}/revert", params={"history_id": 1}
        )

        # アサーション
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_file_id
        assert "履歴ID 1 のバージョンに復元されました" in data["message"]

    def test_revert_file_invalid_id(self, files_router_client, mock_file_service):
        """無効なファイルIDでの復元テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = False

        # テスト実行
        response = files_router_client.post(
            "/files/invalid-id/revert", params={"history_id": 1}
        )

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "無効なファイルID形式です" in data["detail"]

    def test_revert_file_service_failure(
        self, files_router_client, mock_file_service, sample_file_id
    ):
        """復元サービス失敗のテスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.revert_file_to_version.return_value = {
            "success": False,
            "error": "Revert failed",
        }

        # テスト実行
        response = files_router_client.post(
            f"/files/{sample_file_id}/revert", params={"history_id": 1}
        )

        # アサーション
        assert response.status_code == 400
        data = response.json()
        assert "Revert failed" in data["detail"]


# ===============================
# パラメータ化テスト
# ===============================


class TestFilesRouterParameterized(TestFilesRouter):
    """ファイルルーターのパラメータ化テスト"""

    @pytest.mark.parametrize(
        "file_id,expected_valid",
        [
            ("12345678-1234-5678-9abc-123456789def", True),
            ("87654321-4321-8765-fedc-987654321abc", True),
            ("invalid-id", False),
            ("123", False),
            ("", False),
        ],
    )
    def test_file_id_validation_across_endpoints(
        self, files_router_client, mock_file_service, file_id, expected_valid
    ):
        """各エンドポイントでのファイルID検証テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = expected_valid
        if expected_valid:
            mock_file_service.get_file.return_value = FileTestData.valid_file_data()

        # 各エンドポイントでテスト
        endpoints = [
            f"/files/{file_id}",
            f"/files/{file_id}/logs",
            f"/files/{file_id}/history",
        ]

        for endpoint in endpoints:
            response = files_router_client.get(endpoint)
            if expected_valid:
                # 有効なIDの場合、ファイルが見つからない場合は404
                assert response.status_code in [200, 404]
            else:
                # 無効なIDの場合、400エラー
                # ただし、空文字列の場合はファイル一覧エンドポイントが呼ばれる
                if file_id == "":
                    # ファイル一覧エンドポイントの場合は200、その他のエンドポイントは404
                    if "logs" in endpoint or "history" in endpoint:
                        assert response.status_code == 404
                    else:
                        assert response.status_code == 200
                else:
                    assert response.status_code == 400

    @pytest.mark.parametrize(
        "page,per_page,expected_status",
        [
            (1, 10, 200),
            (2, 5, 200),
            (0, 10, 422),  # 無効なページ番号
            (1, 0, 422),  # 無効な件数
            (1, 101, 422),  # 上限超過
        ],
    )
    def test_pagination_validation(
        self, files_router_client, page, per_page, expected_status
    ):
        """ページネーションパラメータのバリデーションテスト"""
        response = files_router_client.get(f"/files/?page={page}&per_page={per_page}")
        assert response.status_code == expected_status


# ===============================
# エラーハンドリングテスト
# ===============================


class TestFilesRouterErrorHandling(TestFilesRouter):
    """ファイルルーターのエラーハンドリングテスト"""

    def test_upload_pdf_file_read_error(self, files_router_client, mock_pdf_service):
        """ファイル読み込みエラーのテスト"""
        # モック設定
        mock_pdf_service.process_pdf_upload = AsyncMock(
            side_effect=Exception("File read error")
        )

        # テスト実行
        with open("tests/data/test_markdown.pdf", "rb") as f:
            response = files_router_client.post(
                "/files/upload",
                files={"file": ("test.pdf", f.read(), "application/pdf")},
            )

        # アサーション
        assert response.status_code == 500
        data = response.json()
        assert "ファイル処理中にエラーが発生しました" in data["detail"]

    def test_service_methods_exception_handling(
        self, files_router_client, mock_file_service, sample_file_id
    ):
        """各サービスメソッドでの例外処理テスト"""
        # モック設定
        mock_file_service.validate_file_id.return_value = True
        mock_file_service.get_file.side_effect = Exception("Service error")

        # テスト実行
        response = files_router_client.get(f"/files/{sample_file_id}")

        # アサーション
        assert response.status_code == 500
        data = response.json()
        assert "ファイル処理中にエラーが発生しました" in data["detail"]

    def test_async_service_methods_exception_handling(
        self, files_router_client, mock_pdf_service, sample_file_id
    ):
        """非同期サービスメソッドでの例外処理テスト"""
        # モック設定
        mock_pdf_service.reconvert_pdf = AsyncMock(
            side_effect=Exception("Async service error")
        )

        # テスト実行
        with open("tests/data/test_markdown.pdf", "rb") as f:
            response = files_router_client.put(
                f"/files/{sample_file_id}",
                files={"file": ("test.pdf", f.read(), "application/pdf")},
            )

        # アサーション
        assert response.status_code == 500
        data = response.json()
        assert "ファイル更新中にエラーが発生しました" in data["detail"]
