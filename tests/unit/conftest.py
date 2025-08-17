"""
pytest 設定とテストフィクスチャ

このファイルで定義されたフィクスチャは、tests/unit/ 配下の
すべてのテストファイルで自動的に利用可能になります。
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from fastapi.testclient import TestClient

from src.api.main import app
from tests.unit import TEST_DATA_DIR
from tests.unit.helpers import upload_test_pdf, get_test_client


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
    import os
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
    return data["file_id"]


# ===========================
# パラメータ化フィクスチャ
# ===========================

@pytest.fixture(params=[
    ("test_markdown.pdf", "application/pdf"),
    ("document.pdf", "application/pdf"),
    ("sample.pdf", "application/octet-stream"),
])
def valid_pdf_files(request):
    """複数の有効なPDFファイルパターン
    
    このフィクスチャを使用するテストは、
    各パラメータに対して自動的に実行されます。
    """
    filename, content_type = request.param
    return filename, content_type


@pytest.fixture(params=[
    ("test_file.txt", "text/plain", "PDFファイルのみアップロード可能です"),
    ("document.doc", "application/msword", "PDFファイルのみアップロード可能です"),
    ("invalid.pdf", "application/pdf", "無効なPDFファイルです"),
])
def invalid_file_data(request):
    """無効なファイルデータのパターン
    
    異常系テストで使用する各種無効ファイルパターン
    """
    filename, content_type, expected_error = request.param
    
    # 無効なコンテンツを生成
    if filename.endswith('.pdf'):
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
                "status": "completed"
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
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )


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


@pytest.fixture
def valid_pdf_content():
    """有効なPDFファイルのコンテンツ"""
    from tests.unit.helpers import load_test_pdf
    return load_test_pdf()


# ===========================
# テスト結果の収集・レポート
# ===========================

@pytest.fixture(scope="session", autouse=True)
def test_session_setup():
    """テストセッション開始時の初期化処理"""
    print("\nテストセッション開始")
    yield
    print("\nテストセッション完了")
