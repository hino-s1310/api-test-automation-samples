"""
ファイル管理サービス

ファイルの取得、一覧表示、削除などの処理を担当
リポジトリ層との連携により、データアクセスロジックを分離
"""

import re
from datetime import datetime
from typing import Any

from ..models import FileStatus
from ..repositories.file_repository import FileRepository


class FileService:
    """ファイル管理サービス"""

    def __init__(
        self, file_repository: FileRepository = None, use_sqlmodel: bool = False
    ):
        """FileRepositoryのインスタンスを初期化"""
        self.use_sqlmodel = use_sqlmodel
        self.file_repository = file_repository or FileRepository(
            use_sqlmodel=use_sqlmodel
        )

    def get_file(self, file_id: str) -> dict[str, Any] | None:
        """ファイル情報を取得"""
        file_info = self.file_repository.get_file(file_id)
        if not file_info:
            return None

        # レスポンス用のデータを整形
        return {
            "id": file_info["id"],
            "filename": file_info["filename"],
            "markdown": file_info.get(
                "markdown", file_info.get("markdown_content", "")
            ),
            "status": file_info["status"],
            "created_at": file_info["created_at"],
            "updated_at": file_info["updated_at"],
            "file_size": file_info["file_size"],
            "processing_time": file_info.get("processing_time"),
        }

    def list_files(self, page: int = 1, per_page: int = 10) -> dict[str, Any]:
        """ファイル一覧を取得"""
        result = self.file_repository.list_files(page, per_page)

        # レスポンス用のデータを整形
        files = []
        for file_info in result["files"]:
            files.append(
                {
                    "id": file_info["id"],
                    "filename": file_info["filename"],
                    "status": file_info["status"],
                    "created_at": file_info["created_at"],
                    "updated_at": file_info["updated_at"],
                    "file_size": file_info["file_size"],
                    "processing_time": file_info.get("processing_time"),
                }
            )

        return {
            "files": files,
            "total_count": result["total_count"],
            "page": result["page"],
            "per_page": result["per_page"],
        }

    def update_file(self, file_id: str, markdown_content: str) -> dict[str, Any] | None:
        """ファイル情報を更新"""
        # 既存ファイルの確認
        existing_file = self.file_repository.get_file(file_id)
        if not existing_file:
            return None

        # 更新処理
        if self.file_repository.update_file_status(
            file_id, FileStatus.COMPLETED, markdown_content
        ):
            # 更新後のファイル情報を取得
            return self.get_file(file_id)

        return None

    def delete_file(self, file_id: str) -> bool:
        """ファイルを削除"""
        return self.file_repository.delete_file(file_id)

    def get_file_status(self, file_id: str) -> str | None:
        """ファイルの状態を取得"""
        file_info = self.file_repository.get_file(file_id)
        return file_info["status"] if file_info else None

    def get_conversion_logs(self, file_id: str) -> list[dict[str, Any]]:
        """変換ログを取得"""
        return self.file_repository.get_conversion_logs(file_id)

    def get_file_statistics(self) -> dict[str, Any]:
        """ファイル統計情報を取得（リポジトリ層を活用）"""
        try:
            # リポジトリ層の統計情報取得メソッドを使用
            stats = self.file_repository.get_file_statistics()

            # 必要に応じてサービス層でデータを整形
            if "error" not in stats:
                return {
                    "total_files": stats.get("total_files", 0),
                    "status_counts": stats.get("status_counts", {}),
                    "total_size_bytes": stats.get("total_size_bytes", 0),
                    "total_size_mb": stats.get("total_size_mb", 0),
                    "total_processing_time": stats.get("total_processing_time", 0),
                    "average_processing_time": stats.get("average_processing_time", 0),
                }
            else:
                return stats

        except Exception as e:
            return {
                "error": str(e),
                "total_files": 0,
                "status_counts": {"processing": 0, "completed": 0, "failed": 0},
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "total_processing_time": 0,
                "average_processing_time": 0,
            }

    def cleanup_old_files(self, days: int = 30) -> dict[str, Any]:
        """古いファイルをクリーンアップ（リポジトリ層を活用）"""
        try:
            # リポジトリ層のクリーンアップメソッドを使用
            result = self.file_repository.cleanup_old_files(days)

            # サービス層でビジネスロジックを追加
            if result.get("success"):
                # クリーンアップ後の統計情報を取得
                stats = self.get_file_statistics()
                result["post_cleanup_stats"] = stats

            return result

        except Exception as e:
            return {"success": False, "error": str(e), "deleted_count": 0}

    def get_current_time(self) -> datetime:
        """現在時刻を取得"""
        return datetime.now()

    def validate_file_id(self, file_id: str) -> bool:
        """ファイルIDの妥当性を検証"""

        uuid_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            re.IGNORECASE,
        )
        return bool(uuid_pattern.match(file_id))

    def get_files_by_status(self, status: str) -> list[dict[str, Any]]:
        """指定されたステータスのファイルを取得"""
        try:
            result = self.file_repository.get_files_by_status(status)
            return result.get("files", [])
        except Exception:
            return []

    def get_files_created_after(self, date: datetime) -> list[dict[str, Any]]:
        """指定された日付以降に作成されたファイルを取得"""
        try:
            result = self.file_repository.get_files_created_after(date)
            return result.get("files", [])
        except Exception:
            return []

    def get_files_created_before(self, date: datetime) -> list[dict[str, Any]]:
        """指定された日付以前に作成されたファイルを取得"""
        try:
            result = self.file_repository.get_files_created_before(date)
            return result.get("files", [])
        except Exception:
            return []

    def get_orphaned_files(self) -> dict[str, Any]:
        """孤立したファイルを取得（リポジトリ層を活用）"""
        try:
            return self.file_repository.get_orphaned_files()
        except Exception as e:
            return {"error": str(e), "orphaned_files": [], "total_orphaned": 0}

    def get_database_info(self) -> dict[str, Any]:
        """データベース情報を取得（リポジトリ層を活用）"""
        try:
            return self.file_repository.get_database_info()
        except Exception as e:
            return {"error": str(e)}

    def edit_file(
        self,
        file_id: str,
        new_filename: str | None = None,
        new_content: str | None = None,
        edit_reason: str | None = None,
        edited_by: str = "system",
    ) -> dict[str, Any]:
        """ファイルを編集（ファイル名・Markdown内容）"""
        try:
            # ファイルの存在確認
            existing_file = self.file_repository.get_file(file_id)
            if not existing_file:
                return {"success": False, "error": "ファイルが見つかりません"}

            # 編集処理を実行
            if self.file_repository.update_file_content(
                file_id=file_id,
                new_filename=new_filename,
                new_content=new_content,
                edit_reason=edit_reason,
                edited_by=edited_by,
            ):
                # 更新後のファイル情報を取得
                updated_file = self.file_repository.get_file(file_id)

                return {
                    "success": True,
                    "id": file_id,
                    "filename": updated_file["filename"],
                    "markdown": updated_file.get("markdown_content", ""),
                    "status": updated_file["status"],
                    "updated_at": updated_file["updated_at"],
                    "last_edited_at": updated_file["last_edited_at"],
                    "edit_count": updated_file["edit_count"],
                    "is_edited": updated_file["is_edited"],
                }
            else:
                return {"success": False, "error": "ファイルの更新に失敗しました"}

        except Exception as e:
            return {
                "success": False,
                "error": f"ファイル編集中にエラーが発生しました: {str(e)}",
            }

    def get_file_edit_history(self, file_id: str) -> list[dict[str, Any]]:
        """ファイルの編集履歴を取得"""
        try:
            # ファイルの存在確認
            existing_file = self.file_repository.get_file(file_id)
            if not existing_file:
                return []

            # 編集履歴を取得
            history = self.file_repository.get_edit_history(file_id)

            # レスポンス用のデータを整形
            formatted_history = []
            for history_item in history:
                formatted_history.append(
                    {
                        "id": history_item["id"],
                        "file_id": history_item["file_id"],
                        "original_filename": history_item["original_filename"],
                        "original_content": history_item["original_content"],
                        "edited_filename": history_item["edited_filename"],
                        "edited_content": history_item["edited_content"],
                        "edit_reason": history_item["edit_reason"],
                        "edited_by": history_item["edited_by"],
                        "created_at": history_item["created_at"],
                    }
                )

            return formatted_history

        except Exception:
            # エラーの場合は空のリストを返す
            return []

    def revert_file_to_version(self, file_id: str, history_id: int) -> dict[str, Any]:
        """指定された履歴IDのバージョンにファイルを復元"""
        try:
            # ファイルの存在確認
            existing_file = self.file_repository.get_file(file_id)
            if not existing_file:
                return {"success": False, "error": "ファイルが見つかりません"}

            # 指定された履歴を取得
            history = self.file_repository.get_edit_history(file_id)
            target_history = None

            for history_item in history:
                if history_item["id"] == history_id:
                    target_history = history_item
                    break

            if not target_history:
                return {"success": False, "error": "指定された履歴が見つかりません"}

            # ファイルを履歴の状態に復元
            if self.file_repository.update_file_content(
                file_id=file_id,
                new_filename=target_history["original_filename"],
                new_content=target_history["original_content"],
                edit_reason=f"履歴ID {history_id} への復元",
                edited_by="system",
            ):
                # 復元後のファイル情報を取得
                reverted_file = self.file_repository.get_file(file_id)

                return {
                    "success": True,
                    "id": file_id,
                    "filename": reverted_file["filename"],
                    "markdown": reverted_file.get("markdown_content", ""),
                    "status": reverted_file["status"],
                    "updated_at": reverted_file["updated_at"],
                    "last_edited_at": reverted_file["last_edited_at"],
                    "edit_count": reverted_file["edit_count"],
                    "is_edited": reverted_file["is_edited"],
                }
            else:
                return {"success": False, "error": "ファイルの復元に失敗しました"}

        except Exception as e:
            return {
                "success": False,
                "error": f"ファイル復元中にエラーが発生しました: {str(e)}",
            }

    def search_files(
        self,
        query: str | None = None,
        status: str | None = None,
        is_edited: bool | None = None,
        page: int = 1,
        per_page: int = 10,
    ) -> dict[str, Any]:
        """ファイルを検索・フィルタリング"""
        try:
            result = self.file_repository.search_files(
                query=query,
                status=status,
                is_edited=is_edited,
                page=page,
                per_page=per_page,
            )

            # レスポンス用のデータを整形
            files = []
            for file_info in result["files"]:
                files.append(
                    {
                        "id": file_info["id"],
                        "filename": file_info["filename"],
                        "status": file_info["status"],
                        "created_at": file_info["created_at"],
                        "updated_at": file_info["updated_at"],
                        "file_size": file_info["file_size"],
                        "processing_time": file_info.get("processing_time"),
                        "last_edited_at": file_info.get("last_edited_at"),
                        "edit_count": file_info.get("edit_count", 0),
                        "is_edited": file_info.get("is_edited", False),
                    }
                )

            return {
                "files": files,
                "total_count": result["total_count"],
                "page": result["page"],
                "per_page": result["per_page"],
            }

        except Exception as e:
            return {
                "files": [],
                "total_count": 0,
                "page": page,
                "per_page": per_page,
                "error": str(e),
            }

    def batch_delete_files(self, file_ids: list[str]) -> dict[str, Any]:
        """複数のファイルを一括削除（リポジトリ層を活用）"""
        try:
            if not file_ids:
                return {"success": False, "error": "ファイルIDが指定されていません"}

            # リポジトリ層のバッチ削除メソッドを使用
            result = self.file_repository.batch_delete_files(file_ids)

            # サービス層でビジネスロジックを追加
            if result.get("success"):
                # 削除後の統計情報を取得
                stats = self.get_file_statistics()
                result["post_deletion_stats"] = stats

            return result

        except Exception as e:
            return {
                "success": False,
                "error": f"一括削除中にエラーが発生しました: {str(e)}",
            }
