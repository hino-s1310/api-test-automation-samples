"""
データモデルのテスト

新しく追加したファイル編集関連のモデルのテストを実装
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from src.api.models import (
    FileEditHistoryResponse,
    FileEditRequest,
    FileEditResponse,
    FileSearchRequest,
    FileSearchResponse,
    FileStatus,
)


class TestFileEditRequest:
    """FileEditRequestモデルのテスト"""

    def test_valid_file_edit_request_all_fields(self):
        """全てのフィールドが有効な場合のテスト"""
        data = {
            "filename": "new_filename.md",
            "markdown_content": "# New Content\n\nThis is updated content.",
            "edit_reason": "Content improvement",
            "edited_by": "user123",
        }

        request = FileEditRequest(**data)

        assert request.filename == "new_filename.md"
        assert request.markdown_content == "# New Content\n\nThis is updated content."
        assert request.edit_reason == "Content improvement"
        assert request.edited_by == "user123"

    def test_valid_file_edit_request_partial_fields(self):
        """一部のフィールドのみ指定した場合のテスト"""
        data = {"filename": "new_filename.md"}

        request = FileEditRequest(**data)

        assert request.filename == "new_filename.md"
        assert request.markdown_content is None
        assert request.edit_reason is None
        assert request.edited_by == "system"  # デフォルト値

    def test_valid_file_edit_request_minimal_fields(self):
        """最小限のフィールドのみ指定した場合のテスト"""
        data = {}

        request = FileEditRequest(**data)

        assert request.filename is None
        assert request.markdown_content is None
        assert request.edit_reason is None
        assert request.edited_by == "system"

    def test_file_edit_request_filename_validation(self):
        """ファイル名のバリデーションテスト"""
        # 空文字列は許可
        request = FileEditRequest(filename="")
        assert request.filename == ""

        # 長いファイル名も許可
        long_filename = "a" * 255
        request = FileEditRequest(filename=long_filename)
        assert request.filename == long_filename

    def test_file_edit_request_markdown_content_validation(self):
        """Markdown内容のバリデーションテスト"""
        # 空文字列は許可
        request = FileEditRequest(markdown_content="")
        assert request.markdown_content == ""

        # 長い内容も許可
        long_content = "# " + "a" * 1000
        request = FileEditRequest(markdown_content=long_content)
        assert request.markdown_content == long_content

    def test_file_edit_request_edit_reason_validation(self):
        """編集理由のバリデーションテスト"""
        # 空文字列は許可
        request = FileEditRequest(edit_reason="")
        assert request.edit_reason == ""

        # 長い理由も許可
        long_reason = "a" * 500
        request = FileEditRequest(edit_reason=long_reason)
        assert request.edit_reason == long_reason

    def test_file_edit_request_edited_by_validation(self):
        """編集者のバリデーションテスト"""
        # システムユーザー
        request = FileEditRequest(edited_by="system")
        assert request.edited_by == "system"

        # 一般ユーザー
        request = FileEditRequest(edited_by="user123")
        assert request.edited_by == "user123"

        # 空文字列も許可
        request = FileEditRequest(edited_by="")
        assert request.edited_by == ""


class TestFileEditResponse:
    """FileEditResponseモデルのテスト"""

    def test_valid_file_edit_response(self):
        """有効なレスポンスのテスト"""
        now = datetime.now()
        data = {
            "id": "file123",
            "filename": "updated_file.md",
            "markdown": "# Updated Content\n\nThis is the updated content.",
            "status": FileStatus.COMPLETED,
            "updated_at": now,
            "last_edited_at": now,
            "edit_count": 1,
            "is_edited": True,
            "message": "File updated successfully",
        }

        response = FileEditResponse(**data)

        assert response.id == "file123"
        assert response.filename == "updated_file.md"
        assert response.markdown == "# Updated Content\n\nThis is the updated content."
        assert response.status == FileStatus.COMPLETED
        assert response.updated_at == now
        assert response.last_edited_at == now
        assert response.edit_count == 1
        assert response.is_edited is True
        assert response.message == "File updated successfully"

    def test_file_edit_response_status_enum_validation(self):
        """ステータスの列挙型バリデーションテスト"""
        now = datetime.now()
        data = {
            "id": "file123",
            "filename": "test.md",
            "markdown": "# Test",
            "status": "completed",  # 文字列として渡す
            "updated_at": now,
            "last_edited_at": now,
            "edit_count": 0,
            "is_edited": False,
            "message": "Test",
        }

        response = FileEditResponse(**data)
        assert response.status == FileStatus.COMPLETED

    def test_file_edit_response_invalid_status(self):
        """無効なステータスのテスト"""
        now = datetime.now()
        data = {
            "id": "file123",
            "filename": "test.md",
            "markdown": "# Test",
            "status": "invalid_status",  # 無効なステータス
            "updated_at": now,
            "last_edited_at": now,
            "edit_count": 0,
            "is_edited": False,
            "message": "Test",
        }

        with pytest.raises(ValidationError):
            FileEditResponse(**data)

    def test_file_edit_response_required_fields(self):
        """必須フィールドのテスト"""
        # 必須フィールドが不足している場合
        incomplete_data = {
            "id": "file123",
            "filename": "test.md",
            # markdownが不足
            "status": FileStatus.COMPLETED,
            "updated_at": datetime.now(),
            "last_edited_at": datetime.now(),
            "edit_count": 0,
            "is_edited": False,
            "message": "Test",
        }

        with pytest.raises(ValidationError):
            FileEditResponse(**incomplete_data)


class TestFileEditHistoryResponse:
    """FileEditHistoryResponseモデルのテスト"""

    def test_valid_file_edit_history_response(self):
        """有効な履歴レスポンスのテスト"""
        now = datetime.now()
        data = {
            "id": 1,
            "file_id": "file123",
            "original_filename": "original.md",
            "original_content": "# Original Content",
            "edited_filename": "edited.md",
            "edited_content": "# Edited Content",
            "edit_reason": "Content improvement",
            "edited_by": "user123",
            "created_at": now,
        }

        response = FileEditHistoryResponse(**data)

        assert response.id == 1
        assert response.file_id == "file123"
        assert response.original_filename == "original.md"
        assert response.original_content == "# Original Content"
        assert response.edited_filename == "edited.md"
        assert response.edited_content == "# Edited Content"
        assert response.edit_reason == "Content improvement"
        assert response.edited_by == "user123"
        assert response.created_at == now

    def test_file_edit_history_response_optional_fields(self):
        """オプションフィールドのテスト"""
        now = datetime.now()
        data = {
            "id": 1,
            "file_id": "file123",
            "original_filename": "original.md",
            "original_content": "# Original Content",
            "edited_filename": "edited.md",
            "edited_content": "# Edited Content",
            # edit_reasonは省略
            "edited_by": "user123",
            "created_at": now,
        }

        response = FileEditHistoryResponse(**data)

        assert response.edit_reason is None

    def test_file_edit_history_response_id_validation(self):
        """IDフィールドのバリデーションテスト"""
        now = datetime.now()
        data = {
            "id": 0,  # 0は有効
            "file_id": "file123",
            "original_filename": "original.md",
            "original_content": "# Original Content",
            "edited_filename": "edited.md",
            "edited_content": "# Edited Content",
            "edited_by": "user123",
            "created_at": now,
        }

        response = FileEditHistoryResponse(**data)
        assert response.id == 0

        # 負の値は無効
        data["id"] = -1
        with pytest.raises(ValidationError):
            FileEditHistoryResponse(**data)


class TestFileSearchRequest:
    """FileSearchRequestモデルのテスト"""

    def test_valid_file_search_request_all_fields(self):
        """全てのフィールドが有効な場合のテスト"""
        data = {
            "query": "search term",
            "status": "completed",
            "is_edited": True,
            "page": 2,
            "per_page": 20,
        }

        request = FileSearchRequest(**data)

        assert request.query == "search term"
        assert request.status == "completed"
        assert request.is_edited is True
        assert request.page == 2
        assert request.per_page == 20

    def test_valid_file_search_request_default_values(self):
        """デフォルト値のテスト"""
        data = {}

        request = FileSearchRequest(**data)

        assert request.query is None
        assert request.status is None
        assert request.is_edited is None
        assert request.page == 1
        assert request.per_page == 10

    def test_file_search_request_page_validation(self):
        """ページ番号のバリデーションテスト"""
        # 1は有効
        request = FileSearchRequest(page=1)
        assert request.page == 1

        # 0は無効
        with pytest.raises(ValidationError):
            FileSearchRequest(page=0)

        # 負の値は無効
        with pytest.raises(ValidationError):
            FileSearchRequest(page=-1)

    def test_file_search_request_per_page_validation(self):
        """1ページあたりの件数のバリデーションテスト"""
        # 10は有効
        request = FileSearchRequest(per_page=10)
        assert request.per_page == 10

        # 0は無効
        with pytest.raises(ValidationError):
            FileSearchRequest(per_page=0)

        # 負の値は無効
        with pytest.raises(ValidationError):
            FileSearchRequest(per_page=-1)

        # 大きな値も有効
        request = FileSearchRequest(per_page=1000)
        assert request.per_page == 1000


class TestFileSearchResponse:
    """FileSearchResponseモデルのテスト"""

    def test_valid_file_search_response(self):
        """有効な検索レスポンスのテスト"""
        data = {
            "files": [
                {"id": "file1", "filename": "file1.md"},
                {"id": "file2", "filename": "file2.md"},
            ],
            "total_count": 2,
            "page": 1,
            "per_page": 10,
            "filters": {"query": "test", "status": "completed"},
        }

        response = FileSearchResponse(**data)

        assert len(response.files) == 2
        assert response.total_count == 2
        assert response.page == 1
        assert response.per_page == 10
        assert response.filters == {"query": "test", "status": "completed"}

    def test_file_search_response_empty_results(self):
        """空の結果のテスト"""
        data = {"files": [], "total_count": 0, "page": 1, "per_page": 10, "filters": {}}

        response = FileSearchResponse(**data)

        assert len(response.files) == 0
        assert response.total_count == 0

    def test_file_search_response_pagination(self):
        """ページネーションのテスト"""
        data = {
            "files": [{"id": "file1", "filename": "file1.md"}],
            "total_count": 25,
            "page": 3,
            "per_page": 10,
            "filters": {},
        }

        response = FileSearchResponse(**data)

        assert response.page == 3
        assert response.per_page == 10
        assert response.total_count == 25


class TestModelIntegration:
    """モデル間の統合テスト"""

    def test_file_edit_workflow(self):
        """ファイル編集ワークフローの統合テスト"""
        # 1. 編集リクエストを作成
        edit_request = FileEditRequest(
            filename="updated.md",
            markdown_content="# Updated",
            edit_reason="Improvement",
            edited_by="user123",
        )

        # 2. 編集履歴を作成
        now = datetime.now()
        history = FileEditHistoryResponse(
            id=1,
            file_id="file123",
            original_filename="original.md",
            original_content="# Original",
            edited_filename=edit_request.filename,
            edited_content=edit_request.markdown_content,
            edit_reason=edit_request.edit_reason,
            edited_by=edit_request.edited_by,
            created_at=now,
        )

        # 3. 編集レスポンスを作成
        edit_response = FileEditResponse(
            id="file123",
            filename=history.edited_filename,
            markdown=history.edited_content,
            status=FileStatus.COMPLETED,
            updated_at=now,
            last_edited_at=now,
            edit_count=1,
            is_edited=True,
            message="File updated successfully",
        )

        # 4. 検索リクエストを作成
        search_request = FileSearchRequest(
            query="updated", is_edited=True, page=1, per_page=10
        )

        # 5. 検索レスポンスを作成
        search_response = FileSearchResponse(
            files=[{"id": edit_response.id, "filename": edit_response.filename}],
            total_count=1,
            page=search_request.page,
            per_page=search_request.per_page,
            filters={
                "query": search_request.query,
                "is_edited": search_request.is_edited,
            },
        )

        # 6. 全てのモデルが正しく連携していることを確認
        assert edit_request.filename == history.edited_filename
        assert edit_request.markdown_content == history.edited_content
        assert history.file_id == edit_response.id
        assert search_response.files[0]["id"] == edit_response.id
        assert search_response.total_count == 1
