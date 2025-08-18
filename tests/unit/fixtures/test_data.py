"""
テストデータ定義モジュール

各種テストで使用するモックデータを一元管理
"""

from datetime import datetime
from typing import Dict, Any, List
from src.api.models import FileStatus


class FileTestData:
    """ファイル関連のテストデータ"""
    
    # ===============================
    # 基本的なファイルデータ
    # ===============================
    
    @staticmethod
    def valid_file_data() -> Dict[str, Any]:
        """有効なファイルデータ（完全版）"""
        return {
            "id": "12345678-1234-5678-9abc-123456789def",
            "filename": "test_markdown.pdf",
            "markdown_content": "# Test Markdown Content\n\nThis is a test document.",
            "status": "completed",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:30:00Z",
            "file_size": 1024,
            "processing_time": 2.5
        }
    
    @staticmethod
    def minimal_file_data() -> Dict[str, Any]:
        """最小限のファイルデータ（必須項目のみ）"""
        return {
            "id": "minimal-file-id",
            "filename": "minimal.pdf",
            "status": "processing",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "file_size": 512
        }
    
    @staticmethod
    def processing_file_data() -> Dict[str, Any]:
        """処理中のファイルデータ"""
        return {
            "id": "processing-file-id",
            "filename": "processing_document.pdf",
            "markdown_content": "",
            "status": "processing",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "file_size": 2048,
            "processing_time": None
        }
    
    @staticmethod
    def failed_file_data() -> Dict[str, Any]:
        """処理失敗のファイルデータ"""
        return {
            "id": "failed-file-id",
            "filename": "corrupted_file.pdf",
            "markdown_content": "",
            "status": "failed",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T01:00:00Z",
            "file_size": 256,
            "processing_time": 5.0,
            "error_message": "PDF parsing failed"
        }
    
    # ===============================
    # ファイル一覧データ
    # ===============================
    
    @staticmethod
    def file_list_data() -> Dict[str, Any]:
        """ファイル一覧のテストデータ"""
        return {
            "files": [
                FileTestData.valid_file_data(),
                FileTestData.processing_file_data(),
                FileTestData.failed_file_data()
            ],
            "total_count": 3,
            "page": 1,
            "per_page": 10
        }
    
    @staticmethod
    def empty_file_list() -> Dict[str, Any]:
        """空のファイル一覧"""
        return {
            "files": [],
            "total_count": 0,
            "page": 1,
            "per_page": 10
        }
    
    # ===============================
    # 統計情報データ
    # ===============================
    
    @staticmethod
    def statistics_data() -> List[Dict[str, Any]]:
        """統計情報用のファイルデータリスト"""
        return [
            {
                "id": "stat-1",
                "status": "completed",
                "file_size": 1024,
                "processing_time": 2.0
            },
            {
                "id": "stat-2", 
                "status": "processing",
                "file_size": 2048,
                "processing_time": None
            },
            {
                "id": "stat-3",
                "status": "completed", 
                "file_size": 512,
                "processing_time": 1.5
            },
            {
                "id": "stat-4",
                "status": "failed",
                "file_size": 256,
                "processing_time": 0.5
            }
        ]
    
    # ===============================
    # 日時関連データ
    # ===============================
    
    @staticmethod
    def old_file_data() -> Dict[str, Any]:
        """古いファイル（クリーンアップ対象）"""
        return {
            "id": "old-file-id",
            "filename": "old_document.pdf", 
            "status": "completed",
            "created_at": "2023-12-01T00:00:00Z",  # 古い日付
            "file_size": 1024
        }
    
    @staticmethod
    def recent_file_data() -> Dict[str, Any]:
        """最近のファイル（クリーンアップ対象外）"""
        return {
            "id": "recent-file-id",
            "filename": "recent_document.pdf",
            "status": "completed", 
            "created_at": "2024-01-30T00:00:00Z",  # 最近の日付
            "file_size": 2048
        }


class DatabaseTestResponses:
    """データベースレスポンスのテストデータ"""
    
    @staticmethod
    def successful_update_response() -> bool:
        """更新成功レスポンス"""
        return True
    
    @staticmethod
    def failed_update_response() -> bool:
        """更新失敗レスポンス"""
        return False
    
    @staticmethod
    def successful_delete_response() -> bool:
        """削除成功レスポンス"""
        return True
    
    @staticmethod
    def failed_delete_response() -> bool:
        """削除失敗レスポンス"""
        return False


class ConversionLogTestData:
    """変換ログ関連のテストデータ"""
    
    @staticmethod
    def success_log_data() -> Dict[str, Any]:
        """成功ログデータ"""
        return {
            "id": "log-success-1",
            "file_id": "12345678-1234-5678-9abc-123456789def",
            "operation": "upload_and_convert",
            "status": "success",
            "message": "Conversion completed successfully",
            "processing_time": 2.5,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    
    @staticmethod
    def failure_log_data() -> Dict[str, Any]:
        """失敗ログデータ"""
        return {
            "id": "log-failure-1",
            "file_id": "12345678-1234-5678-9abc-123456789def",
            "operation": "upload_and_convert",
            "status": "failed",
            "message": "PDF parsing failed",
            "processing_time": 1.2,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    
    @staticmethod
    def reconvert_log_data() -> Dict[str, Any]:
        """再変換ログデータ"""
        return {
            "id": "log-reconvert-1",
            "file_id": "12345678-1234-5678-9abc-123456789def",
            "operation": "reconvert",
            "status": "success",
            "message": "Reconversion completed",
            "processing_time": 1.8,
            "timestamp": "2024-01-01T01:00:00Z"
        }
    
    @staticmethod
    def multiple_logs_data() -> List[Dict[str, Any]]:
        """複数ログデータ"""
        return [
            ConversionLogTestData.success_log_data(),
            ConversionLogTestData.reconvert_log_data(),
            ConversionLogTestData.failure_log_data()
        ]


class PDFTestData:
    """PDF関連のテストデータ"""
    
    @staticmethod
    def valid_pdf_bytes() -> bytes:
        """有効なPDFバイト（簡易版）"""
        # 実際のテストでは本物のPDFバイナリを使用することを推奨
        return b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000125 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n193\n%%EOF"
    
    @staticmethod
    def invalid_pdf_bytes() -> bytes:
        """無効なPDFバイト"""
        return b"This is not a PDF file content"
    
    @staticmethod
    def large_pdf_bytes() -> bytes:
        """サイズ制限を超えるPDFバイト（11MB）"""
        return b"x" * (11 * 1024 * 1024)
    
    @staticmethod
    def small_pdf_bytes() -> bytes:
        """小さなPDFバイト（テスト用）"""
        return b"x" * 1024  # 1KB
    
    @staticmethod
    def valid_markdown_content() -> str:
        """有効なMarkdownコンテンツ"""
        return """# Document Title

This is a test document converted from PDF.

## Section 1

Some content here.

### Subsection 1.1

More detailed content.

## Section 2

Another section with different content.

---

End of document."""
    
    @staticmethod
    def pdf_upload_response_success() -> Dict[str, Any]:
        """PDFアップロード成功レスポンス"""
        return {
            "success": True,
            "file_id": "12345678-1234-5678-9abc-123456789def",
            "filename": "test_document.pdf",
            "markdown": PDFTestData.valid_markdown_content(),
            "file_size": 2048,
            "processing_time": 2.5,
            "status": "completed"
        }
    
    @staticmethod
    def pdf_upload_response_failure() -> Dict[str, Any]:
        """PDFアップロード失敗レスポンス"""
        return {
            "success": False,
            "error": "無効なPDFファイルです",
            "file_id": None
        }


class ErrorTestData:
    """エラー関連のテストデータ"""
    
    @staticmethod
    def database_error():
        """データベースエラー"""
        return Exception("Database connection failed")
    
    @staticmethod
    def file_not_found_error():
        """ファイル未発見エラー"""
        return Exception("File not found in database")
    
    @staticmethod
    def validation_error():
        """バリデーションエラー"""
        return ValueError("Invalid file format")
    
    @staticmethod
    def pdf_processing_error():
        """PDF処理エラー"""
        return Exception("PDF processing failed")
    
    @staticmethod
    def file_system_error():
        """ファイルシステムエラー"""
        return OSError("File system error")
    
    @staticmethod
    def network_timeout_error():
        """ネットワークタイムアウトエラー"""
        return ConnectionError("Network timeout")


class ValidationTestData:
    """バリデーション用のテストデータ"""
    
    @staticmethod
    def valid_uuids() -> List[str]:
        """有効なUUIDのリスト"""
        return [
            "12345678-1234-5678-9abc-123456789def",
            "ABCDEF01-2345-6789-ABCD-EF0123456789", 
            "00000000-0000-0000-0000-000000000000",
            "ffffffff-ffff-ffff-ffff-ffffffffffff"
        ]
    
    @staticmethod
    def invalid_uuids() -> List[str]:
        """無効なUUIDのリスト"""
        return [
            "invalid-uuid",
            "12345678-1234-5678-9abc",  # 短すぎる
            "12345678-1234-5678-9abc-123456789defg",  # 長すぎる
            "12345678_1234_5678_9abc_123456789def",  # ハイフンなし
            "",  # 空文字
            "not-a-uuid-at-all",
            "12345678-1234-5678-9abc-12345678zdef"  # 無効な文字
        ]


# ===============================
# テストファクトリ関数
# ===============================

def create_file_data(**overrides) -> Dict[str, Any]:
    """カスタムファイルデータを作成
    
    Args:
        **overrides: 上書きする項目
        
    Returns:
        カスタマイズされたファイルデータ
    """
    base_data = FileTestData.valid_file_data()
    base_data.update(overrides)
    return base_data


def create_file_list(**overrides) -> Dict[str, Any]:
    """カスタムファイル一覧を作成
    
    Args:
        **overrides: 上書きする項目
        
    Returns:
        カスタマイズされたファイル一覧
    """
    base_data = FileTestData.file_list_data()
    base_data.update(overrides)
    return base_data
