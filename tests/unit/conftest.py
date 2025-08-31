"""
pytest 設定とテストフィクスチャ

このファイルで定義されたフィクスチャは、tests/unit/ 配下の
すべてのテストファイルで自動的に利用可能になります。
"""

import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from tests.unit import TEST_DATA_DIR
from tests.unit.helpers import upload_test_pdf

# ===========================
# セッション スコープフィクスチャ
# ===========================


@pytest.fixture(scope="session")
def test_client():
    """テスト用FastAPIクライアント（セッション全体で共有）

    すべてのテストで同じクライアントインスタンスを使用することで、
    テスト実行時間を短縮できます。
    """
    # テスト環境用の一時ディレクトリを作成
    import os
    import tempfile

    # テスト用の一時ディレクトリを作成
    temp_upload_dir = tempfile.mkdtemp(prefix="test_uploads_")
    temp_markdown_dir = tempfile.mkdtemp(prefix="test_markdown_")

    # 環境変数を設定してテスト用ディレクトリを使用
    original_upload_dir = os.environ.get("UPLOAD_DIR")
    original_markdown_dir = os.environ.get("MARKDOWN_DIR")

    os.environ["UPLOAD_DIR"] = temp_upload_dir
    os.environ["MARKDOWN_DIR"] = temp_markdown_dir

    client = TestClient(app)

    # クライアントと一時ディレクトリのパスを返す
    yield client

    # セッション終了時に一時ディレクトリをクリーンアップ
    import shutil

    try:
        shutil.rmtree(temp_upload_dir)
        shutil.rmtree(temp_markdown_dir)
    except Exception as e:
        print(f"一時ディレクトリのクリーンアップエラー: {e}")

    # 環境変数を元に戻す
    if original_upload_dir:
        os.environ["UPLOAD_DIR"] = original_upload_dir
    else:
        os.environ.pop("UPLOAD_DIR", None)

    if original_markdown_dir:
        os.environ["MARKDOWN_DIR"] = original_markdown_dir
    else:
        os.environ.pop("MARKDOWN_DIR", None)


@pytest.fixture(scope="session")
def test_data_dir():
    """テストデータディレクトリパス（セッション全体で共有）"""
    return TEST_DATA_DIR


# ===========================
# 関数 スコープフィクスチャ
# ===========================


@pytest.fixture
def clean_environment():
    """各テスト実行前後の環境クリーンアップ

    各テスト関数の実行前後で環境をクリーンな状態に保ちます。
    """
    # テスト実行前のセットアップ
    import os

    original_env = os.environ.copy()

    # テスト用環境変数の設定
    os.environ["ENVIRONMENT"] = "test"
    os.environ["LOG_LEVEL"] = "DEBUG"

    yield  # ここでテストが実行される

    # テスト実行後のクリーンアップ
    os.environ.clear()
    os.environ.update(original_env)

    # テスト実行後に作成された一時ファイルをクリーンアップ

    # テスト用の一時ディレクトリをクリーンアップ（空の場合のみ）
    test_dirs = ["test_markdown", "test_uploads"]
    for dir_name in test_dirs:
        if os.path.exists(dir_name):
            try:
                # ディレクトリが空の場合のみ削除
                if not os.listdir(dir_name):
                    os.rmdir(dir_name)
                    print(f"空のディレクトリを削除: {dir_name}")
            except Exception as e:
                print(f"ディレクトリ削除エラー {dir_name}: {e}")


@pytest.fixture
def temp_dir():
    """一時ディレクトリの作成とクリーンアップ

    テスト用の一時ディレクトリを作成し、テスト終了後に自動削除します。
    """
    temp_directory = tempfile.mkdtemp()
    yield Path(temp_directory)
    shutil.rmtree(temp_directory)


@pytest.fixture
def sample_file_id(test_client):
    """テスト用ファイルを作成し、そのIDを返す

    多くのテストで必要となる「既存ファイル」を事前に作成します。
    """
    # テスト用PDFをアップロードしてファイルIDを取得
    data = upload_test_pdf(test_client)
    return data["id"]


# ===========================
# パラメータ化フィクスチャ
# ===========================

# ===========================
# PDFService関連のフィクスチャ
# ===========================


@pytest.fixture
def pdf_service_for_test():
    """テスト用のPDFServiceインスタンス（特定のディレクトリを指定）"""
    from src.api.services.pdf_service import PDFService

    return PDFService(upload_dir="test_uploads", markdown_dir="test_markdown")


# ===========================
# FileService関連のフィクスチャ
# ===========================


@pytest.fixture
def file_service(mock_db_manager):
    """FileServiceのインスタンス（モックされたFileRepositoryを使用）"""
    from src.api.services.file_service import FileService

    # モックされたFileRepositoryを注入
    service = FileService(file_repository=mock_db_manager)
    return service


# ===========================
# Mock関連のフィクスチャ
# ===========================


@pytest.fixture
def mock_db_manager():
    """FileRepositoryのモック（改良後のサービス層に対応）"""
    from unittest.mock import Mock

    # FileRepositoryのモックを作成
    mock_repo = Mock()

    # 基本的なメソッドのデフォルト戻り値を設定
    mock_repo.get_file.return_value = None
    mock_repo.list_files.return_value = {
        "files": [],
        "total_count": 0,
        "page": 1,
        "per_page": 10,
    }
    mock_repo.update_file_status.return_value = True
    mock_repo.delete_file.return_value = True
    mock_repo.get_conversion_logs.return_value = []
    mock_repo.get_file_statistics.return_value = {
        "total_files": 0,
        "status_counts": {"processing": 0, "completed": 0, "failed": 0},
        "total_size_bytes": 0,
        "total_size_mb": 0,
        "total_processing_time": 0,
        "average_processing_time": 0,
    }
    mock_repo.cleanup_old_files.return_value = {
        "success": True,
        "deleted_count": 0,
        "total_old_files": 0,
    }
    mock_repo.update_file_content.return_value = True
    mock_repo.get_edit_history.return_value = []
    mock_repo.search_files.return_value = {
        "files": [],
        "total_count": 0,
        "page": 1,
        "per_page": 10,
    }
    mock_repo.batch_delete_files.return_value = {
        "success": True,
        "deleted_count": 0,
        "failed_count": 0,
        "failed_files": [],
    }
    mock_repo.get_files_by_status.return_value = {"files": [], "total_count": 0}
    mock_repo.get_files_created_after.return_value = {"files": [], "total_count": 0}
    mock_repo.get_files_created_before.return_value = {"files": [], "total_count": 0}
    mock_repo.get_orphaned_files.return_value = {
        "orphaned_files": [],
        "total_orphaned": 0,
    }
    mock_repo.get_database_info.return_value = {"total_files": 0, "status_counts": {}}

    # 編集履歴関連のモック
    mock_repo.get_edit_history.return_value = []
    mock_repo.get_edit_history_by_id.return_value = None

    return mock_repo


@pytest.fixture
def valid_pdf_content():
    """有効なPDFコンテンツ"""
    from tests.unit.fixtures import PDFTestData

    return PDFTestData.valid_pdf_bytes()


@pytest.fixture
def invalid_pdf_content():
    """無効なPDFコンテンツ"""
    from tests.unit.fixtures import PDFTestData

    return PDFTestData.invalid_pdf_bytes()


@pytest.fixture
def large_pdf_content():
    """サイズ制限を超えるPDFコンテンツ"""
    from tests.unit.fixtures import PDFTestData

    return PDFTestData.large_pdf_bytes()


@pytest.fixture(
    params=[
        ("test_markdown.pdf", "application/pdf"),
        ("document.pdf", "application/pdf"),
        ("sample.pdf", "application/octet-stream"),
    ]
)
def valid_pdf_files(request):
    """複数の有効なPDFファイルパターン

    このフィクスチャを使用するテストは、
    各パラメータに対して自動的に実行されます。
    """
    filename, content_type = request.param
    return filename, content_type


@pytest.fixture(
    params=[
        ("test_file.txt", "text/plain", "PDFファイルのみアップロード可能です"),
        ("document.doc", "application/msword", "PDFファイルのみアップロード可能です"),
        ("invalid.pdf", "application/pdf", "無効なPDFファイルです"),
    ]
)
def invalid_file_data(request):
    """無効なファイルデータのパターン

    異常系テストで使用する各種無効ファイルパターン
    """
    filename, content_type, expected_error = request.param

    # 無効なコンテンツを生成
    if filename.endswith(".pdf"):
        content = b"This is not a valid PDF content"
    else:
        content = b"This is not a PDF file"

    return filename, content, content_type, expected_error


# ===========================
# モック・スタブフィクスチャ
# ===========================


@pytest.fixture
def mock_pdf_service(monkeypatch):
    """PDFサービスのモック

    PDFサービスの処理をモック化して、テストを高速化・安定化します。
    """

    class MockPDFService:
        def __init__(self):
            self.processed_files = []

        async def process_pdf_upload(self, file_content, filename):
            self.processed_files.append(filename)
            return {
                "success": True,
                "file_id": "mock-file-id-123",
                "status": "completed",
            }

    mock_service = MockPDFService()
    monkeypatch.setattr("src.api.main.pdf_service", mock_service)
    return mock_service


# ===========================
# pytest 設定
# ===========================


def pytest_configure(config):
    """pytest の設定

    カスタムマーカーやその他の設定を行います。
    """
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "unit: marks tests as unit tests")


@pytest.fixture(autouse=True)
def setup_test_logging():
    """テスト用ログ設定（自動適用）

    autouse=True により、すべてのテストで自動的に適用されます。
    """
    import logging

    # テスト用ログレベル設定
    logging.getLogger("src.api").setLevel(logging.DEBUG)

    yield

    # ログ設定のリセット（必要に応じて）


# ===========================
# テストデータフィクスチャ
# ===========================


@pytest.fixture
def large_file_content():
    """大容量ファイルのコンテンツ（10MB超）"""
    return b"x" * (11 * 1024 * 1024)  # 11MB


# ===========================
# 不足しているfixtureの追加
# ===========================


@pytest.fixture
def mock_get_file_success():
    """ファイル取得成功のモックデータ"""
    return {
        "id": "test-file-id-123",
        "filename": "test.pdf",
        "markdown_content": "# Test Content\n\nThis is test content.",
        "status": "completed",
        "created_at": "2025-01-01T00:00:00",
        "updated_at": "2025-01-01T00:00:00",
        "file_size": 1024,
        "processing_time": 1.5,
    }


@pytest.fixture
def mock_get_file_not_found():
    """ファイルが見つからない場合のモックデータ"""
    return None


@pytest.fixture
def mock_list_files_success():
    """ファイル一覧取得成功のモックデータ"""
    return {
        "files": [
            {
                "id": "file-1",
                "filename": "test1.pdf",
                "status": "completed",
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
                "file_size": 1024,
                "processing_time": 1.5,
            },
            {
                "id": "file-2",
                "filename": "test2.pdf",
                "status": "completed",
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
                "file_size": 2048,
                "processing_time": 2.0,
            },
        ],
        "total_count": 2,
        "page": 1,
        "per_page": 10,
    }


@pytest.fixture
def mock_list_files_pagination():
    """ページネーション用のモックデータ"""
    return {
        "files": [
            {
                "id": "file-2",
                "filename": "test2.pdf",
                "status": "completed",
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
                "file_size": 2048,
                "processing_time": 2.0,
            }
        ],
        "total_count": 2,
        "page": 2,
        "per_page": 1,
    }


@pytest.fixture
def single_file_data():
    """単一ファイルのテストデータ"""
    return {
        "id": "test-file-id-123",
        "filename": "test.pdf",
        "markdown_content": "# Test Content\n\nThis is test content.",
        "status": "completed",
        "created_at": "2025-01-01T00:00:00",
        "updated_at": "2025-01-01T00:00:00",
        "file_size": 1024,
        "processing_time": 1.5,
    }


@pytest.fixture
def assert_file_data():
    """ファイルデータのアサーション用ヘルパー"""

    def _assert_file_data(actual, expected):
        assert actual is not None
        assert actual["id"] == expected["id"]
        assert actual["filename"] == expected["filename"]

        # markdown_contentキーが存在する場合はmarkdownと比較
        if "markdown_content" in expected:
            assert actual["markdown"] == expected["markdown_content"]
        elif "markdown" in expected:
            assert actual["markdown"] == expected["markdown"]

        assert actual["status"] == expected["status"]
        assert actual["created_at"] == expected["created_at"]
        assert actual["updated_at"] == expected["updated_at"]
        # オプショナルなフィールドの確認
        if "file_size" in expected:
            assert actual["file_size"] == expected["file_size"]
        if "processing_time" in expected:
            assert actual["processing_time"] == expected["processing_time"]

    return _assert_file_data


@pytest.fixture
def assert_list_response():
    """リストレスポンスのアサーション用ヘルパー"""

    def _assert_list_response(actual, expected, page=1, per_page=10):
        assert actual is not None
        assert actual["total_count"] == expected["total_count"]
        assert actual["page"] == page
        assert actual["per_page"] == per_page
        assert len(actual["files"]) == len(expected["files"])

        for i, file in enumerate(actual["files"]):
            expected_file = expected["files"][i]
            assert file["id"] == expected_file["id"]
            assert file["filename"] == expected_file["filename"]
            assert file["status"] == expected_file["status"]

    return _assert_list_response


@pytest.fixture
def list_files_response_data():
    """ファイル一覧レスポンス用のテストデータ"""
    return {
        "files": [
            {
                "id": "file-1",
                "filename": "test1.pdf",
                "status": "completed",
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
                "file_size": 1024,
                "processing_time": 1.5,
            }
        ],
        "total_count": 1,
        "page": 1,
        "per_page": 10,
    }


# ===========================
# テスト結果の収集・レポート
# ===========================


@pytest.fixture(scope="session", autouse=True)
def test_session_setup():
    """テストセッション開始時の初期化処理"""
    print("\nテストセッション開始")
    yield
    print("\nテストセッション完了")

    # テストセッション終了時のクリーンアップ
    print("\nテストセッション終了時のクリーンアップを実行中...")

    # テスト実行時に作成された一時ファイルをクリーンアップ
    import os
    import shutil

    # テスト用の一時ディレクトリをクリーンアップ
    test_dirs = ["test_markdown", "test_uploads"]
    for dir_name in test_dirs:
        if os.path.exists(dir_name):
            try:
                shutil.rmtree(dir_name)
                print(f"削除されたディレクトリ: {dir_name}")
            except Exception as e:
                print(f"ディレクトリ削除エラー {dir_name}: {e}")

    # テスト用データベースファイルをクリーンアップ
    test_db_files = ["test_database.db"]
    for db_file in test_db_files:
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
                print(f"削除されたファイル: {db_file}")
            except Exception as e:
                print(f"ファイル削除エラー {db_file}: {e}")

    print("テストセッション終了時のクリーンアップ完了")
