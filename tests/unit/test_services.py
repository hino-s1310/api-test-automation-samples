import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

from src.api.services.file_service import FileService
from src.api.models import FileStatus

# テストデータとフィクスチャをインポート
from .fixtures import (
    FileTestData,
    DatabaseTestResponses,
    ErrorTestData,
    ValidationTestData,
    create_file_data
)
from .fixtures.mock_fixtures import (
    mock_db_manager,
    file_service,
    configured_mock_db,
    mock_current_time
)


class TestFileService:
    """FileService のテストクラス（分離されたデータ使用）"""
    
    # ===============================
    # get_file メソッドのテスト
    # ===============================
    
    def test_get_file_success(self, file_service, mock_db_manager):
        """ファイル取得成功のテスト（分離されたデータ使用）"""
        # テストデータを取得
        sample_data = FileTestData.valid_file_data()
        
        # モックの設定
        mock_db_manager.get_file.return_value = sample_data
        
        # テスト実行
        file_id = sample_data["id"]
        result = file_service.get_file(file_id)
        
        # アサーション
        assert result is not None
        assert result["id"] == file_id
        assert result["filename"] == sample_data["filename"]
        assert result["markdown"] == sample_data["markdown_content"]
        assert result["status"] == sample_data["status"]
        assert result["file_size"] == sample_data["file_size"]
        assert result["processing_time"] == sample_data["processing_time"]
        
        # モックが正しく呼ばれたか確認
        mock_db_manager.get_file.assert_called_once_with(file_id)
    
