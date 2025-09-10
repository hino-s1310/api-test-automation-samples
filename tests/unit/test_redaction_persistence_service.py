"""
RedactionPersistenceServiceのテスト

機密情報設定永続化サービスのテストを実装
"""

import json
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from src.api.repositories.redaction_repository import (
    RedactionRepository,
    RedactionValidationError,
)
from src.api.services.redaction_persistence_service import (  # pyright: ignore[reportMissingImports]
    RedactionPersistenceService,  # pyright: ignore[reportMissingImports]
)


class TestRedactionPersistenceService:
    """RedactionPersistenceServiceのテストクラス"""

    @pytest.fixture
    def mock_redaction_repository(self):
        """モックRedactionRepository"""
        return Mock(spec=RedactionRepository)

    @pytest.fixture
    def mock_redaction_service(self):
        """モックRedactionService"""
        return Mock()

    @pytest.fixture
    def persistence_service(self, mock_redaction_repository, mock_redaction_service):
        """RedactionPersistenceServiceのインスタンス"""
        return RedactionPersistenceService(
            redaction_repository=mock_redaction_repository,
            redaction_service=mock_redaction_service,
        )

    @pytest.fixture
    def temp_dir(self):
        """一時ディレクトリ"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    def test_init_with_dependencies(
        self, mock_redaction_repository, mock_redaction_service
    ):
        """依存関係を指定して初期化するテスト"""
        service = RedactionPersistenceService(
            redaction_repository=mock_redaction_repository,
            redaction_service=mock_redaction_service,
        )
        assert service.redaction_repository == mock_redaction_repository
        assert service.redaction_service == mock_redaction_service

    def test_init_without_dependencies(self):
        """依存関係を指定せずに初期化するテスト"""
        with (
            patch(
                "src.api.services.redaction_persistence_service.RedactionRepository"
            ) as mock_repo,
            patch(
                "src.api.services.redaction_persistence_service.RedactionService"
            ) as mock_service,
        ):
            RedactionPersistenceService()
            mock_repo.assert_called_once_with(use_sqlmodel=True, enable_cache=True)
            mock_service.assert_called_once()

    def test_save_settings_success(
        self, persistence_service, mock_redaction_service, temp_dir
    ):
        """設定の保存成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        user_id = "test_user"
        settings_data = {
            "name": "Test Settings",
            "description": "Test description",
            "show_all": False,
            "level_settings": {"level1": True, "level2": False},
            "revealed_items": ["item1", "item2"],
            "is_shared": False,
        }
        expected_result = {
            "id": 1,
            "file_id": file_id,
            "user_id": user_id,
            **settings_data,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_service.create_redaction_settings.return_value = expected_result

        # テスト実行
        result = persistence_service.save_settings(
            file_id=file_id,
            user_id=user_id,
            settings_data=settings_data,
        )

        # 検証
        assert result == expected_result
        mock_redaction_service.create_redaction_settings.assert_called_once_with(
            file_id=file_id,
            user_id=user_id,
            name=settings_data["name"],
            description=settings_data["description"],
            show_all=settings_data["show_all"],
            level_settings=settings_data["level_settings"],
            revealed_items=settings_data["revealed_items"],
            is_shared=settings_data["is_shared"],
        )

    def test_save_settings_validation_error(
        self, persistence_service, mock_redaction_service
    ):
        """設定の保存バリデーションエラーテスト"""
        # テスト実行と検証（内部バリデーションが先に実行される）
        with pytest.raises(RedactionValidationError, match="設定データが無効です"):
            persistence_service.save_settings(
                file_id="test_file_123",
                user_id="test_user",
                settings_data={"name": ""},  # 無効なデータ
            )

    def test_load_settings_success(self, persistence_service, mock_redaction_service):
        """設定の読み込み成功テスト"""
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
        mock_redaction_service.get_redaction_settings.return_value = expected_result

        # テスト実行
        result = persistence_service.load_settings(settings_id)

        # 検証
        assert result == expected_result
        mock_redaction_service.get_redaction_settings.assert_called_once_with(
            settings_id
        )

    def test_load_settings_not_found(self, persistence_service, mock_redaction_service):
        """設定の読み込み失敗テスト"""
        # モックの設定
        mock_redaction_service.get_redaction_settings.return_value = None

        # テスト実行
        result = persistence_service.load_settings(999)

        # 検証
        assert result is None

    def test_delete_settings_success(self, persistence_service, mock_redaction_service):
        """設定の削除成功テスト"""
        # テストデータ
        settings_id = 1
        mock_redaction_service.delete_redaction_settings.return_value = True

        # テスト実行
        result = persistence_service.delete_settings(settings_id)

        # 検証
        assert result is True
        mock_redaction_service.delete_redaction_settings.assert_called_once_with(
            settings_id
        )

    def test_delete_settings_not_found(
        self, persistence_service, mock_redaction_service
    ):
        """設定の削除失敗テスト"""
        # モックの設定
        mock_redaction_service.delete_redaction_settings.return_value = False

        # テスト実行
        result = persistence_service.delete_settings(999)

        # 検証
        assert result is False

    def test_export_settings_to_file_success(
        self, persistence_service, mock_redaction_service, temp_dir
    ):
        """設定のファイルエクスポート成功テスト"""
        # テストデータ
        settings_id = 1
        export_data = {
            "name": "Test Settings",
            "description": "Test description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_service.export_settings.return_value = export_data

        # テスト実行
        file_path = temp_dir / "test_settings.json"
        result = persistence_service.export_settings_to_file(settings_id, file_path)

        # 検証
        assert result == str(file_path)
        assert file_path.exists()

        # ファイル内容の検証
        with open(file_path, encoding="utf-8") as f:
            saved_data = json.load(f)
        assert saved_data == export_data

    def test_export_settings_to_file_not_found(
        self, persistence_service, mock_redaction_service, temp_dir
    ):
        """設定のファイルエクスポート失敗テスト"""
        # モックの設定
        mock_redaction_service.export_settings.return_value = None

        # テスト実行と検証
        file_path = temp_dir / "test_settings.json"
        with pytest.raises(ValueError, match="設定が見つかりません"):
            persistence_service.export_settings_to_file(999, file_path)

    def test_import_settings_from_file_success(
        self, persistence_service, mock_redaction_service, temp_dir
    ):
        """設定のファイルインポート成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        user_id = "test_user"
        import_data = {
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
            **import_data,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_service.import_settings.return_value = expected_result

        # テストファイルの作成
        file_path = temp_dir / "import_settings.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(import_data, f, ensure_ascii=False, indent=2)

        # テスト実行
        result = persistence_service.import_settings_from_file(
            file_id, user_id, file_path
        )

        # 検証
        assert result == expected_result
        mock_redaction_service.import_settings.assert_called_once_with(
            file_id, user_id, import_data
        )

    def test_import_settings_from_file_invalid_json(
        self, persistence_service, temp_dir
    ):
        """設定のファイルインポート失敗テスト（無効なJSON）"""
        # テストファイルの作成（無効なJSON）
        file_path = temp_dir / "invalid_settings.json"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("invalid json content")

        # テスト実行と検証
        with pytest.raises(ValueError, match="無効なJSONファイルです"):
            persistence_service.import_settings_from_file(
                "test_file_123", "test_user", file_path
            )

    def test_import_settings_from_file_not_found(self, persistence_service, temp_dir):
        """設定のファイルインポート失敗テスト（ファイルが見つからない）"""
        # 存在しないファイルパス
        file_path = temp_dir / "nonexistent.json"

        # テスト実行と検証
        with pytest.raises(FileNotFoundError):
            persistence_service.import_settings_from_file(
                "test_file_123", "test_user", file_path
            )

    def test_export_settings_to_json_success(
        self, persistence_service, mock_redaction_service
    ):
        """設定のJSONエクスポート成功テスト"""
        # テストデータ
        settings_id = 1
        export_data = {
            "name": "Test Settings",
            "description": "Test description",
            "show_all": False,
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
            "is_shared": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_service.export_settings.return_value = export_data

        # テスト実行
        result = persistence_service.export_settings_to_json(settings_id)

        # 検証
        assert result == json.dumps(export_data, ensure_ascii=False, indent=2)

    def test_export_settings_to_json_not_found(
        self, persistence_service, mock_redaction_service
    ):
        """設定のJSONエクスポート失敗テスト"""
        # モックの設定
        mock_redaction_service.export_settings.return_value = None

        # テスト実行と検証
        with pytest.raises(ValueError, match="設定が見つかりません"):
            persistence_service.export_settings_to_json(999)

    def test_import_settings_from_json_success(
        self, persistence_service, mock_redaction_service
    ):
        """設定のJSONインポート成功テスト"""
        # テストデータ
        file_id = "test_file_123"
        user_id = "test_user"
        import_data = {
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
            **import_data,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        mock_redaction_service.import_settings.return_value = expected_result

        # テスト実行
        json_data = json.dumps(import_data, ensure_ascii=False, indent=2)
        result = persistence_service.import_settings_from_json(
            file_id, user_id, json_data
        )

        # 検証
        assert result == expected_result
        mock_redaction_service.import_settings.assert_called_once_with(
            file_id, user_id, import_data
        )

    def test_import_settings_from_json_invalid_json(self, persistence_service):
        """設定のJSONインポート失敗テスト（無効なJSON）"""
        # テスト実行と検証
        with pytest.raises(ValueError, match="無効なJSONデータです"):
            persistence_service.import_settings_from_json(
                "test_file_123", "test_user", "invalid json"
            )

    def test_validate_settings_data_success(self, persistence_service):
        """設定データのバリデーション成功テスト"""
        # テストデータ
        settings_data = {
            "name": "Valid Settings",
            "description": "Valid description",
            "level_settings": {"level1": True, "level2": False},
            "revealed_items": ["item1", "item2"],
        }

        # テスト実行
        result = persistence_service.validate_settings_data(settings_data)

        # 検証
        assert result is True

    def test_validate_settings_data_invalid_name(self, persistence_service):
        """設定データのバリデーション失敗テスト（無効な名前）"""
        # テストデータ
        settings_data = {
            "name": "",  # 空の名前
            "description": "Valid description",
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
        }

        # テスト実行
        result = persistence_service.validate_settings_data(settings_data)

        # 検証
        assert result is False

    def test_validate_settings_data_missing_required_fields(self, persistence_service):
        """設定データのバリデーション失敗テスト（必須フィールド不足）"""
        # テストデータ（nameが不足）
        settings_data = {
            "description": "Valid description",
            "level_settings": {"level1": True},
            "revealed_items": ["item1"],
        }

        # テスト実行
        result = persistence_service.validate_settings_data(settings_data)

        # 検証
        assert result is False

    def test_get_settings_list_success(
        self, persistence_service, mock_redaction_service
    ):
        """設定一覧の取得成功テスト"""
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
        mock_redaction_service.list_redaction_settings.return_value = expected_result

        # テスト実行
        result = persistence_service.get_settings_list(
            user_id="test_user", file_id="test_file_123", limit=10, offset=0
        )

        # 検証
        assert result == expected_result
        mock_redaction_service.list_redaction_settings.assert_called_once_with(
            user_id="test_user",
            file_id="test_file_123",
            is_shared=None,
            limit=10,
            offset=0,
        )

    def test_get_settings_by_file_id_success(
        self, persistence_service, mock_redaction_service
    ):
        """ファイルIDによる設定取得成功テスト"""
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
        mock_redaction_service.get_settings_by_file_id.return_value = expected_result

        # テスト実行
        result = persistence_service.get_settings_by_file_id(file_id, user_id)

        # 検証
        assert result == expected_result
        mock_redaction_service.get_settings_by_file_id.assert_called_once_with(
            file_id, user_id
        )
