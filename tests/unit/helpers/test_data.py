"""
テストデータ管理

テストで使用する各種データの定義と生成を行う
"""

from pathlib import Path
from typing import Dict, Any


class TestFileData:
    """テストファイルデータ管理クラス"""
    
    # テストファイルパス
    TEST_PDF_PATH = "tests/data/test_markdown.pdf"
    
    # 期待される値
    EXPECTED_UPLOAD_MESSAGE = "PDFファイルのアップロードと変換が完了しました"
    EXPECTED_PDF_EXTENSION_ERROR = "PDFファイルのみアップロード可能です"
    EXPECTED_INVALID_PDF_ERROR = "無効なPDFファイルです"
    EXPECTED_SIZE_LIMIT_ERROR = "ファイルサイズは10MB以下にしてください"
    
    # ファイルサイズ制限
    MAX_FILE_SIZE_MB = 10
    
    @classmethod
    def get_test_pdf_path(cls) -> str:
        """テスト用PDFファイルのパスを取得"""
        return cls.TEST_PDF_PATH
    
    @classmethod
    def validate_test_file_exists(cls) -> bool:
        """テストファイルの存在を確認"""
        return Path(cls.TEST_PDF_PATH).exists()


class InvalidTestData:
    """無効なテストデータ生成"""
    
    @staticmethod
    def create_non_pdf_file() -> tuple[str, bytes, str]:
        """PDFでないファイルのデータを生成
        
        Returns:
            tuple: (filename, content, content_type)
        """
        return (
            "test_file.txt",
            b"This is not a PDF file content", 
            "text/plain"
        )
    
    @staticmethod
    def create_invalid_pdf_file() -> tuple[str, bytes, str]:
        """無効なPDFファイルのデータを生成
        
        Returns:
            tuple: (filename, content, content_type)
        """
        return (
            "invalid.pdf",
            b"This is not a valid PDF content",
            "application/pdf"
        )
    
    @staticmethod
    def create_oversized_file(size_mb: int = 11) -> tuple[str, bytes, str]:
        """サイズ制限を超えるファイルのデータを生成
        
        Args:
            size_mb: ファイルサイズ（MB）
            
        Returns:
            tuple: (filename, content, content_type)
        """
        large_content = b"x" * (size_mb * 1024 * 1024)
        return (
            "large.pdf",
            large_content,
            "application/pdf"
        )


class APIEndpoints:
    """APIエンドポイント定義"""
    
    HEALTH = "/health"
    UPLOAD = "/upload"
    FILES = "/files"
    LIST_FILES = "/files"
    FILES_BY_ID = "/files/{file_id}"
    FILES_LOGS = "/files/{file_id}/logs"
    STATISTICS = "/statistics"
    GET_STATISTICS = "/statistics"
    CLEANUP = "/cleanup"
    CLEANUP_OLD_FILES = "/cleanup"
    
    @classmethod
    def get_file_endpoint(cls, file_id: str) -> str:
        """ファイル個別取得エンドポイントを生成"""
        return cls.FILES_BY_ID.format(file_id=file_id)
    
    @classmethod
    def get_file_logs_endpoint(cls, file_id: str) -> str:
        """ファイルログ取得エンドポイントを生成"""
        return cls.FILES_LOGS.format(file_id=file_id)


class ExpectedResponses:
    """期待されるレスポンス構造"""
    
    HEALTH_RESPONSE_KEYS = {"status", "version", "timestamp", "uptime"}
    UPLOAD_RESPONSE_KEYS = {"message", "file_id", "status"}
    FILE_RESPONSE_KEYS = {"id", "filename", "markdown", "status", "created_at", "updated_at", "file_size", "processing_time"}
    ERROR_RESPONSE_KEYS = {"detail", "timestamp", "path"}
    
    @classmethod
    def validate_response_structure(cls, data: Dict[str, Any], expected_keys: set) -> bool:
        """レスポンス構造の検証
        
        Args:
            data: レスポンスデータ
            expected_keys: 期待されるキーのセット
            
        Returns:
            bool: 構造が正しい場合True
        """
        return set(data.keys()) >= expected_keys
