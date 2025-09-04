"""
API統合テスト（Unit Test用）

統合的な動作確認を行うテスト
バリデーションテストは既存のルーターUnit Testsでカバー済み
"""

from .helpers import (
    assert_file_response,
    assert_update_response,
    assert_upload_response,
    load_test_pdf,
    upload_test_pdf,
)
from .helpers.test_data import APIEndpoints


# PDFファイルをMarkdownに変換するAPIの統合テスト（正常系）
def test_upload_pdf_success(test_client):
    """PDFアップロード統合テスト（実DB操作）"""
    # ヘルパー関数を使用してアップロード
    data = upload_test_pdf(test_client)

    # 共通のアサーション関数を使用
    assert_upload_response(data, "completed")


# ファイルIDを指定してファイル情報を取得するAPIの統合テスト（正常系）
def test_get_file_success(sample_file_id, test_client):
    """ファイル取得APIの統合テスト（実DB操作）"""
    # sample_file_id フィクスチャで既にファイルが作成済み

    # ファイルIDを指定してファイル情報を取得する
    response = test_client.get(APIEndpoints.get_file_endpoint(sample_file_id))
    assert response.status_code == 200
    data = response.json()

    # 共通のアサーション関数を使用
    assert_file_response(data, sample_file_id, "test_markdown.pdf")


# ファイル一覧取得APIの統合テスト（正常系）
def test_list_files_success(test_client):
    """ファイル一覧取得APIの統合テスト（実DB操作）"""
    response = test_client.get(APIEndpoints.LIST_FILES)
    assert response.status_code == 200
    data = response.json()
    assert "files" in data
    # ファイルが存在しない場合でも正常に動作することを確認
    assert isinstance(data["files"], list)
    # レスポンス構造の確認
    assert "total_count" in data
    assert "page" in data
    assert "per_page" in data


# ファイル更新APIの統合テスト（正常系）
def test_update_file_success(sample_file_id, test_client):
    """ファイル更新APIの統合テスト（実DB操作）"""
    # sample_file_id フィクスチャで既にファイルが作成済み

    pdf_content = load_test_pdf()

    response = test_client.put(
        APIEndpoints.get_file_endpoint(sample_file_id),
        files={"file": ("test_markdown.pdf", pdf_content, "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()
    assert_update_response(data, sample_file_id, "test_markdown.pdf")


# ファイル削除APIの統合テスト（正常系）
def test_delete_file_success(sample_file_id, test_client):
    """ファイル削除APIの統合テスト（実DB操作）"""
    # sample_file_id フィクスチャで既にファイルが作成済み

    # ファイル削除APIを呼び出す
    response = test_client.delete(APIEndpoints.get_file_endpoint(sample_file_id))
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "削除されました" in data["message"]


# ファイルログ取得APIの統合テスト（正常系）
def test_get_file_logs_success(sample_file_id, test_client):
    """ファイルログ取得APIの統合テスト（実DB操作）"""
    # sample_file_id フィクスチャで既にファイルが作成済み

    # ファイルログ取得APIを呼び出す
    response = test_client.get(APIEndpoints.get_file_logs_endpoint(sample_file_id))
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    # ログが空の場合でも正常に動作することを確認
    assert isinstance(data["logs"], list)


# 統計情報取得APIの統合テスト（正常系）
def test_get_statistics_success(test_client):
    """統計情報取得APIの統合テスト（実DB操作）"""
    response = test_client.get(APIEndpoints.GET_STATISTICS)

    assert response.status_code == 200
    data = response.json()
    # 実際のレスポンス構造に合わせて修正
    assert "total_files" in data
    assert "status_counts" in data
    assert "total_size_bytes" in data
    assert "total_size_mb" in data
    assert "total_processing_time" in data
    assert "average_processing_time" in data
    assert isinstance(data["total_files"], int)
    assert isinstance(data["total_size_bytes"], int)
    assert isinstance(data["total_size_mb"], int | float)
    assert isinstance(data["total_processing_time"], int | float)
    assert isinstance(data["average_processing_time"], int | float)


# 古いファイルクリーンアップAPIの統合テスト（正常系）
def test_cleanup_old_files_success(test_client):
    """古いファイルクリーンアップAPIの統合テスト（実DB操作）"""
    response = test_client.post(APIEndpoints.CLEANUP_OLD_FILES, params={"days": 1})
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "クリーンアップが完了しました" in data["message"]
    assert "deleted_count" in data
    assert "total_old_files" in data
    assert isinstance(data["deleted_count"], int)
    assert isinstance(data["total_old_files"], int)


# ヘルスチェックAPIの統合テスト
def test_health_check(test_client):
    """ヘルスチェックAPIの統合テスト（システム状態確認）"""
    response = test_client.get(APIEndpoints.HEALTH)
    assert response.status_code == 200
    data = response.json()

    # 値の型をチェックする
    assert isinstance(data["status"], str)
    assert isinstance(data["version"], str)
    assert isinstance(data["uptime"], int | float)

    # 値の内容をチェックする
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"

    # uptimeの範囲をチェックする（システム起動後の経過時間なので0以上）
    assert data["uptime"] >= 0.0


# エンドポイント間の連携テスト
def test_file_lifecycle_integration(test_client):
    """ファイルライフサイクルの統合テスト（アップロード→取得→更新→削除）"""
    # 1. ファイルアップロード
    upload_data = upload_test_pdf(test_client)
    file_id = upload_data["id"]
    assert upload_data["status"] == "completed"

    # 2. ファイル取得
    response = test_client.get(APIEndpoints.get_file_endpoint(file_id))
    assert response.status_code == 200
    file_data = response.json()
    assert file_data["id"] == file_id

    pdf_content = load_test_pdf()
    response = test_client.put(
        APIEndpoints.get_file_endpoint(file_id),
        files={"file": ("updated.pdf", pdf_content, "application/pdf")},
    )
    assert response.status_code == 200

    # 4. ファイル削除
    response = test_client.delete(APIEndpoints.get_file_endpoint(file_id))
    assert response.status_code == 200
    assert "削除されました" in response.json()["message"]

    # 5. 削除後の確認
    response = test_client.get(APIEndpoints.get_file_endpoint(file_id))
    assert response.status_code == 404
