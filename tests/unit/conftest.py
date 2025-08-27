"""
pytest 設定とテストフィクスチャ

このファイルで定義されたフィクスチャは、tests/unit/ 配下の
すべてのテストファイルで自動的に利用可能になります。
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from apps.api.main import app
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
    return TestClient(app)


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
    original_env = os.environ.copy()

    # テスト用環境変数の設定
    os.environ["ENVIRONMENT"] = "test"
    os.environ["LOG_LEVEL"] = "DEBUG"

    yield  # ここでテストが実行される

    # テスト実行後のクリーンアップ
    os.environ.clear()
    os.environ.update(original_env)


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
def pdf_service_for_test(temp_dir):
    """テスト用のPDFServiceインスタンス（一時ディレクトリを使用）"""
    from apps.api.services.pdf_service import PDFService

    # 一時ディレクトリ内にサブディレクトリを作成
    upload_dir = temp_dir / "test_uploads"
    markdown_dir = temp_dir / "test_markdown"
    upload_dir.mkdir()
    markdown_dir.mkdir()

    return PDFService(upload_dir=str(upload_dir), markdown_dir=str(markdown_dir))


# ===========================
# FileService関連のフィクスチャ
# ===========================


@pytest.fixture
def file_service():
    """FileServiceのインスタンス（DB がモック済み）"""
    from apps.api.services.file_service import FileService

    return FileService()


# ===========================
# Mock関連のフィクスチャ
# ===========================


@pytest.fixture
def mock_db_manager():
    """データベースマネージャーのモック"""
    with patch("apps.api.services.file_service.db_manager") as mock_db:
        yield mock_db


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
    monkeypatch.setattr("apps.api.main.pdf_service", mock_service)
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
    logging.getLogger("apps.api").setLevel(logging.DEBUG)

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
