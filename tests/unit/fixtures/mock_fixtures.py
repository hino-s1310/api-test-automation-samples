"""
Mockフィクスチャ定義モジュール

各種サービスのMockとフィクスチャを一元管理
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from src.api.services.file_service import FileService
from .test_data import FileTestData, DatabaseTestResponses


# ===============================
# データベース関連のMockフィクスチャ
# ===============================

@pytest.fixture
def mock_db_manager():
    """データベースマネージャーのモック"""
    with patch('src.api.services.file_service.db_manager') as mock_db:
        yield mock_db


@pytest.fixture 
def mock_file_service_db():
    """FileService用のDBマネージャーモック"""
    with patch('src.api.services.file_service.db_manager') as mock_db:
        # デフォルトの戻り値を設定
        mock_db.get_file.return_value = None
        mock_db.list_files.return_value = FileTestData.empty_file_list()
        mock_db.update_file_status.return_value = False
        mock_db.delete_file.return_value = False
        yield mock_db


@pytest.fixture
def mock_pdf_service_db():
    """PDFService用のDBマネージャーモック"""
    with patch('src.api.services.pdf_service.db_manager') as mock_db:
        yield mock_db


# ===============================
# サービス関連のフィクスチャ
# ===============================

@pytest.fixture
def file_service(mock_db_manager):
    """FileServiceのインスタンス（DB がモック済み）"""
    return FileService()


@pytest.fixture
def pdf_service(mock_pdf_service_db):
    """PDFServiceのインスタンス（DB がモック済み）"""
    from src.api.services.pdf_service import PDFService
    return PDFService()


# ===============================
# 時刻関連のMockフィクスチャ
# ===============================

@pytest.fixture
def mock_datetime():
    """datetime.nowのモック"""
    with patch('src.api.services.file_service.datetime') as mock_dt:
        mock_dt.now.return_value = datetime(2024, 1, 31, 12, 0, 0)
        yield mock_dt


@pytest.fixture
def mock_current_time():
    """固定の現在時刻を返すモック"""
    fixed_time = datetime(2024, 1, 31, 12, 0, 0)
    with patch('src.api.services.file_service.datetime') as mock_dt:
        mock_dt.now.return_value = fixed_time
        mock_dt.fromisoformat = datetime.fromisoformat
        yield fixed_time


# ===============================
# ファイルシステム関連のMockフィクスチャ  
# ===============================

@pytest.fixture
def mock_file_operations():
    """ファイル操作のモック"""
    with patch('builtins.open', create=True) as mock_open, \
         patch('os.path.exists') as mock_exists, \
         patch('os.remove') as mock_remove:
        
        mock_exists.return_value = True
        yield {
            'open': mock_open,
            'exists': mock_exists, 
            'remove': mock_remove
        }


# ===============================
# 設定可能なMockフィクスチャ
# ===============================

@pytest.fixture
def configured_mock_db():
    """設定可能なDBマネージャーモック"""
    class ConfigurableMockDB:
        def __init__(self):
            self.mock = Mock()
            
        def setup_get_file(self, return_value=None):
            """get_fileメソッドの戻り値を設定"""
            self.mock.get_file.return_value = return_value
            return self
            
        def setup_list_files(self, return_value=None):
            """list_filesメソッドの戻り値を設定"""
            if return_value is None:
                return_value = FileTestData.empty_file_list()
            self.mock.list_files.return_value = return_value
            return self
            
        def setup_update_file_status(self, return_value=False):
            """update_file_statusメソッドの戻り値を設定"""
            self.mock.update_file_status.return_value = return_value
            return self
            
        def setup_delete_file(self, return_value=False):
            """delete_fileメソッドの戻り値を設定"""
            self.mock.delete_file.return_value = return_value
            return self
            
        def setup_exception(self, method_name, exception):
            """指定メソッドで例外を発生させる"""
            getattr(self.mock, method_name).side_effect = exception
            return self
    
    with patch('src.api.services.file_service.db_manager') as mock_db:
        configurable = ConfigurableMockDB()
        mock_db.get_file = configurable.mock.get_file
        mock_db.list_files = configurable.mock.list_files
        mock_db.update_file_status = configurable.mock.update_file_status
        mock_db.delete_file = configurable.mock.delete_file
        yield configurable


# ===============================
# パラメータ化テスト用フィクスチャ
# ===============================

@pytest.fixture(params=[
    FileTestData.valid_file_data(),
    FileTestData.minimal_file_data(),
    FileTestData.processing_file_data()
])
def various_file_data(request):
    """様々なファイルデータをパラメータ化"""
    return request.param


@pytest.fixture(params=[
    DatabaseTestResponses.successful_update_response(),
    DatabaseTestResponses.failed_update_response()
])
def update_responses(request):
    """更新レスポンスのパラメータ化"""
    return request.param
