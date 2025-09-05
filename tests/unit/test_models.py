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
    RedactionLevel,
    RedactionSettings,
    RedactionSettingsCreateRequest,
    RedactionSettingsExportResponse,
    RedactionSettingsImportRequest,
    RedactionSettingsListResponse,
    RedactionSettingsResponse,
    RedactionSettingsShare,
    RedactionSettingsUpdateRequest,
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


# ===========================
# 赤セルシート関連モデルのテスト
# ===========================


class TestRedactionLevel:
    """RedactionLevel Enumのテスト"""

    def test_redaction_level_values(self):
        """RedactionLevelの値のテスト"""
        assert RedactionLevel.LEVEL1 == "level1"
        assert RedactionLevel.LEVEL2 == "level2"
        assert RedactionLevel.LEVEL3 == "level3"

    def test_redaction_level_enum_behavior(self):
        """RedactionLevelの列挙型としての動作テスト"""
        # 等価性のテスト
        assert RedactionLevel.LEVEL1 == "level1"
        assert RedactionLevel.LEVEL2 == "level2"
        assert RedactionLevel.LEVEL3 == "level3"

        # 値の取得
        assert RedactionLevel.LEVEL1.value == "level1"
        assert RedactionLevel.LEVEL2.value == "level2"
        assert RedactionLevel.LEVEL3.value == "level3"


class TestRedactionSettings:
    """RedactionSettingsモデルのテスト"""

    def test_redaction_settings_creation(self):
        """RedactionSettingsの作成テスト"""
        now = datetime.now()
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            user_id="user123",
            name="Test Settings",
            description="Test description",
            show_all=False,
            level_settings='{"level1": true, "level2": false}',
            revealed_items='["item1", "item2"]',
            is_shared=False,
            created_at=now,
            updated_at=now,
        )

        assert settings.id == "settings123"
        assert settings.file_id == "file123"
        assert settings.user_id == "user123"
        assert settings.name == "Test Settings"
        assert settings.description == "Test description"
        assert settings.show_all is False
        assert settings.level_settings == '{"level1": true, "level2": false}'
        assert settings.revealed_items == '["item1", "item2"]'
        assert settings.is_shared is False
        assert settings.created_at == now
        assert settings.updated_at == now

    def test_redaction_settings_default_values(self):
        """RedactionSettingsのデフォルト値テスト"""
        now = datetime.now()
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            created_at=now,
        )

        assert settings.user_id is None
        assert settings.description is None
        assert settings.show_all is False
        assert settings.level_settings == "{}"
        assert settings.revealed_items == "[]"
        assert settings.is_shared is False
        assert settings.updated_at is None

    def test_redaction_settings_get_level_settings_dict(self):
        """レベル設定の辞書取得テスト"""
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            level_settings='{"level1": true, "level2": false}',
            created_at=datetime.now(),
        )

        level_dict = settings.get_level_settings_dict()
        assert level_dict == {"level1": True, "level2": False}

    def test_redaction_settings_get_level_settings_dict_invalid_json(self):
        """無効なJSONのレベル設定テスト"""
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            level_settings="invalid json",
            created_at=datetime.now(),
        )

        level_dict = settings.get_level_settings_dict()
        assert level_dict == {}

    def test_redaction_settings_set_level_settings_dict(self):
        """レベル設定の辞書設定テスト"""
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            created_at=datetime.now(),
        )

        settings.set_level_settings_dict({"level1": True, "level2": False})
        assert settings.level_settings == '{"level1": true, "level2": false}'

    def test_redaction_settings_set_level_settings_dict_empty(self):
        """空のレベル設定辞書テスト"""
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            created_at=datetime.now(),
        )

        settings.set_level_settings_dict({})
        assert settings.level_settings == "{}"

    def test_redaction_settings_get_revealed_items_list(self):
        """表示項目リストの取得テスト"""
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            revealed_items='["item1", "item2", "item3"]',
            created_at=datetime.now(),
        )

        items_list = settings.get_revealed_items_list()
        assert items_list == ["item1", "item2", "item3"]

    def test_redaction_settings_get_revealed_items_list_invalid_json(self):
        """無効なJSONの表示項目リストテスト"""
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            revealed_items="invalid json",
            created_at=datetime.now(),
        )

        items_list = settings.get_revealed_items_list()
        assert items_list == []

    def test_redaction_settings_set_revealed_items_list(self):
        """表示項目リストの設定テスト"""
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            created_at=datetime.now(),
        )

        settings.set_revealed_items_list(["item1", "item2", "item3"])
        assert settings.revealed_items == '["item1", "item2", "item3"]'

    def test_redaction_settings_set_revealed_items_list_empty(self):
        """空の表示項目リストテスト"""
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            created_at=datetime.now(),
        )

        settings.set_revealed_items_list([])
        assert settings.revealed_items == "[]"

    def test_redaction_settings_to_dict(self):
        """辞書変換テスト"""
        now = datetime.now()
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            user_id="user123",
            name="Test Settings",
            description="Test description",
            show_all=True,
            level_settings='{"level1": true}',
            revealed_items='["item1"]',
            is_shared=True,
            created_at=now,
            updated_at=now,
        )

        result = settings.to_dict()
        expected = {
            "id": "settings123",
            "file_id": "file123",
            "user_id": "user123",
            "name": "Test Settings",
            "description": "Test description",
            "show_all": True,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": True,
            "created_at": now,
            "updated_at": now,
        }

        assert result == expected


class TestRedactionSettingsShare:
    """RedactionSettingsShareモデルのテスト"""

    def test_redaction_settings_share_creation(self):
        """RedactionSettingsShareの作成テスト"""
        now = datetime.now()
        share = RedactionSettingsShare(
            id="share123",
            settings_id="settings123",
            shared_with_user_id="user456",
            shared_with_team_id="team789",
            permission_level="write",
            created_at=now,
        )

        assert share.id == "share123"
        assert share.settings_id == "settings123"
        assert share.shared_with_user_id == "user456"
        assert share.shared_with_team_id == "team789"
        assert share.permission_level == "write"
        assert share.created_at == now

    def test_redaction_settings_share_default_values(self):
        """RedactionSettingsShareのデフォルト値テスト"""
        now = datetime.now()
        share = RedactionSettingsShare(
            id="share123",
            settings_id="settings123",
            created_at=now,
        )

        assert share.shared_with_user_id is None
        assert share.shared_with_team_id is None
        assert share.permission_level == "read"

    def test_redaction_settings_share_to_dict(self):
        """辞書変換テスト"""
        now = datetime.now()
        share = RedactionSettingsShare(
            id="share123",
            settings_id="settings123",
            shared_with_user_id="user456",
            shared_with_team_id="team789",
            permission_level="admin",
            created_at=now,
        )

        result = share.to_dict()
        expected = {
            "id": "share123",
            "settings_id": "settings123",
            "shared_with_user_id": "user456",
            "shared_with_team_id": "team789",
            "permission_level": "admin",
            "created_at": now,
        }

        assert result == expected


class TestRedactionSettingsResponse:
    """RedactionSettingsResponseモデルのテスト"""

    def test_redaction_settings_response_creation(self):
        """RedactionSettingsResponseの作成テスト"""
        now = datetime.now()
        response = RedactionSettingsResponse(
            id="settings123",
            file_id="file123",
            user_id="user123",
            name="Test Settings",
            description="Test description",
            show_all=True,
            level_settings={"level1": True, "level2": False},
            revealed_items=["item1", "item2"],
            is_shared=True,
            created_at=now,
            updated_at=now,
        )

        assert response.id == "settings123"
        assert response.file_id == "file123"
        assert response.user_id == "user123"
        assert response.name == "Test Settings"
        assert response.description == "Test description"
        assert response.show_all is True
        assert response.level_settings == {"level1": True, "level2": False}
        assert response.revealed_items == ["item1", "item2"]
        assert response.is_shared is True
        assert response.created_at == now
        assert response.updated_at == now

    def test_redaction_settings_response_optional_fields(self):
        """オプションフィールドのテスト"""
        now = datetime.now()
        response = RedactionSettingsResponse(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            show_all=False,
            level_settings={},
            revealed_items=[],
            is_shared=False,
            created_at=now,
        )

        assert response.user_id is None
        assert response.description is None
        assert response.updated_at is None


class TestRedactionSettingsCreateRequest:
    """RedactionSettingsCreateRequestモデルのテスト"""

    def test_redaction_settings_create_request_creation(self):
        """RedactionSettingsCreateRequestの作成テスト"""
        request = RedactionSettingsCreateRequest(
            name="Test Settings",
            description="Test description",
            show_all=True,
            level_settings={"level1": True},
            revealed_items=["item1"],
            is_shared=True,
        )

        assert request.name == "Test Settings"
        assert request.description == "Test description"
        assert request.show_all is True
        assert request.level_settings == {"level1": True}
        assert request.revealed_items == ["item1"]
        assert request.is_shared is True

    def test_redaction_settings_create_request_default_values(self):
        """デフォルト値のテスト"""
        request = RedactionSettingsCreateRequest(name="Test Settings")

        assert request.name == "Test Settings"
        assert request.description is None
        assert request.show_all is False
        assert request.level_settings == {}
        assert request.revealed_items == []
        assert request.is_shared is False

    def test_redaction_settings_create_request_required_fields(self):
        """必須フィールドのテスト"""
        # nameが必須
        with pytest.raises(ValidationError):
            RedactionSettingsCreateRequest()


class TestRedactionSettingsUpdateRequest:
    """RedactionSettingsUpdateRequestモデルのテスト"""

    def test_redaction_settings_update_request_creation(self):
        """RedactionSettingsUpdateRequestの作成テスト"""
        request = RedactionSettingsUpdateRequest(
            name="Updated Settings",
            description="Updated description",
            show_all=True,
            level_settings={"level1": False},
            revealed_items=["item2"],
            is_shared=False,
        )

        assert request.name == "Updated Settings"
        assert request.description == "Updated description"
        assert request.show_all is True
        assert request.level_settings == {"level1": False}
        assert request.revealed_items == ["item2"]
        assert request.is_shared is False

    def test_redaction_settings_update_request_all_optional(self):
        """全てのフィールドがオプションのテスト"""
        request = RedactionSettingsUpdateRequest()

        assert request.name is None
        assert request.description is None
        assert request.show_all is None
        assert request.level_settings is None
        assert request.revealed_items is None
        assert request.is_shared is None


class TestRedactionSettingsListResponse:
    """RedactionSettingsListResponseモデルのテスト"""

    def test_redaction_settings_list_response_creation(self):
        """RedactionSettingsListResponseの作成テスト"""
        now = datetime.now()
        settings1 = RedactionSettingsResponse(
            id="settings1",
            file_id="file123",
            name="Settings 1",
            show_all=False,
            level_settings={},
            revealed_items=[],
            is_shared=False,
            created_at=now,
        )
        settings2 = RedactionSettingsResponse(
            id="settings2",
            file_id="file123",
            name="Settings 2",
            show_all=True,
            level_settings={"level1": True},
            revealed_items=["item1"],
            is_shared=True,
            created_at=now,
        )

        response = RedactionSettingsListResponse(
            settings=[settings1, settings2], total=2
        )

        assert len(response.settings) == 2
        assert response.total == 2
        assert response.settings[0].id == "settings1"
        assert response.settings[1].id == "settings2"

    def test_redaction_settings_list_response_empty(self):
        """空のリストのテスト"""
        response = RedactionSettingsListResponse(settings=[], total=0)

        assert len(response.settings) == 0
        assert response.total == 0


class TestRedactionSettingsExportResponse:
    """RedactionSettingsExportResponseモデルのテスト"""

    def test_redaction_settings_export_response_creation(self):
        """RedactionSettingsExportResponseの作成テスト"""
        response = RedactionSettingsExportResponse(
            settings_data='{"id": "settings123", "name": "Test"}',
            export_format="json",
        )

        assert response.settings_data == '{"id": "settings123", "name": "Test"}'
        assert response.export_format == "json"

    def test_redaction_settings_export_response_default_format(self):
        """デフォルトフォーマットのテスト"""
        response = RedactionSettingsExportResponse(
            settings_data='{"id": "settings123", "name": "Test"}'
        )

        assert response.export_format == "json"


class TestRedactionSettingsImportRequest:
    """RedactionSettingsImportRequestモデルのテスト"""

    def test_redaction_settings_import_request_creation(self):
        """RedactionSettingsImportRequestの作成テスト"""
        request = RedactionSettingsImportRequest(
            settings_data='{"id": "settings123", "name": "Test"}',
            format="json",
        )

        assert request.settings_data == '{"id": "settings123", "name": "Test"}'
        assert request.format == "json"

    def test_redaction_settings_import_request_default_format(self):
        """デフォルトフォーマットのテスト"""
        request = RedactionSettingsImportRequest(
            settings_data='{"id": "settings123", "name": "Test"}'
        )

        assert request.format == "json"


class TestRedactionModelIntegration:
    """赤セルシートモデル間の統合テスト"""

    def test_redaction_settings_workflow(self):
        """赤セルシート設定ワークフローの統合テスト"""
        # 1. 設定作成リクエスト
        create_request = RedactionSettingsCreateRequest(
            name="Test Settings",
            description="Test description",
            show_all=False,
            level_settings={"level1": True, "level2": False},
            revealed_items=["item1", "item2"],
            is_shared=True,
        )

        # 2. データベースモデル作成
        now = datetime.now()
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            user_id="user123",
            name=create_request.name,
            description=create_request.description,
            show_all=create_request.show_all,
            level_settings='{"level1": true, "level2": false}',
            revealed_items='["item1", "item2"]',
            is_shared=create_request.is_shared,
            created_at=now,
        )

        # 3. 共有設定作成
        share = RedactionSettingsShare(
            id="share123",
            settings_id=settings.id,
            shared_with_user_id="user456",
            permission_level="write",
            created_at=now,
        )

        # 4. レスポンス作成
        response = RedactionSettingsResponse(
            id=settings.id,
            file_id=settings.file_id,
            user_id=settings.user_id,
            name=settings.name,
            description=settings.description,
            show_all=settings.show_all,
            level_settings=settings.get_level_settings_dict(),
            revealed_items=settings.get_revealed_items_list(),
            is_shared=settings.is_shared,
            created_at=settings.created_at,
            updated_at=settings.updated_at,
        )

        # 5. エクスポートレスポンス作成
        export_response = RedactionSettingsExportResponse(
            settings_data='{"id": "settings123", "name": "Test Settings"}',
            export_format="json",
        )

        # 6. インポートリクエスト作成
        import_request = RedactionSettingsImportRequest(
            settings_data=export_response.settings_data,
            format=export_response.export_format,
        )

        # 7. 全てのモデルが正しく連携していることを確認
        assert create_request.name == settings.name
        assert create_request.description == settings.description
        assert create_request.show_all == settings.show_all
        assert create_request.is_shared == settings.is_shared
        assert share.settings_id == settings.id
        assert response.id == settings.id
        assert response.level_settings == settings.get_level_settings_dict()
        assert response.revealed_items == settings.get_revealed_items_list()
        assert import_request.settings_data == export_response.settings_data
        assert import_request.format == export_response.export_format

    def test_redaction_settings_json_serialization(self):
        """JSONシリアライゼーションのテスト"""
        now = datetime.now()
        settings = RedactionSettings(
            id="settings123",
            file_id="file123",
            name="Test Settings",
            level_settings='{"level1": true}',
            revealed_items='["item1"]',
            created_at=now,
        )

        # 辞書変換
        settings_dict = settings.to_dict()
        assert isinstance(settings_dict, dict)
        assert settings_dict["id"] == "settings123"
        assert settings_dict["level_settings"] == {"level1": True}
        assert settings_dict["revealed_items"] == ["item1"]

        # JSON文字列への変換（datetimeをISO形式に変換）
        import json

        # datetimeをISO形式の文字列に変換
        serializable_dict = {
            "id": settings_dict["id"],
            "file_id": settings_dict["file_id"],
            "name": settings_dict["name"],
            "level_settings": settings_dict["level_settings"],
            "revealed_items": settings_dict["revealed_items"],
            "created_at": settings_dict["created_at"].isoformat(),
        }

        json_str = json.dumps(serializable_dict)
        assert isinstance(json_str, str)
        assert "settings123" in json_str
        assert "level1" in json_str
