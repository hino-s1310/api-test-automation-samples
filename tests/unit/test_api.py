import pytest
from src.api.models import FileStatus
from .helpers import (
    upload_test_pdf,
    assert_upload_response,
    assert_file_response,
    assert_update_response,
    assert_invalid_file_id_error,
    assert_file_not_found_error,
    assert_validation_error,
    run_invalid_file_id_patterns,
    create_file_endpoint_caller
)
from .helpers.test_data import InvalidTestData, APIEndpoints, TestFileData

# ヘルスチェックAPIのテスト
def test_health_check(test_client):
    """ヘルスチェックAPIのテスト（フィクスチャ使用）"""
    response = test_client.get(APIEndpoints.HEALTH)
    assert response.status_code == 200
    data = response.json()

    # 値の型をチェックする
    assert isinstance(data["status"], str)
    assert isinstance(data["version"], str)
    assert isinstance(data["timestamp"], str)
    assert isinstance(data["uptime"], float)

    # 値の内容をチェックする
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"

    # uptimeの範囲をチェックする
    assert 0.0 <= data["uptime"] < 1.0

# PDFファイルをMarkdownに変換するAPIのテスト（正常系）
def test_upload_pdf_success(test_client):
    """PDFアップロード正常系テスト（フィクスチャ使用）"""
    # ヘルパー関数を使用してアップロード
    data = upload_test_pdf(test_client)

    # 共通のアサーション関数を使用
    assert_upload_response(data, "completed")

# PDFファイルをMarkdownに変換するAPIのテスト（異常系）
def test_upload_pdf_failure(test_client):
    # 異常系テストケース1: 拡張子がPDFでないファイル
    filename, content, content_type = InvalidTestData.create_non_pdf_file()
    response = test_client.post(APIEndpoints.UPLOAD, files={"file": (filename, content, content_type)})
    
    assert response.status_code == 400
    data = response.json()
    assert TestFileData.EXPECTED_PDF_EXTENSION_ERROR in data["detail"]

    # 異常系テストケース2: 拡張子はPDFだが内容が無効
    filename, content, content_type = InvalidTestData.create_invalid_pdf_file()
    response = test_client.post(APIEndpoints.UPLOAD, files={"file": (filename, content, content_type)})
    
    assert response.status_code == 400
    data = response.json()
    assert TestFileData.EXPECTED_INVALID_PDF_ERROR in data["detail"]

    # 異常系テストケース3: ファイルサイズが大きすぎる（10MBを超える）
    filename, content, content_type = InvalidTestData.create_oversized_file(11)
    response = test_client.post(APIEndpoints.UPLOAD, files={"file": (filename, content, content_type)})
    
    assert response.status_code == 400
    data = response.json()
    assert TestFileData.EXPECTED_SIZE_LIMIT_ERROR in data["detail"]

# ファイルIDを指定してファイル情報を取得するAPIのテスト（正常系）
def test_get_file_success(sample_file_id, test_client):
    """ファイル取得APIのテスト（sample_file_idフィクスチャ使用）"""
    # sample_file_id フィクスチャで既にファイルが作成済み
    
    # ファイルIDを指定してファイル情報を取得する
    response = test_client.get(APIEndpoints.get_file_endpoint(sample_file_id))
    assert response.status_code == 200
    data = response.json()

    # 共通のアサーション関数を使用
    assert_file_response(data, sample_file_id, "test_markdown.pdf")


# ファイルIDを指定してファイル情報を取得するAPIのテスト（異常系）
def test_get_file_failure(test_client):
    """ファイル取得APIの異常系テスト（共通パターン使用）"""
    get_file_caller = create_file_endpoint_caller("GET", "/files/{file_id}")
    run_invalid_file_id_patterns(test_client, get_file_caller)

# ファイル一覧取得APIのテスト（正常系）
def test_list_files_success(test_client):
    """ファイル一覧取得APIのテスト（正常系）"""
    response = test_client.get(APIEndpoints.LIST_FILES)
    assert response.status_code == 200
    data = response.json()
    assert "files" in data
    assert len(data["files"]) > 0

# ファイル一覧取得APIのテスト（異常系）
def test_list_files_failure(test_client): 
    """ファイル一覧取得APIの異常系テスト（バリデーション統合）"""
    
    # 無効なページ番号
    response = test_client.get(APIEndpoints.LIST_FILES, params={"page": 0})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert any("greater than or equal to 1" in str(error.get("msg", "")) for error in data["detail"])
    
    # 無効な1ページあたりの件数
    response = test_client.get(APIEndpoints.LIST_FILES, params={"per_page": 0})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert any("greater than or equal to 1" in str(error.get("msg", "")) for error in data["detail"])
    
    # 上限を超える1ページあたりの件数
    response = test_client.get(APIEndpoints.LIST_FILES, params={"per_page": 101})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert any("less than or equal to 100" in str(error.get("msg", "")) for error in data["detail"])

# ファイル更新APIのテスト（正常系）
def test_update_file_success(sample_file_id, test_client):
    """ファイル更新APIのテスト（正常系）"""
    # sample_file_id フィクスチャで既にファイルが作成済み
    
    # 実際のPDFファイルを使用してファイル更新APIを呼び出す
    from .helpers import load_test_pdf
    pdf_content = load_test_pdf()
    
    response = test_client.put(
        APIEndpoints.get_file_endpoint(sample_file_id), 
        files={"file": ("test_markdown.pdf", pdf_content, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert_update_response(data, sample_file_id, "test_markdown.pdf")  

# ファイル更新APIのテスト（異常系）
def test_update_file_failure(test_client):
    """ファイル更新APIの異常系テスト（共通パターン使用）"""
    from .helpers import load_test_pdf
    pdf_content = load_test_pdf()
    
    update_file_caller = create_file_endpoint_caller(
        "PUT", 
        "/files/{file_id}",
        files={"file": ("test_markdown.pdf", pdf_content, "application/pdf")}
    )
    run_invalid_file_id_patterns(test_client, update_file_caller)

# ファイル削除APIのテスト（正常系）
def test_delete_file_success(sample_file_id, test_client):
    """ファイル削除APIのテスト（正常系）"""
    # sample_file_id フィクスチャで既にファイルが作成済み
    
    # ファイル削除APIを呼び出す
    response = test_client.delete(APIEndpoints.get_file_endpoint(sample_file_id))
    assert response.status_code == 200
    data = response.json()  
    assert "message" in data
    assert "削除されました" in data["message"]

# ファイル削除APIのテスト（異常系）
def test_delete_file_failure(test_client):
    """ファイル削除APIの異常系テスト（共通パターン使用）"""
    delete_file_caller = create_file_endpoint_caller("DELETE", "/files/{file_id}")
    run_invalid_file_id_patterns(test_client, delete_file_caller)

# ファイルログ取得APIのテスト（正常系）
def test_get_file_logs_success(sample_file_id, test_client):
    """ファイルログ取得APIのテスト（正常系）"""
    # sample_file_id フィクスチャで既にファイルが作成済み
    
    # ファイルログ取得APIを呼び出す
    response = test_client.get(APIEndpoints.get_file_logs_endpoint(sample_file_id))
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert len(data["logs"]) > 0

# ファイルログ取得APIのテスト（異常系）
def test_get_file_logs_failure(test_client):
    """ファイルログ取得APIの異常系テスト（共通パターン使用）"""
    get_logs_caller = create_file_endpoint_caller("GET", "/files/{file_id}/logs")
    run_invalid_file_id_patterns(test_client, get_logs_caller)

# 統計情報取得APIのテスト（正常系）
def test_get_statistics_success(test_client):
    """統計情報取得APIのテスト（正常系）"""
    response = test_client.get(APIEndpoints.GET_STATISTICS) 

    assert response.status_code == 200
    data = response.json()
    # 実際のレスポンス形式に合わせて修正
    assert "total_files" in data
    assert "status_counts" in data
    assert "total_size_bytes" in data
    assert isinstance(data["total_files"], int)
    assert isinstance(data["status_counts"], dict)

# 古いファイルクリーンアップAPIのテスト（正常系）
def test_cleanup_old_files_success(test_client):
    """古いファイルクリーンアップAPIのテスト（正常系）"""
    response = test_client.post(APIEndpoints.CLEANUP_OLD_FILES, params={"days": 1})
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "クリーンアップが完了しました" in data["message"]
    assert "deleted_count" in data
    assert "total_old_files" in data
    assert isinstance(data["deleted_count"], int)
    assert isinstance(data["total_old_files"], int)

# 古いファイルクリーンアップAPIのテスト（異常系）
def test_cleanup_old_files_failure(test_client):
    """古いファイルクリーンアップAPIの異常系テスト（バリデーション統合）"""
    
    # 最小値未満
    response = test_client.post(APIEndpoints.CLEANUP_OLD_FILES, params={"days": 0})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert any("greater than or equal to 1" in str(error.get("msg", "")) for error in data["detail"])
    
    # 最大値超過
    response = test_client.post(APIEndpoints.CLEANUP_OLD_FILES, params={"days": 366})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert any("less than or equal to 365" in str(error.get("msg", "")) for error in data["detail"])