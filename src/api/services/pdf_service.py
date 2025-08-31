"""
PDF変換サービス

PDFファイルをMarkdown形式に変換する処理を担当
リポジトリ層との連携により、データアクセス処理を分離
"""

import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from ..repositories.pdf_repository import PDFRepository


class PDFService:
    """PDF変換サービス（リポジトリ層との連携）"""

    def __init__(
        self,
        pdf_repository: PDFRepository = None,
        upload_dir: str = None,
        markdown_dir: str = None,
    ):
        # リポジトリ層の注入（依存性注入パターン）
        self.pdf_repository = pdf_repository or PDFRepository(upload_dir, markdown_dir)

        # 環境変数からディレクトリパスを取得、なければデフォルト値を使用
        import os

        if upload_dir is None:
            upload_dir = os.environ.get("UPLOAD_DIR", "data/uploads")
        if markdown_dir is None:
            markdown_dir = os.environ.get("MARKDOWN_DIR", "data/markdown")

        self.upload_dir = Path(upload_dir)
        self.markdown_dir = Path(markdown_dir)
        self._ensure_directories()

    def _ensure_directories(self):
        """必要なディレクトリの存在確認・作成"""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.markdown_dir.mkdir(parents=True, exist_ok=True)

    def validate_pdf_file(self, file_content: bytes, filename: str) -> tuple[bool, str]:
        """PDFファイルの検証（リポジトリ層を活用）"""
        try:
            return self.pdf_repository.validate_pdf_file(file_content, filename)
        except Exception as e:
            return False, f"ファイル検証中にエラーが発生しました: {str(e)}"

    def get_conversion_statistics(self) -> dict[str, Any]:
        """変換統計情報を取得（リポジトリ層を活用）"""
        try:
            return self.pdf_repository.get_conversion_statistics()
        except Exception as e:
            return {
                "error": str(e),
                "total_conversions": 0,
                "successful_conversions": 0,
                "failed_conversions": 0,
                "average_processing_time": 0,
            }

    def get_orphaned_files(self) -> dict[str, Any]:
        """孤立したファイルを取得（リポジトリ層を活用）"""
        try:
            return self.pdf_repository.get_orphaned_files()
        except Exception as e:
            return {"error": str(e), "orphaned_files": [], "total_orphaned": 0}

    def cleanup_old_files(self, days: int = 30) -> dict[str, Any]:
        """古いファイルをクリーンアップ（リポジトリ層を活用）"""
        try:
            result = self.pdf_repository.cleanup_old_files(days)

            # サービス層でビジネスロジックを追加
            if result.get("success"):
                # クリーンアップ後の統計情報を取得
                stats = self.get_conversion_statistics()
                result["post_cleanup_stats"] = stats

            return result
        except Exception as e:
            return {"success": False, "error": str(e), "deleted_count": 0}

    async def process_pdf_upload(
        self, file_content: bytes, filename: str
    ) -> dict[str, Any]:
        """PDFアップロード処理（リポジトリ層を活用）"""
        start_time = time.time()

        try:
            # ファイル検証
            is_valid, message = self.validate_pdf_file(file_content, filename)
            if not is_valid:
                return {"success": False, "error": message, "file_id": None}

            # ファイルID生成
            file_id = str(uuid.uuid4())

            # リポジトリ層のアップロード処理を使用
            result = await self.pdf_repository.process_pdf_upload(
                file_content, filename
            )

            if result["success"]:
                # 処理時間計算
                processing_time = time.time() - start_time

                # サービス層でビジネスロジックを追加
                result["processing_time"] = processing_time
                result["upload_timestamp"] = datetime.now().isoformat()

                return result
            else:
                return result

        except Exception as e:
            # エラー処理
            processing_time = time.time() - start_time

            # リポジトリ層のログ記録を使用
            if "file_id" in locals():
                self.pdf_repository.add_conversion_log(
                    file_id, "upload_and_convert", "failed", str(e), processing_time
                )

            return {
                "success": False,
                "error": str(e),
                "file_id": file_id if "file_id" in locals() else None,
            }

    async def reconvert_pdf(
        self, file_id: str, file_content: bytes, filename: str
    ) -> dict[str, Any]:
        """PDFの再変換処理（リポジトリ層を活用）"""
        start_time = time.time()

        try:
            # ファイル検証
            is_valid, message = self.validate_pdf_file(file_content, filename)
            if not is_valid:
                return {"success": False, "error": message, "file_id": file_id}

            # リポジトリ層の再変換処理を使用
            result = await self.pdf_repository.reconvert_pdf(
                file_id, file_content, filename
            )

            if result["success"]:
                # 処理時間計算
                processing_time = time.time() - start_time

                # サービス層でビジネスロジックを追加
                result["processing_time"] = processing_time
                result["reconversion_timestamp"] = datetime.now().isoformat()

                return result
            else:
                return result

        except Exception as e:
            # エラー処理
            processing_time = time.time() - start_time

            # リポジトリ層のログ記録を使用
            self.pdf_repository.add_conversion_log(
                file_id, "reconvert", "failed", str(e), processing_time
            )

            return {"success": False, "error": str(e), "file_id": file_id}

    async def batch_reconvert_files(
        self, file_ids: list[str], file_contents: list[bytes], filenames: list[str]
    ) -> dict[str, Any]:
        """複数のPDFファイルを一括再変換（リポジトリ層を活用）"""
        try:
            if (
                not file_ids
                or len(file_ids) != len(file_contents)
                or len(file_ids) != len(filenames)
            ):
                return {
                    "success": False,
                    "error": "ファイルID、コンテンツ、ファイル名の数が一致しません",
                }

            # リポジトリ層のバッチ処理を使用
            result = await self.pdf_repository.batch_reconvert_files(
                file_ids, file_contents, filenames
            )

            # サービス層でビジネスロジックを追加
            if result.get("success"):
                result["batch_timestamp"] = datetime.now().isoformat()
                result["total_files"] = len(file_ids)

            return result

        except Exception as e:
            return {
                "success": False,
                "error": f"一括再変換中にエラーが発生しました: {str(e)}",
                "processed_count": 0,
                "failed_count": len(file_ids),
            }

    def get_conversion_logs(
        self, file_id: str = None, action: str = None, status: str = None
    ) -> list[dict[str, Any]]:
        """変換ログを取得（リポジトリ層を活用）"""
        try:
            if file_id:
                return self.pdf_repository.get_conversion_logs(file_id)
            elif action:
                return self.pdf_repository.get_conversion_logs_by_action(action)
            elif status:
                return self.pdf_repository.get_conversion_logs_by_status(status)
            else:
                # 全ログを取得（制限付き）
                return self.pdf_repository.get_conversion_logs()
        except Exception:
            return []

    def get_database_info(self) -> dict[str, Any]:
        """データベース情報を取得（リポジトリ層を活用）"""
        try:
            return self.pdf_repository.get_database_info()
        except Exception as e:
            return {"error": str(e)}

    # 後方互換性のためのメソッド（既存のテストが動作するように）
    def _validate_pdf_file(
        self, file_content: bytes, filename: str
    ) -> tuple[bool, str]:
        """PDFファイルの検証（後方互換性）"""
        return self.validate_pdf_file(file_content, filename)

    def _save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """アップロードされたファイルを保存（後方互換性）"""
        return self.pdf_repository.save_uploaded_file(file_content, filename)

    def _convert_pdf_to_markdown(self, file_path: str) -> str:
        """PDFをMarkdownに変換（後方互換性）"""
        return self.pdf_repository.convert_pdf_to_markdown(file_path)

    def _save_markdown(self, file_id: str, markdown_content: str) -> str:
        """Markdownをファイルに保存（後方互換性）"""
        return self.pdf_repository.save_markdown(file_id, markdown_content)
