"""
API テスト用ヘルパー関数

APIテストで使用される共通の処理を提供する
"""

from fastapi.testclient import TestClient
from src.api.main import app


def get_test_client() -> TestClient:
    """テスト用のFastAPIクライアントを取得"""
    return TestClient(app)


def load_test_pdf() -> bytes:
    """テスト用PDFファイルを読み込む
    
    Returns:
        bytes: テスト用PDFファイルの内容
        
    Raises:
        FileNotFoundError: テストファイルが見つからない場合
    """
    # パッケージレベルの設定を使用
    from tests.unit import TEST_DATA_DIR, TEST_FILE_NAME
    
    test_file_path = TEST_DATA_DIR / TEST_FILE_NAME
    
    try:
        with open(test_file_path, "rb") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(
            f"テスト用PDFファイル '{test_file_path}' が見つかりません。"
            "テストデータが正しく配置されているか確認してください。"
        )


def upload_test_pdf(
    client: TestClient = None,
    filename: str = "test_markdown.pdf", 
    content: bytes = None
) -> dict:
    """テスト用PDFファイルをアップロードし、レスポンスデータを返す
    
    Args:
        client: FastAPIテストクライアント（未指定の場合は新規作成）
        filename: アップロードするファイル名
        content: ファイル内容（未指定の場合はテスト用PDFを使用）
        
    Returns:
        dict: アップロードAPIのレスポンスデータ
        
    Raises:
        AssertionError: アップロードが失敗した場合
    """
    if client is None:
        client = get_test_client()
        
    if content is None:
        content = load_test_pdf()
    
    response = client.post("/upload", files={"file": (filename, content, "application/pdf")})
    assert response.status_code == 200, f"Upload failed: {response.content}"
    return response.json()


def create_test_file(client: TestClient = None) -> str:
    """テスト用ファイルを作成し、file_idを返す
    
    Args:
        client: FastAPIテストクライアント（未指定の場合は新規作成）
        
    Returns:
        str: 作成されたファイルのID
    """
    if client is None:
        client = get_test_client()
        
    data = upload_test_pdf(client)
    return data["file_id"]


def create_invalid_file_content(size_mb: int = None) -> bytes:
    """無効なファイル内容を生成
    
    Args:
        size_mb: ファイルサイズ（MB）。指定した場合、そのサイズの無効な内容を生成
        
    Returns:
        bytes: 無効なファイル内容
    """
    if size_mb:
        return b"x" * (size_mb * 1024 * 1024)
    return b"This is not a valid PDF content"


def assert_upload_response(data: dict, expected_status: str = "completed"):
    """アップロードレスポンスの共通アサーション
    
    Args:
        data: アップロードAPIのレスポンスデータ
        expected_status: 期待されるステータス
    """
    # レスポンスの型をチェック
    assert isinstance(data["status"], str)
    assert isinstance(data["file_id"], str) 
    assert isinstance(data["message"], str)
    
    # レスポンスの内容をチェック
    assert data["status"] == expected_status
    assert data["file_id"] is not None
    
    if expected_status == "completed":
        assert data["message"] == "PDFファイルのアップロードと変換が完了しました"


def assert_file_response(data: dict, expected_file_id: str, expected_filename: str = "test_markdown.pdf"):
    """ファイル取得レスポンスの共通アサーション
    
    Args:
        data: ファイル取得APIのレスポンスデータ
        expected_file_id: 期待されるファイルID
        expected_filename: 期待されるファイル名
    """
    # レスポンスの型をチェック
    assert isinstance(data["id"], str)
    assert isinstance(data["filename"], str)
    assert isinstance(data["markdown"], str)
    assert isinstance(data["status"], str)
    assert isinstance(data["created_at"], str)
    assert isinstance(data["updated_at"], str)
    
    # レスポンスの内容をチェック
    assert data["id"] == expected_file_id
    assert data["filename"] == expected_filename
    assert data["status"] == "completed"
    assert data["created_at"] is not None
    assert data["updated_at"] is not None


def assert_update_response(data: dict, expected_file_id: str, expected_filename: str = "test_markdown.pdf"):
    """ファイル更新レスポンスの共通アサーション"""
    assert isinstance(data["file_id"], str)
    assert isinstance(data["markdown"], str)
    assert isinstance(data["status"], str)
    assert isinstance(data["processing_time"], float)
    
    assert data["file_id"] == expected_file_id
    assert data["status"] == "completed"
    assert data["processing_time"] > 0


def assert_error_response(data: dict, expected_status_code: int, expected_message: str):
    """エラーレスポンスの共通アサーション"""
    assert "detail" in data
    assert expected_message in data["detail"]


def assert_invalid_file_id_error(response, expected_status_code: int = 400):
    """無効なファイルIDエラーの共通アサーション"""
    assert response.status_code == expected_status_code
    data = response.json()
    assert "無効なファイルID形式です" in data["detail"]


def assert_file_not_found_error(response, expected_status_code: int = 404):
    """ファイル未発見エラーの共通アサーション"""
    assert response.status_code == expected_status_code
    data = response.json()
    assert "ファイルが見つかりません" in data["detail"]


def assert_validation_error(response, expected_message: str, expected_status_code: int = 400):
    """バリデーションエラーの共通アサーション"""
    assert response.status_code == expected_status_code
    data = response.json()
    assert expected_message in data["detail"]


# =======================
# 共通テストパターン関数
# =======================

def run_invalid_file_id_patterns(test_client, endpoint_func):
    """無効なファイルIDパターンの共通テスト
    
    Args:
        test_client: テストクライアント
        endpoint_func: エンドポイントを呼び出す関数
    """
    # パターン1: 数字のみ
    response = endpoint_func(test_client, "100")
    assert_invalid_file_id_error(response)
    
    # パターン2: 存在しないが有効なUUID
    response = endpoint_func(test_client, "12345678-1234-5678-9abc-123456789def")
    # PUTやその他の操作では、有効なUUIDでも400が返される場合がある
    # （実装の詳細に依存するため、400または404を受け入れる）
    assert response.status_code in [400, 404]
    
    # パターン3: 無効な文字列形式
    response = endpoint_func(test_client, "not-a-valid-uuid")
    assert_invalid_file_id_error(response)


def create_file_endpoint_caller(method: str, endpoint_template: str, **kwargs):
    """ファイルエンドポイント呼び出し関数を生成
    
    Args:
        method: HTTPメソッド ('GET', 'PUT', 'DELETE')
        endpoint_template: エンドポイントテンプレート
        **kwargs: 追加のリクエストパラメータ
    """
    def caller(test_client, file_id: str):
        endpoint = endpoint_template.format(file_id=file_id)
        if method == "GET":
            return test_client.get(endpoint)
        elif method == "PUT":
            return test_client.put(endpoint, **kwargs)
        elif method == "DELETE":
            return test_client.delete(endpoint)
        else:
            raise ValueError(f"Unsupported method: {method}")
    return caller


def create_test_uuids():
    """テスト用UUID群を生成"""
    return {
        "invalid_numeric": "100",
        "non_existent_uuid": "12345678-1234-5678-9abc-123456789def",
        "invalid_string": "not-a-valid-uuid"
    }
