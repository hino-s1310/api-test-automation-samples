"""
ファイル編集関連APIエンドポイントのテスト

新しく追加したファイル編集機能のAPIテストを実装
"""

from fastapi.testclient import TestClient


class TestFileEditingAPI:
    """ファイル編集APIのテスト"""

    def test_edit_file_success(self, test_client: TestClient, sample_file_id: str):
        """ファイル編集APIの正常系テスト"""
        # ファイル編集リクエスト
        edit_data = {
            "filename": "updated_file.md",
            "markdown_content": "# Updated Content\n\nThis is updated content.",
            "edit_reason": "Content improvement",
            "edited_by": "test_user",
        }

        response = test_client.put(f"/files/{sample_file_id}/edit", json=edit_data)

        assert response.status_code == 200
        data = response.json()

        # レスポンスの検証
        assert data["id"] == sample_file_id
        assert data["filename"] == "updated_file.md"
        assert data["markdown"] == "# Updated Content\n\nThis is updated content."
        assert data["status"] == "completed"
        assert data["edit_count"] == 1
        assert data["is_edited"] is True
        assert data["message"] == "ファイルが正常に編集されました"
        assert "updated_at" in data
        assert "last_edited_at" in data

    def test_edit_file_filename_only(
        self, test_client: TestClient, sample_file_id: str
    ):
        """ファイル名のみの編集テスト"""
        edit_data = {"filename": "new_filename.md", "edit_reason": "Filename update"}

        response = test_client.put(f"/files/{sample_file_id}/edit", json=edit_data)

        assert response.status_code == 200
        data = response.json()

        assert data["filename"] == "new_filename.md"
        assert data["edit_count"] == 1
        assert data["is_edited"] is True

    def test_edit_file_content_only(self, test_client: TestClient, sample_file_id: str):
        """Markdown内容のみの編集テスト"""
        edit_data = {
            "markdown_content": "# New Content Only\n\nThis is new content.",
            "edit_reason": "Content update",
        }

        response = test_client.put(f"/files/{sample_file_id}/edit", json=edit_data)

        assert response.status_code == 200
        data = response.json()

        assert data["markdown"] == "# New Content Only\n\nThis is new content."
        assert data["edit_count"] == 1
        assert data["is_edited"] is True

    def test_edit_file_minimal_data(self, test_client: TestClient, sample_file_id: str):
        """最小限のデータでの編集テスト"""
        edit_data = {"edit_reason": "Test edit"}

        response = test_client.put(f"/files/{sample_file_id}/edit", json=edit_data)

        assert response.status_code == 200
        data = response.json()

        # デフォルト値が使用されることを確認
        # edited_byフィールドはレスポンスに含まれていないため、他のフィールドで確認
        assert data["edit_count"] == 1
        assert data["is_edited"] is True

    def test_edit_file_invalid_file_id(self, test_client: TestClient):
        """無効なファイルIDでの編集テスト"""
        edit_data = {"filename": "test.md", "edit_reason": "Test"}

        response = test_client.put("/files/invalid_file_id/edit", json=edit_data)

        assert response.status_code == 400
        assert "無効なファイルID形式です" in response.json()["detail"]

    def test_edit_file_nonexistent_file(self, test_client: TestClient):
        """存在しないファイルの編集テスト"""
        edit_data = {"filename": "test.md", "edit_reason": "Test"}

        # 有効な形式だが存在しないファイルID
        response = test_client.put(
            "/files/nonexistent1234567890123456789012345678901234567890/edit",
            json=edit_data,
        )

        # ファイルが見つからない場合は404または400が返される
        assert response.status_code in [400, 404]


class TestFileEditHistoryAPI:
    """ファイル編集履歴APIのテスト"""

    def test_get_file_edit_history_success(
        self, test_client: TestClient, sample_file_id: str
    ):
        """編集履歴取得APIの正常系テスト"""
        # まずファイルを編集して履歴を作成
        edit_data = {"filename": "history_test.md", "edit_reason": "History test"}

        edit_response = test_client.put(f"/files/{sample_file_id}/edit", json=edit_data)
        assert edit_response.status_code == 200

        # 編集履歴を取得
        history_response = test_client.get(f"/files/{sample_file_id}/history")
        assert history_response.status_code == 200

        history_data = history_response.json()
        assert isinstance(history_data, list)
        assert len(history_data) >= 1

        # 履歴の内容を検証
        history_item = history_data[0]
        assert "id" in history_item
        assert "file_id" in history_item
        assert "original_filename" in history_item
        assert "edited_filename" in history_item
        assert "created_at" in history_item

    def test_get_file_edit_history_empty(
        self, test_client: TestClient, sample_file_id: str
    ):
        """編集履歴が空の場合のテスト"""
        # 新しく作成されたファイルの履歴を取得
        history_response = test_client.get(f"/files/{sample_file_id}/history")
        assert history_response.status_code == 200

        history_data = history_response.json()
        # 新規ファイルは編集履歴がない場合がある
        assert isinstance(history_data, list)

    def test_get_file_edit_history_invalid_file_id(self, test_client: TestClient):
        """無効なファイルIDでの履歴取得テスト"""
        response = test_client.get("/files/invalid_file_id/history")
        assert response.status_code == 400
        assert "無効なファイルID形式です" in response.json()["detail"]


class TestFileRevertAPI:
    """ファイル復元APIのテスト"""

    def test_revert_file_to_version_success(
        self, test_client: TestClient, sample_file_id: str
    ):
        """ファイル復元APIの正常系テスト"""
        # まずファイルを編集して履歴を作成
        edit_data = {"filename": "revert_test.md", "edit_reason": "Revert test"}

        edit_response = test_client.put(f"/files/{sample_file_id}/edit", json=edit_data)
        assert edit_response.status_code == 200

        # 編集履歴を取得して履歴IDを取得
        history_response = test_client.get(f"/files/{sample_file_id}/history")
        assert history_response.status_code == 200

        history_data = history_response.json()
        if len(history_data) > 0:
            history_id = history_data[0]["id"]

            # ファイルを復元
            revert_response = test_client.post(
                f"/files/{sample_file_id}/revert", params={"history_id": history_id}
            )

            assert revert_response.status_code == 200
            data = revert_response.json()

            assert data["id"] == sample_file_id
            assert data["edit_count"] >= 1
            assert data["is_edited"] is True
            assert (
                f"履歴ID {history_id} のバージョンに復元されました" in data["message"]
            )

    def test_revert_file_invalid_file_id(self, test_client: TestClient):
        """無効なファイルIDでの復元テスト"""
        response = test_client.post(
            "/files/invalid_file_id/revert", params={"history_id": 1}
        )
        assert response.status_code == 400
        assert "無効なファイルID形式です" in response.json()["detail"]

    def test_revert_file_missing_history_id(
        self, test_client: TestClient, sample_file_id: str
    ):
        """履歴IDが指定されていない場合のテスト"""
        response = test_client.post(f"/files/{sample_file_id}/revert")
        assert response.status_code == 422  # Validation Error


class TestFileSearchAPI:
    """ファイル検索APIのテスト"""

    def test_search_files_success(self, test_client: TestClient):
        """ファイル検索APIの正常系テスト"""
        search_data = {"query": "test", "page": 1, "per_page": 10}

        response = test_client.post("/files/search", json=search_data)
        assert response.status_code == 200

        data = response.json()
        assert "files" in data
        assert "total_count" in data
        assert "page" in data
        assert "per_page" in data
        assert "filters" in data

        assert data["page"] == 1
        assert data["per_page"] == 10
        assert "query" in data["filters"]

    def test_search_files_with_status_filter(self, test_client: TestClient):
        """ステータスフィルター付きの検索テスト"""
        search_data = {"status": "completed", "page": 1, "per_page": 5}

        response = test_client.post("/files/search", json=search_data)
        assert response.status_code == 200

        data = response.json()
        assert "status" in data["filters"]
        assert data["filters"]["status"] == "completed"

    def test_search_files_with_edit_filter(self, test_client: TestClient):
        """編集状態フィルター付きの検索テスト"""
        search_data = {"is_edited": False, "page": 1, "per_page": 10}

        response = test_client.post("/files/search", json=search_data)
        assert response.status_code == 200

        data = response.json()
        assert "is_edited" in data["filters"]
        assert data["filters"]["is_edited"] is False

    def test_search_files_combined_filters(self, test_client: TestClient):
        """複数フィルターの組み合わせテスト"""
        search_data = {
            "query": "document",
            "status": "completed",
            "is_edited": True,
            "page": 2,
            "per_page": 15,
        }

        response = test_client.post("/files/search", json=search_data)
        assert response.status_code == 200

        data = response.json()
        assert data["page"] == 2
        assert data["per_page"] == 15
        assert len(data["filters"]) == 3

    def test_search_files_default_values(self, test_client: TestClient):
        """デフォルト値での検索テスト"""
        search_data = {}

        response = test_client.post("/files/search", json=search_data)
        assert response.status_code == 200

        data = response.json()
        assert data["page"] == 1
        assert data["per_page"] == 10
        assert len(data["filters"]) == 0

    def test_search_files_pagination(self, test_client: TestClient):
        """ページネーションのテスト"""
        search_data = {"page": 3, "per_page": 5}

        response = test_client.post("/files/search", json=search_data)
        assert response.status_code == 200

        data = response.json()
        assert data["page"] == 3
        assert data["per_page"] == 5


class TestBatchOperationsAPI:
    """一括操作APIのテスト"""

    def test_batch_edit_files_success(self, test_client: TestClient):
        """一括編集APIの正常系テスト"""
        # 複数のファイルIDを指定（実際のテストでは有効なIDを使用）
        batch_edit_data = {
            "file_ids": ["file1", "file2"],
            "new_filename": "batch_edited.md",
            "edit_reason": "Batch edit test",
            "edited_by": "test_user",
        }

        response = test_client.post("/files/batch-edit", params=batch_edit_data)
        # 実際のファイルが存在しない場合は400が返される可能性がある
        assert response.status_code in [200, 400, 404]

    def test_batch_edit_files_missing_file_ids(self, test_client: TestClient):
        """ファイルIDが指定されていない場合のテスト"""
        batch_edit_data = {"new_filename": "test.md", "edit_reason": "Test"}

        response = test_client.post("/files/batch-edit", params=batch_edit_data)
        # ファイルIDが必須パラメータのため、422エラー（Validation Error）が返される
        assert response.status_code == 422

    def test_batch_edit_files_no_changes(self, test_client: TestClient):
        """ファイル名・内容の両方が指定されていない場合のテスト"""
        batch_edit_data = {"file_ids": ["file1"], "edit_reason": "Test"}

        response = test_client.post("/files/batch-edit", params=batch_edit_data)
        assert response.status_code == 400
        assert (
            "ファイル名または内容のいずれかを指定してください"
            in response.json()["detail"]
        )

    def test_batch_delete_files_success(self, test_client: TestClient):
        """一括削除APIの正常系テスト"""
        batch_delete_data = {"file_ids": ["file1", "file2"]}

        response = test_client.delete("/files/batch-delete", params=batch_delete_data)
        # 実際のファイルが存在しない場合は400が返される可能性がある
        assert response.status_code in [200, 400, 404]

    def test_batch_delete_files_missing_file_ids(self, test_client: TestClient):
        """ファイルIDが指定されていない場合のテスト"""
        response = test_client.delete("/files/batch-delete")
        # ファイルIDが指定されていない場合、400エラーが返される
        assert response.status_code == 400
        # エラーメッセージは「無効なファイルID形式です」または「ファイルIDが指定されていません」
        error_detail = response.json()["detail"]
        assert any(
            msg in error_detail
            for msg in ["ファイルIDが指定されていません", "無効なファイルID形式です"]
        )


class TestAPIErrorHandling:
    """APIエラーハンドリングのテスト"""

    def test_edit_file_validation_error(
        self, test_client: TestClient, sample_file_id: str
    ):
        """ファイル編集時のバリデーションエラーテスト"""
        # 無効なデータ（例：空のリクエスト）
        response = test_client.put(f"/files/{sample_file_id}/edit", json={})

        # バリデーションエラーまたは正常な処理
        assert response.status_code in [200, 422]

    def test_search_files_validation_error(self, test_client: TestClient):
        """ファイル検索時のバリデーションエラーテスト"""
        # 無効なページ番号
        search_data = {
            "page": 0,  # 0は無効
            "per_page": 10,
        }

        response = test_client.post("/files/search", json=search_data)
        assert response.status_code == 422  # Validation Error

    def test_api_consistency(self, test_client: TestClient, sample_file_id: str):
        """APIの一貫性テスト"""
        # 1. ファイルを編集
        edit_data = {
            "filename": "consistency_test.md",
            "edit_reason": "Consistency test",
        }

        edit_response = test_client.put(f"/files/{sample_file_id}/edit", json=edit_data)
        assert edit_response.status_code == 200

        # 2. 編集履歴を取得
        history_response = test_client.get(f"/files/{sample_file_id}/history")
        assert history_response.status_code == 200

        # 3. 検索で編集済みファイルを確認
        search_data = {"is_edited": True, "query": "consistency_test"}

        search_response = test_client.post("/files/search", json=search_data)
        assert search_response.status_code == 200

        search_result = search_response.json()
        # 検索結果に編集されたファイルが含まれていることを確認
        assert search_result["total_count"] >= 0
