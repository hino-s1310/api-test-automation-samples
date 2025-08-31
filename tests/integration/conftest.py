"""
Integration Tests用のpytest設定とフィクスチャ

実際のデータベース操作、ファイル操作、サービス間の連携をテスト
"""

import os
import shutil
import tempfile

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="session")
def test_client():
    """Integration Test用FastAPIクライアント（セッション全体で共有）

    実際のデータベース操作とファイル操作を行う統合テスト用
    """
    # テスト環境用の一時ディレクトリを作成
    temp_upload_dir = tempfile.mkdtemp(prefix="integration_uploads_")
    temp_markdown_dir = tempfile.mkdtemp(prefix="integration_markdown_")

    # 環境変数を設定してテスト用ディレクトリを使用
    original_upload_dir = os.environ.get("UPLOAD_DIR")
    original_markdown_dir = os.environ.get("MARKDOWN_DIR")

    os.environ["UPLOAD_DIR"] = temp_upload_dir
    os.environ["MARKDOWN_DIR"] = temp_markdown_dir
    os.environ["ENVIRONMENT"] = "test"

    client = TestClient(app)

    # クライアントと一時ディレクトリのパスを返す
    yield client

    # セッション終了時に一時ディレクトリをクリーンアップ
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


@pytest.fixture
def sample_file_id(test_client):
    """テスト用ファイルを作成し、そのIDを返す

    多くのテストで必要となる「既存ファイル」を事前に作成します。
    """
    # テスト用PDFをアップロードしてファイルIDを取得
    from tests.unit.helpers import upload_test_pdf

    data = upload_test_pdf(test_client)
    return data["id"]


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Integration Test用の環境セットアップ"""
    # テスト環境の設定
    os.environ["ENVIRONMENT"] = "test"
    os.environ["LOG_LEVEL"] = "DEBUG"

    yield

    # テスト環境のクリーンアップ
    pass
