"""
RedactionServiceのテスト

機密情報設定サービスのテストを実装
"""

from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from src.api.repositories.redaction_repository import (
    RedactionDatabaseError,
    RedactionRepository,
    RedactionValidationError,
)
from src.api.services.redaction_service import RedactionService


class TestRedactionService:
    """RedactionServiceのテストクラス"""

    @pytest.fixture
    def mock_redaction_repository(self):
        """モックRedactionRepository"""
        return Mock(spec=RedactionRepository)

    @pytest.fixture
    def redaction_service(self, mock_redaction_repository):
        """RedactionServiceのインスタンス"""
        return RedactionService(redaction_repository=mock_redaction_repository)

    def test_init_with_repository(self, mock_redaction_repository):
        """リポジトリを指定して初期化するテスト"""
        service = RedactionService(redaction_repository=mock_redaction_repository)
        assert service.redaction_repository == mock_redaction_repository

    def test_init_without_repository(self):
        """リポジトリを指定せずに初期化するテスト"""
        with patch(
            "src.api.services.redaction_service.RedactionRepository"
        ) as mock_repo:
            RedactionService()
            mock_repo.assert_called_once_with(use_sqlmodel=True, enable_cache=True)

    def test_create_redaction_settings_success(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の作成成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        user_id = "test_user"
        name = "Test Settings"
        description = "Test description"
        level_settings = {"level1": True, "level2": False}
        revealed_items = ["item1", "item2"]
        is_shared = False

        # モックの設定
        expected_result = {
            "id": 1,
            "file_id": file_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "show_all": False,
            "level_settings": level_settings,
            "revealed_items": revealed_items,
            "is_shared": is_shared,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_repository.create_redaction_settings.return_value = (
            expected_result
        )

        # テスト実行
        result = redaction_service.create_redaction_settings(
            file_id=file_id,
            user_id=user_id,
            name=name,
            description=description,
            level_settings=level_settings,
            revealed_items=revealed_items,
            is_shared=is_shared,
        )

        # 検証
        assert result == expected_result
        mock_redaction_repository.create_redaction_settings.assert_called_once_with(
            file_id=file_id,
            user_id=user_id,
            name=name,
            description=description,
            show_all=False,
            level_settings=level_settings,
            revealed_items=revealed_items,
            is_shared=is_shared,
        )

    def test_create_redaction_settings_validation_error(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の作成バリデーションエラーテスト"""
        # モックの設定
        mock_redaction_repository.create_redaction_settings.side_effect = (
            RedactionValidationError("バリデーションエラー")
        )

        # テスト実行と検証
        with pytest.raises(RedactionValidationError, match="バリデーションエラー"):
            redaction_service.create_redaction_settings(
                file_id="",
                user_id="test_user",
                name="Test Settings",
                description="Test description",
            )

    def test_create_redaction_settings_database_error(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の作成データベースエラーテスト"""
        # モックの設定
        mock_redaction_repository.create_redaction_settings.side_effect = (
            RedactionDatabaseError("データベースエラー")
        )

        # テスト実行と検証
        with pytest.raises(RedactionDatabaseError, match="データベースエラー"):
            redaction_service.create_redaction_settings(
                file_id="test_file_123",
                user_id="test_user",
                name="Test Settings",
                description="Test description",
            )

    def test_get_redaction_settings_success(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の取得成功テスト"""
        # テストデータ
        settings_id = 1
        expected_result = {
            "id": settings_id,
            "file_id": "test_file_123",
            "user_id": "test_user",
            "name": "Test Settings",
            "description": "Test description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_repository.get_redaction_settings.return_value = expected_result

        # テスト実行
        result = redaction_service.get_redaction_settings(settings_id)

        # 検証
        assert result == expected_result
        mock_redaction_repository.get_redaction_settings.assert_called_once_with(
            settings_id
        )

    def test_get_redaction_settings_not_found(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の取得失敗テスト"""
        # モックの設定
        mock_redaction_repository.get_redaction_settings.return_value = None

        # テスト実行
        result = redaction_service.get_redaction_settings(999)

        # 検証
        assert result is None

    def test_update_redaction_settings_success(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の更新成功テスト"""
        # テストデータ
        settings_id = 1
        update_data = {
            "name": "Updated Settings",
            "description": "Updated description",
            "level_settings": {"level1": False, "level2": True},
        }
        expected_result = {
            "id": settings_id,
            "file_id": "test_file_123",
            "user_id": "test_user",
            "name": "Updated Settings",
            "description": "Updated description",
            "show_all": False,
            "level_settings": {"level1": False, "level2": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_repository.update_redaction_settings.return_value = (
            expected_result
        )

        # テスト実行
        result = redaction_service.update_redaction_settings(settings_id, **update_data)

        # 検証
        assert result == expected_result
        mock_redaction_repository.update_redaction_settings.assert_called_once_with(
            settings_id=settings_id,
            name=update_data["name"],
            description=update_data["description"],
            show_all=None,
            level_settings=update_data["level_settings"],
            revealed_items=None,
            is_shared=None,
        )

    def test_delete_redaction_settings_success(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の削除成功テスト"""
        # テストデータ
        settings_id = 1
        mock_redaction_repository.delete_redaction_settings.return_value = True

        # テスト実行
        result = redaction_service.delete_redaction_settings(settings_id)

        # 検証
        assert result is True
        mock_redaction_repository.delete_redaction_settings.assert_called_once_with(
            settings_id
        )

    def test_delete_redaction_settings_not_found(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の削除失敗テスト"""
        # モックの設定
        mock_redaction_repository.delete_redaction_settings.return_value = False

        # テスト実行
        result = redaction_service.delete_redaction_settings(999)

        # 検証
        assert result is False

    def test_list_redaction_settings_success(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定の一覧取得成功テスト"""
        # テストデータ
        expected_result = {
            "settings": [
                {
                    "id": 1,
                    "file_id": "test_file_123",
                    "user_id": "test_user",
                    "name": "Test Settings 1",
                    "description": "Test description 1",
                    "show_all": False,
                    "level_settings": {"level1": True},
                    "revealed_items": ["item1"],
                    "is_shared": False,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                },
                {
                    "id": 2,
                    "file_id": "test_file_123",
                    "user_id": "test_user",
                    "name": "Test Settings 2",
                    "description": "Test description 2",
                    "show_all": True,
                    "level_settings": {"level1": False, "level2": True},
                    "revealed_items": ["item2"],
                    "is_shared": True,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                },
            ],
            "total_count": 2,
            "limit": 10,
            "offset": 0,
        }
        mock_redaction_repository.list_redaction_settings.return_value = expected_result

        # テスト実行
        result = redaction_service.list_redaction_settings(
            user_id="test_user", file_id="test_file_123", limit=10, offset=0
        )

        # 検証
        assert result == expected_result
        mock_redaction_repository.list_redaction_settings.assert_called_once_with(
            user_id="test_user",
            file_id="test_file_123",
            is_shared=None,
            limit=10,
            offset=0,
        )

    def test_get_settings_by_file_id_success(
        self, redaction_service, mock_redaction_repository
    ):
        """ファイルIDによる機密情報設定の取得成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        user_id = "test_user"
        expected_result = [
            {
                "id": 1,
                "file_id": file_id,
                "user_id": user_id,
                "name": "Test Settings",
                "description": "Test description",
                "show_all": False,
                "level_settings": {"level1": True},
                "revealed_items": ["item1"],
                "is_shared": False,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }
        ]
        mock_redaction_repository.get_settings_by_file_id.return_value = expected_result

        # テスト実行
        result = redaction_service.get_settings_by_file_id(file_id, user_id)

        # 検証
        assert result == expected_result
        mock_redaction_repository.get_settings_by_file_id.assert_called_once_with(
            file_id, user_id
        )

    def test_export_settings_success(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定のエクスポート成功テスト"""
        # テストデータ
        settings_id = 1
        expected_result = {
            "name": "Test Settings",
            "description": "Test description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_repository.export_settings.return_value = expected_result

        # テスト実行
        result = redaction_service.export_settings(settings_id)

        # 検証
        assert result == expected_result
        mock_redaction_repository.export_settings.assert_called_once_with(settings_id)

    def test_export_settings_not_found(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定のエクスポート失敗テスト"""
        # モックの設定
        mock_redaction_repository.export_settings.return_value = None

        # テスト実行
        result = redaction_service.export_settings(999)

        # 検証
        assert result is None

    def test_import_settings_success(
        self, redaction_service, mock_redaction_repository
    ):
        """機密情報設定のインポート成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        user_id = "test_user"
        settings_data = {
            "name": "Imported Settings",
            "description": "Imported description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
        }
        expected_result = {
            "id": 1,
            "file_id": file_id,
            "user_id": user_id,
            "name": "Imported Settings",
            "description": "Imported description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_repository.import_settings.return_value = expected_result

        # テスト実行
        result = redaction_service.import_settings(file_id, user_id, settings_data)

        # 検証
        assert result == expected_result
        mock_redaction_repository.import_settings.assert_called_once_with(
            file_id, user_id, settings_data
        )

    def test_validate_redaction_settings_success(self, redaction_service):
        """機密情報設定のバリデーション成功テスト"""
        # テストデータ
        settings_data = {
            "name": "Valid Settings",
            "description": "Valid description",
            "level_settings": {"level1": True, "level2": False},
            "revealed_items": ["item1", "item2"],
        }

        # テスト実行
        result = redaction_service.validate_redaction_settings(settings_data)

        # 検証
        assert result is True

    def test_validate_redaction_settings_invalid_name(self, redaction_service):
        """機密情報設定のバリデーション失敗テスト（無効な名前）"""
        # テストデータ
        settings_data = {
            "name": "",  # 空の名前
            "description": "Valid description",
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
        }

        # テスト実行
        result = redaction_service.validate_redaction_settings(settings_data)

        # 検証
        assert result is False

    def test_validate_redaction_settings_invalid_level_settings(
        self, redaction_service
    ):
        """機密情報設定のバリデーション失敗テスト（無効なレベル設定）"""
        # テストデータ
        settings_data = {
            "name": "Valid Settings",
            "description": "Valid description",
            "level_settings": "invalid",  # 辞書ではない
            "revealed_items": ["item1"],
        }

        # テスト実行
        result = redaction_service.validate_redaction_settings(settings_data)

        # 検証
        assert result is False

    def test_validate_redaction_settings_invalid_revealed_items(
        self, redaction_service
    ):
        """機密情報設定のバリデーション失敗テスト（無効な表示項目）"""
        # テストデータ
        settings_data = {
            "name": "Valid Settings",
            "description": "Valid description",
            "level_settings": {"level1": True},
            "revealed_items": "invalid",  # リストではない
        }

        # テスト実行
        result = redaction_service.validate_redaction_settings(settings_data)

        # 検証
        assert result is False
