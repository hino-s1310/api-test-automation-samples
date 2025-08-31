"""
ファイルリポジトリ

ファイル関連のデータアクセス処理を担当
データベース操作の抽象化とカプセル化
"""

from datetime import datetime, timedelta
from typing import Any

from ..database import db_manager
from ..models import FileStatus


class FileRepository:
    """ファイルリポジトリクラス"""

    def __init__(self):
        self.db_manager = db_manager

    # ===========================
    # 基本的なCRUD操作
    # ===========================

    def get_file(self, file_id: str) -> dict[str, Any] | None:
        """ファイル情報を取得"""
        return self.db_manager.get_file(file_id)

    def create_file(self, file_data: dict[str, Any]) -> bool:
        """ファイルを作成"""
        try:
            return self.db_manager.insert_file(
                file_id=file_data["id"],
                filename=file_data["filename"],
                original_path=file_data["original_path"],
                file_size=file_data["file_size"],
                status=file_data.get("status", FileStatus.PROCESSING),
            )
        except Exception:
            return False

    def update_file(self, file_id: str, update_data: dict[str, Any]) -> bool:
        """ファイル情報を更新"""
        try:
            # 個別の更新処理を呼び出し
            if "status" in update_data:
                if "markdown_content" in update_data:
                    return self.db_manager.update_file_status(
                        file_id, update_data["status"], update_data["markdown_content"]
                    )
                else:
                    return self.db_manager.update_file_status(
                        file_id, update_data["status"]
                    )

            # その他の更新処理
            return self.db_manager.update_file_content(
                file_id=file_id,
                new_filename=update_data.get("filename"),
                new_content=update_data.get("markdown_content"),
                edit_reason=update_data.get("edit_reason"),
                edited_by=update_data.get("edited_by", "system"),
            )
        except Exception:
            return False

    def delete_file(self, file_id: str) -> bool:
        """ファイルを削除"""
        return self.db_manager.delete_file(file_id)

    def file_exists(self, file_id: str) -> bool:
        """ファイルの存在確認"""
        return self.get_file(file_id) is not None

    # ===========================
    # ファイル一覧・検索
    # ===========================

    def list_files(self, page: int = 1, per_page: int = 10) -> dict[str, Any]:
        """ファイル一覧を取得"""
        return self.db_manager.list_files(page, per_page)

    def search_files(
        self,
        query: str | None = None,
        status: str | None = None,
        is_edited: bool | None = None,
        page: int = 1,
        per_page: int = 10,
    ) -> dict[str, Any]:
        """ファイルを検索・フィルタリング"""
        return self.db_manager.search_files(
            query=query,
            status=status,
            is_edited=is_edited,
            page=page,
            per_page=per_page,
        )

    def get_files_by_status(self, status: str) -> list[dict[str, Any]]:
        """指定されたステータスのファイルを取得"""
        result = self.db_manager.list_files(page=1, per_page=10000)
        return [f for f in result["files"] if f["status"] == status]

    def get_files_created_after(self, date: datetime) -> list[dict[str, Any]]:
        """指定された日時以降に作成されたファイルを取得"""
        result = self.db_manager.list_files(page=1, per_page=10000)
        files = []

        for file_info in result["files"]:
            try:
                created_at = datetime.fromisoformat(
                    file_info["created_at"].replace("Z", "+00:00")
                )
                if created_at >= date:
                    files.append(file_info)
            except (ValueError, TypeError):
                continue
        # noqa: W293
        return files

    def get_files_created_before(self, date: datetime) -> list[dict[str, Any]]:
        """指定された日時以前に作成されたファイルを取得"""
        result = self.db_manager.list_files(page=1, per_page=10000)
        files = []

        for file_info in result["files"]:
            try:
                created_at = datetime.fromisoformat(
                    file_info["created_at"].replace("Z", "+00:00")
                )
                if created_at <= date:
                    files.append(file_info)
            except (ValueError, TypeError):
                continue

        return files

    # ===========================
    # ファイル統計情報
    # ===========================

    def get_file_count(self) -> int:
        """ファイル総数を取得"""
        result = self.db_manager.list_files(page=1, per_page=1)
        return result["total_count"]

    def get_file_count_by_status(self, status: str) -> int:
        """指定されたステータスのファイル数を取得"""
        files = self.get_files_by_status(status)
        return len(files)

    def get_total_file_size(self) -> int:
        """ファイル総サイズを取得（バイト）"""
        result = self.db_manager.list_files(page=1, per_page=10000)
        total_size = 0

        for file_info in result["files"]:
            file_size = file_info.get("file_size", 0)
            if isinstance(file_size, int | float) and file_size >= 0:
                total_size += file_size

        return total_size

    def get_average_processing_time(self) -> float:
        """平均処理時間を取得"""
        result = self.db_manager.list_files(page=1, per_page=10000)
        total_time = 0
        count = 0

        for file_info in result["files"]:
            processing_time = file_info.get("processing_time")
            if isinstance(processing_time, int | float) and processing_time >= 0:
                total_time += processing_time
                count += 1

        return round(total_time / count, 2) if count > 0 else 0.0

    def get_file_statistics(self) -> dict[str, Any]:
        """ファイル統計情報を取得"""
        try:
            total_files = self.get_file_count()
            status_counts = {
                "processing": self.get_file_count_by_status(FileStatus.PROCESSING),
                "completed": self.get_file_count_by_status(FileStatus.COMPLETED),
                "failed": self.get_file_count_by_status(FileStatus.FAILED),
            }
            total_size = self.get_total_file_size()
            average_processing_time = self.get_average_processing_time()

            return {
                "total_files": total_files,
                "status_counts": status_counts,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
                if total_size > 0
                else 0,
                "total_processing_time": round(
                    average_processing_time * total_files, 2
                ),
                "average_processing_time": average_processing_time,
            }
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

    # ===========================
    # ファイル編集履歴
    # ===========================

    def get_file_edit_history(self, file_id: str) -> list[dict[str, Any]]:
        """ファイルの編集履歴を取得"""
        return self.db_manager.get_edit_history(file_id)

    def add_edit_history(
        self,
        file_id: str,
        original_filename: str,
        original_content: str,
        edited_filename: str,
        edited_content: str,
        edit_reason: str | None = None,
        edited_by: str = "system",
    ) -> bool:
        """編集履歴を追加"""
        try:
            return self.db_manager.add_edit_history(
                file_id=file_id,
                original_filename=original_filename,
                original_content=original_content,
                edited_filename=edited_filename,
                edited_content=edited_content,
                edit_reason=edit_reason,
                edited_by=edited_by,
            )
        except Exception:
            return False

    def get_edit_history_by_id(self, history_id: int) -> dict[str, Any] | None:
        """指定された履歴IDの編集履歴を取得"""
        # 全ファイルの編集履歴から該当するものを検索
        # 注: より効率的な実装が必要な場合は、データベースにインデックスを追加
        for file_info in self.db_manager.list_files(page=1, per_page=10000)["files"]:
            history = self.get_file_edit_history(file_info["id"])
            for history_item in history:
                if history_item["id"] == history_id:
                    return history_item
        return None

    # ===========================
    # 変換ログ
    # ===========================

    def get_conversion_logs(self, file_id: str) -> list[dict[str, Any]]:
        """変換ログを取得"""
        return self.db_manager.get_conversion_logs(file_id)

    def add_conversion_log(
        self,
        file_id: str,
        action: str,
        status: str,
        message: str | None = None,
        processing_time: float | None = None,
    ) -> bool:
        """変換ログを追加"""
        try:
            return self.db_manager.add_conversion_log(
                file_id=file_id,
                action=action,
                status=status,
                message=message,
                processing_time=processing_time,
            )
        except Exception:
            return False

    # ===========================
    # クリーンアップ・メンテナンス
    # ===========================

    def cleanup_old_files(self, days: int = 30) -> dict[str, Any]:
        """古いファイルをクリーンアップ"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            old_files = self.get_files_created_before(cutoff_date)

            deleted_count = 0
            for file_info in old_files:
                if self.delete_file(file_info["id"]):
                    deleted_count += 1

            return {
                "success": True,
                "deleted_count": deleted_count,
                "total_old_files": len(old_files),
                "cutoff_date": cutoff_date.isoformat(),
            }
        except Exception as e:
            return {"success": False, "error": str(e), "deleted_count": 0}

    def get_orphaned_files(self) -> list[dict[str, Any]]:
        """孤立したファイルを取得（ファイルシステム上で削除されたファイル）"""
        # 注: この実装は簡易版。実際の実装ではファイルシステムとの整合性チェックが必要
        result = self.db_manager.list_files(page=1, per_page=10000)
        orphaned_files = []

        for _file_info in result["files"]:
            # ファイルパスの存在確認ロジックをここに追加
            # 現在は簡易的に空のリストを返す
            pass

        return orphaned_files

    # ===========================
    # バッチ操作
    # ===========================

    def batch_delete_files(self, file_ids: list[str]) -> dict[str, Any]:
        """複数のファイルを一括削除"""
        try:
            if not file_ids:
                return {"success": False, "error": "ファイルIDが指定されていません"}

            deleted_count = 0
            failed_count = 0
            failed_files = []

            for file_id in file_ids:
                if not self.file_exists(file_id):
                    failed_count += 1
                    failed_files.append(
                        {"file_id": file_id, "error": "ファイルが見つかりません"}
                    )
                    continue

                if self.delete_file(file_id):
                    deleted_count += 1
                else:
                    failed_count += 1
                    failed_files.append({"file_id": file_id, "error": "削除処理に失敗"})

            return {
                "success": True,
                "deleted_count": deleted_count,
                "failed_count": failed_count,
                "failed_files": failed_files,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"一括削除中にエラーが発生しました: {str(e)}",
            }

    def batch_update_file_status(
        self, file_ids: list[str], status: str
    ) -> dict[str, Any]:
        """複数のファイルのステータスを一括更新"""
        try:
            if not file_ids:
                return {"success": False, "error": "ファイルIDが指定されていません"}

            updated_count = 0
            failed_count = 0
            failed_files = []

            for file_id in file_ids:
                if not self.file_exists(file_id):
                    failed_count += 1
                    failed_files.append(
                        {"file_id": file_id, "error": "ファイルが見つかりません"}
                    )
                    continue

                if self.update_file(file_id, {"status": status}):
                    updated_count += 1
                else:
                    failed_count += 1
                    failed_files.append(
                        {"file_id": file_id, "error": "ステータス更新に失敗"}
                    )

            return {
                "success": True,
                "updated_count": updated_count,
                "failed_count": failed_count,
                "failed_files": failed_files,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"一括更新中にエラーが発生しました: {str(e)}",
            }

    # ===========================
    # データベース管理
    # ===========================

    def clear_all_data(self) -> bool:
        """全データをクリア（テスト用）"""
        try:
            return self.db_manager.clear_all_data()
        except Exception:
            return False

    def get_database_info(self) -> dict[str, Any]:
        """データベース情報を取得"""
        try:
            total_files = self.get_file_count()
            total_size = self.get_total_file_size()

            return {
                "total_files": total_files,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
                if total_size > 0
                else 0,
                "database_path": self.db_manager.db_path,
            }
        except Exception as e:
            return {"error": str(e)}
