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
# DRY原則に基づく共通データ準備フィクスチャ
# ===============================

@pytest.fixture
def single_file_data():
    """単一ファイルデータの準備"""
    return FileTestData.valid_file_data()


@pytest.fixture
def multiple_files_data():
    """複数ファイルデータの準備（同じデータ×2）"""
    base_data = FileTestData.valid_file_data()
    return [
        base_data,
        {**base_data, "id": "second-file-id", "filename": "second_file.pdf"}
    ]


@pytest.fixture
def unique_multiple_files_data():
    """複数の異なるファイルデータの準備"""
    return [
        FileTestData.valid_file_data(),
        FileTestData.processing_file_data(),
        FileTestData.failed_file_data()
    ]


@pytest.fixture
def list_files_response_data(multiple_files_data):
    """list_files API用の標準レスポンスデータ"""
    return {
        "files": multiple_files_data,
        "total_count": len(multiple_files_data),
        "page": 1,
        "per_page": 10
    }


@pytest.fixture
def paginated_response_data(multiple_files_data):
    """ページネーション用レスポンスデータ"""
    return {
        "files": multiple_files_data,
        "total_count": len(multiple_files_data),
        "page": 2,
        "per_page": 1
    }


@pytest.fixture
def empty_list_response():
    """空のファイル一覧レスポンス"""
    return FileTestData.empty_file_list()


# ===============================
# モック設定済みフィクスチャ
# ===============================

@pytest.fixture
def mock_get_file_success(mock_db_manager, single_file_data):
    """get_file成功パターンのモック設定済み"""
    mock_db_manager.get_file.return_value = single_file_data
    return single_file_data


@pytest.fixture
def mock_get_file_not_found(mock_db_manager):
    """get_file失敗（未発見）パターンのモック設定済み"""
    mock_db_manager.get_file.return_value = None
    return None


@pytest.fixture
def mock_list_files_success(mock_db_manager, list_files_response_data):
    """list_files成功パターンのモック設定済み"""
    mock_db_manager.list_files.return_value = list_files_response_data
    return list_files_response_data


@pytest.fixture
def mock_list_files_pagination(mock_db_manager, paginated_response_data):
    """list_filesページネーションパターンのモック設定済み"""
    mock_db_manager.list_files.return_value = paginated_response_data
    return paginated_response_data


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


# ===============================
# アサーション用ヘルパーフィクスチャ
# ===============================

@pytest.fixture
def assert_file_data():
    """ファイルデータ検証用のヘルパー関数"""
    def _assert_file_data(result, expected_data):
        """ファイルデータのアサーション"""
        assert result is not None
        assert result["id"] == expected_data["id"]
        assert result["filename"] == expected_data["filename"]
        
        # markdown_content キーが存在する場合のみチェック
        if "markdown_content" in expected_data:
            assert result["markdown"] == expected_data["markdown_content"]
        else:
            # キーが存在しない場合、デフォルト値（空文字）を想定
            assert result["markdown"] == ""
            
        assert result["status"] == expected_data["status"]
        assert result["file_size"] == expected_data["file_size"]
        
        # processing_time が存在する場合のみチェック
        if "processing_time" in expected_data:
            assert result["processing_time"] == expected_data["processing_time"]
        else:
            # キーが存在しない場合、デフォルト値（None）を想定
            assert result["processing_time"] is None
    return _assert_file_data


@pytest.fixture
def assert_list_response():
    """リストレスポンス検証用のヘルパー関数"""
    def _assert_list_response(result, expected_data, page=1, per_page=10):
        """リストレスポンスのアサーション"""
        assert result is not None
        assert len(result["files"]) == len(expected_data["files"])
        assert result["page"] == page
        assert result["per_page"] == per_page
        assert result["total_count"] == expected_data["total_count"]
        
        # 最初のファイルデータの詳細確認
        if len(result["files"]) > 0:
            first_file = result["files"][0]
            expected_first = expected_data["files"][0]
            assert first_file["id"] == expected_first["id"]
            assert first_file["filename"] == expected_first["filename"]
            assert first_file["status"] == expected_first["status"]
            assert first_file["file_size"] == expected_first["file_size"]
            assert first_file["processing_time"] == expected_first["processing_time"]
    
    return _assert_list_response
