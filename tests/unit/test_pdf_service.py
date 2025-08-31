"""
PDFServiceのUnitテスト

改良されたPDFService（リポジトリ層との連携）のテスト
"""

from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.api.repositories.pdf_repository import PDFRepository
from src.api.services.pdf_service import PDFService


class TestPDFServiceInitialization:
    """PDFService初期化のテスト"""

    def test_init_with_default_repository(self):
        """デフォルトのPDFRepositoryで初期化"""
        service = PDFService()
        assert isinstance(service.pdf_repository, PDFRepository)

    def test_init_with_custom_repository(self):
        """カスタムPDFRepositoryで初期化"""
        mock_repo = Mock(spec=PDFRepository)
        service = PDFService(pdf_repository=mock_repo)
        assert service.pdf_repository is mock_repo

    def test_init_with_custom_directories(self):
        """カスタムディレクトリで初期化"""
        service = PDFService(
            upload_dir="custom_uploads", markdown_dir="custom_markdown"
        )
        assert service.upload_dir == Path("custom_uploads")
        assert service.markdown_dir == Path("custom_markdown")


class TestPDFServiceFileValidation:
    """PDFファイル検証のテスト"""

    def test_validate_pdf_file_success(self):
        """PDFファイル検証成功"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.return_value = (True, "OK")

        service = PDFService(pdf_repository=mock_repo)
        result = service.validate_pdf_file(b"test_content", "test.pdf")

        assert result == (True, "OK")
        mock_repo.validate_pdf_file.assert_called_once_with(b"test_content", "test.pdf")

    def test_validate_pdf_file_failure(self):
        """PDFファイル検証失敗"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.return_value = (False, "Invalid PDF")

        service = PDFService(pdf_repository=mock_repo)
        result = service.validate_pdf_file(b"test_content", "test.pdf")

        assert result == (False, "Invalid PDF")

    def test_validate_pdf_file_exception(self):
        """PDFファイル検証で例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.side_effect = Exception("Repository error")

        service = PDFService(pdf_repository=mock_repo)
        result = service.validate_pdf_file(b"test_content", "test.pdf")

        assert result[0] is False
        assert "ファイル検証中にエラーが発生しました" in result[1]


class TestPDFServiceConversionStatistics:
    """変換統計情報取得のテスト"""

    def test_get_conversion_statistics_success(self):
        """変換統計情報取得成功"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_conversion_statistics.return_value = {
            "total_conversions": 100,
            "successful_conversions": 95,
            "failed_conversions": 5,
            "average_processing_time": 2.5,
        }

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_conversion_statistics()

        assert result["total_conversions"] == 100
        assert result["successful_conversions"] == 95
        assert result["failed_conversions"] == 5
        assert result["average_processing_time"] == 2.5

    def test_get_conversion_statistics_exception(self):
        """変換統計情報取得で例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_conversion_statistics.side_effect = Exception("Database error")

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_conversion_statistics()

        assert "error" in result
        assert result["total_conversions"] == 0
        assert result["successful_conversions"] == 0
        assert result["failed_conversions"] == 0


class TestPDFServiceOrphanedFiles:
    """孤立ファイル取得のテスト"""

    def test_get_orphaned_files_success(self):
        """孤立ファイル取得成功"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_orphaned_files.return_value = {
            "orphaned_files": ["file1.pdf", "file2.pdf"],
            "total_orphaned": 2,
        }

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_orphaned_files()

        assert result["orphaned_files"] == ["file1.pdf", "file2.pdf"]
        assert result["total_orphaned"] == 2

    def test_get_orphaned_files_exception(self):
        """孤立ファイル取得で例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_orphaned_files.side_effect = Exception("File system error")

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_orphaned_files()

        assert "error" in result
        assert result["orphaned_files"] == []
        assert result["total_orphaned"] == 0


class TestPDFServiceCleanup:
    """ファイルクリーンアップのテスト"""

    def test_cleanup_old_files_success(self):
        """古いファイルクリーンアップ成功"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.cleanup_old_files.return_value = {
            "success": True,
            "deleted_count": 5,
            "total_old_files": 10,
        }

        service = PDFService(pdf_repository=mock_repo)
        result = service.cleanup_old_files(days=30)

        assert result["success"] is True
        assert result["deleted_count"] == 5
        assert result["total_old_files"] == 10
        assert "post_cleanup_stats" in result

    def test_cleanup_old_files_failure(self):
        """古いファイルクリーンアップ失敗"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.cleanup_old_files.return_value = {
            "success": False,
            "error": "Cleanup failed",
            "deleted_count": 0,
        }

        service = PDFService(pdf_repository=mock_repo)
        result = service.cleanup_old_files(days=30)

        assert result["success"] is False
        assert "error" in result
        assert "post_cleanup_stats" not in result

    def test_cleanup_old_files_exception(self):
        """古いファイルクリーンアップで例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.cleanup_old_files.side_effect = Exception("Cleanup error")

        service = PDFService(pdf_repository=mock_repo)
        result = service.cleanup_old_files(days=30)

        assert result["success"] is False
        assert "error" in result
        assert result["deleted_count"] == 0


class TestPDFServiceUploadProcessing:
    """PDFアップロード処理のテスト"""

    @pytest.mark.asyncio
    async def test_process_pdf_upload_success(self):
        """PDFアップロード処理成功"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.return_value = (True, "OK")
        mock_repo.process_pdf_upload = AsyncMock(
            return_value={
                "success": True,
                "file_id": "test_id",
                "filename": "test.pdf",
                "markdown": "# Test Content",
                "file_size": 1024,
                "status": "completed",
            }
        )

        service = PDFService(pdf_repository=mock_repo)
        result = await service.process_pdf_upload(b"test_content", "test.pdf")

        assert result["success"] is True
        assert result["file_id"] == "test_id"
        assert "processing_time" in result
        assert "upload_timestamp" in result

    @pytest.mark.asyncio
    async def test_process_pdf_upload_validation_failure(self):
        """PDFアップロード処理で検証失敗"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.return_value = (False, "Invalid file")

        service = PDFService(pdf_repository=mock_repo)
        result = await service.process_pdf_upload(b"test_content", "test.pdf")

        assert result["success"] is False
        assert result["error"] == "Invalid file"
        assert result["file_id"] is None

    @pytest.mark.asyncio
    async def test_process_pdf_upload_repository_failure(self):
        """PDFアップロード処理でリポジトリ失敗"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.return_value = (True, "OK")
        mock_repo.process_pdf_upload = AsyncMock(
            return_value={"success": False, "error": "Repository error"}
        )

        service = PDFService(pdf_repository=mock_repo)
        result = await service.process_pdf_upload(b"test_content", "test.pdf")

        assert result["success"] is False
        assert result["error"] == "Repository error"

    @pytest.mark.asyncio
    async def test_process_pdf_upload_exception(self):
        """PDFアップロード処理で例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.side_effect = Exception("Service error")

        service = PDFService(pdf_repository=mock_repo)
        result = await service.process_pdf_upload(b"test_content", "test.pdf")

        assert result["success"] is False
        assert "error" in result
        assert result["file_id"] is None


class TestPDFServiceReconversion:
    """PDF再変換処理のテスト"""

    @pytest.mark.asyncio
    async def test_reconvert_pdf_success(self):
        """PDF再変換処理成功"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.return_value = (True, "OK")
        mock_repo.reconvert_pdf = AsyncMock(
            return_value={
                "success": True,
                "file_id": "test_id",
                "filename": "new_test.pdf",
                "markdown": "# New Content",
                "file_size": 2048,
                "status": "completed",
            }
        )

        service = PDFService(pdf_repository=mock_repo)
        result = await service.reconvert_pdf("test_id", b"new_content", "new_test.pdf")

        assert result["success"] is True
        assert result["file_id"] == "test_id"
        assert "processing_time" in result
        assert "reconversion_timestamp" in result

    @pytest.mark.asyncio
    async def test_reconvert_pdf_validation_failure(self):
        """PDF再変換処理で検証失敗"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.return_value = (False, "Invalid file")

        service = PDFService(pdf_repository=mock_repo)
        result = await service.reconvert_pdf("test_id", b"new_content", "new_test.pdf")

        assert result["success"] is False
        assert result["error"] == "Invalid file"
        assert result["file_id"] == "test_id"

    @pytest.mark.asyncio
    async def test_reconvert_pdf_exception(self):
        """PDF再変換処理で例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.side_effect = Exception("Service error")

        service = PDFService(pdf_repository=mock_repo)
        result = await service.reconvert_pdf("test_id", b"new_content", "new_test.pdf")

        assert result["success"] is False
        assert "error" in result
        assert result["file_id"] == "test_id"


class TestPDFServiceBatchOperations:
    """バッチ操作のテスト"""

    @pytest.mark.asyncio
    async def test_batch_reconvert_files_success(self):
        """バッチ再変換処理成功"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.batch_reconvert_files = AsyncMock(
            return_value={
                "success": True,
                "processed_count": 3,
                "failed_count": 0,
                "results": ["file1", "file2", "file3"],
            }
        )

        service = PDFService(pdf_repository=mock_repo)
        result = await service.batch_reconvert_files(
            ["id1", "id2", "id3"],
            [b"content1", b"content2", b"content3"],
            ["file1.pdf", "file2.pdf", "file3.pdf"],
        )

        assert result["success"] is True
        assert result["processed_count"] == 3
        assert result["failed_count"] == 0
        assert "batch_timestamp" in result
        assert result["total_files"] == 3

    @pytest.mark.asyncio
    async def test_batch_reconvert_files_parameter_mismatch(self):
        """バッチ再変換処理でパラメータ不整合"""
        service = PDFService()
        result = await service.batch_reconvert_files(
            ["id1", "id2"], [b"content1"], ["file1.pdf", "file2.pdf"]
        )

        assert result["success"] is False
        assert "ファイルID、コンテンツ、ファイル名の数が一致しません" in result["error"]

    @pytest.mark.asyncio
    async def test_batch_reconvert_files_exception(self):
        """バッチ再変換処理で例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.batch_reconvert_files = AsyncMock(
            side_effect=Exception("Batch error")
        )

        service = PDFService(pdf_repository=mock_repo)
        result = await service.batch_reconvert_files(
            ["id1"], [b"content1"], ["file1.pdf"]
        )

        assert result["success"] is False
        assert "一括再変換中にエラーが発生しました" in result["error"]
        assert result["processed_count"] == 0
        assert result["failed_count"] == 1


class TestPDFServiceConversionLogs:
    """変換ログ取得のテスト"""

    def test_get_conversion_logs_by_file_id(self):
        """ファイルID指定で変換ログ取得"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_conversion_logs.return_value = [
            {"id": 1, "action": "upload", "status": "success"},
            {"id": 2, "action": "convert", "status": "success"},
        ]

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_conversion_logs(file_id="test_id")

        assert len(result) == 2
        mock_repo.get_conversion_logs.assert_called_once_with("test_id")

    def test_get_conversion_logs_by_action(self):
        """アクション指定で変換ログ取得"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_conversion_logs_by_action.return_value = [
            {"id": 1, "action": "upload", "status": "success"}
        ]

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_conversion_logs(action="upload")

        assert len(result) == 1
        mock_repo.get_conversion_logs_by_action.assert_called_once_with("upload")

    def test_get_conversion_logs_by_status(self):
        """ステータス指定で変換ログ取得"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_conversion_logs_by_status.return_value = [
            {"id": 1, "action": "upload", "status": "success"}
        ]

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_conversion_logs(status="success")

        assert len(result) == 1
        mock_repo.get_conversion_logs_by_status.assert_called_once_with("success")

    def test_get_conversion_logs_exception(self):
        """変換ログ取得で例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_conversion_logs.side_effect = Exception("Log error")

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_conversion_logs()

        assert result == []


class TestPDFServiceDatabaseInfo:
    """データベース情報取得のテスト"""

    def test_get_database_info_success(self):
        """データベース情報取得成功"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_database_info.return_value = {
            "total_files": 100,
            "conversion_stats": {"success": 95, "failed": 5},
            "directory_info": {"uploads": 50, "markdown": 50},
        }

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_database_info()

        assert result["total_files"] == 100
        assert "conversion_stats" in result
        assert "directory_info" in result

    def test_get_database_info_exception(self):
        """データベース情報取得で例外発生"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_database_info.side_effect = Exception("Database error")

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_database_info()

        assert "error" in result


class TestPDFServiceBackwardCompatibility:
    """後方互換性のテスト"""

    def test_backward_compatibility_methods(self):
        """後方互換性メソッドの動作確認"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.validate_pdf_file.return_value = (True, "OK")
        mock_repo.save_uploaded_file.return_value = "/path/to/file"
        mock_repo.convert_pdf_to_markdown.return_value = "# Content"
        mock_repo.save_markdown.return_value = "/path/to/markdown"

        service = PDFService(pdf_repository=mock_repo)

        # 後方互換性メソッドの動作確認
        assert service._validate_pdf_file(b"content", "test.pdf") == (True, "OK")
        assert service._save_uploaded_file(b"content", "test.pdf") == "/path/to/file"
        assert service._convert_pdf_to_markdown("/path/to/file") == "# Content"
        assert service._save_markdown("id", "# Content") == "/path/to/markdown"


class TestPDFServiceErrorHandling:
    """エラーハンドリングのテスト"""

    def test_error_handling_with_none_repository(self):
        """リポジトリがNoneの場合のエラーハンドリング"""
        # PDFServiceはpdf_repository=NoneでもデフォルトのPDFRepositoryを作成するため、
        # 実際にはエラーが発生しない。代わりに、PDFRepositoryのメソッドでエラーが発生する場合をテスト
        service = PDFService()  # デフォルトのPDFRepositoryを使用

        # PDFRepositoryのメソッドでエラーが発生する場合をシミュレート
        with patch.object(
            service.pdf_repository, "get_conversion_statistics"
        ) as mock_stats:
            mock_stats.side_effect = Exception("Repository error")

            result = service.get_conversion_statistics()
            assert "error" in result

        with patch.object(
            service.pdf_repository, "get_orphaned_files"
        ) as mock_orphaned:
            mock_orphaned.side_effect = Exception("Repository error")

            result = service.get_orphaned_files()
            assert "error" in result

        with patch.object(service.pdf_repository, "get_database_info") as mock_db:
            mock_db.side_effect = Exception("Repository error")

            result = service.get_database_info()
            assert "error" in result

    def test_error_handling_with_mock_repository(self):
        """モックリポジトリでのエラーハンドリング"""
        mock_repo = Mock(spec=PDFRepository)
        mock_repo.get_conversion_statistics.side_effect = Exception("Test error")

        service = PDFService(pdf_repository=mock_repo)
        result = service.get_conversion_statistics()

        assert "error" in result
        assert "Test error" in result["error"]
