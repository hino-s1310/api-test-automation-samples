"""
ファイル管理サービス

ファイルの取得、一覧表示、削除などの処理を担当
"""

from datetime import datetime
from typing import Any

from ..database import db_manager
from ..models import FileStatus


class FileService:
    """ファイル管理サービス"""

    def __init__(self):
        pass

    def get_file(self, file_id: str) -> dict[str, Any] | None:
        """ファイル情報を取得"""
        file_info = db_manager.get_file(file_id)
        if not file_info:
            return None

        # レスポンス用のデータを整形
        return {
            "id": file_info["id"],
            "filename": file_info["filename"],
            "markdown": file_info.get("markdown_content", ""),
            "status": file_info["status"],
            "created_at": file_info["created_at"],
            "updated_at": file_info["updated_at"],
            "file_size": file_info["file_size"],
            "processing_time": file_info.get("processing_time"),
        }

    def list_files(self, page: int = 1, per_page: int = 10) -> dict[str, Any]:
        """ファイル一覧を取得"""
        result = db_manager.list_files(page, per_page)

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
        existing_file = db_manager.get_file(file_id)
        if not existing_file:
            return None

        # 更新処理
        if db_manager.update_file_status(
            file_id, FileStatus.COMPLETED, markdown_content
        ):
            # 更新後のファイル情報を取得
            return self.get_file(file_id)

        return None

    def delete_file(self, file_id: str) -> bool:
        """ファイルを削除"""
        return db_manager.delete_file(file_id)

    def get_file_status(self, file_id: str) -> str | None:
        """ファイルの状態を取得"""
        file_info = db_manager.get_file(file_id)
        return file_info["status"] if file_info else None

    def get_conversion_logs(self, file_id: str) -> list[dict[str, Any]]:
        """変換ログを取得"""
        return db_manager.get_conversion_logs(file_id)

    def get_file_statistics(self) -> dict[str, Any]:
        """ファイル統計情報を取得"""
        try:
            # 全ファイル数を取得
            all_files = db_manager.list_files(page=1, per_page=10000)
            total_files = all_files["total_count"]

            # 状態別のファイル数を集計
            status_counts = {"processing": 0, "completed": 0, "failed": 0}
            total_size = 0
            total_processing_time = 0

            # ファイルリストが存在する場合のみ処理
            if all_files["files"]:
                for file_info in all_files["files"]:
                    status = file_info.get("status", "unknown")
                    if status in status_counts:
                        status_counts[status] += 1

                    # ファイルサイズの安全な取得
                    file_size = file_info.get("file_size", 0)
                    if isinstance(file_size, int | float) and file_size >= 0:
                        total_size += file_size

                    # 処理時間の安全な取得
                    processing_time = file_info.get("processing_time")
                    if (
                        isinstance(processing_time, int | float)
                        and processing_time >= 0
                    ):
                        total_processing_time += processing_time

            # 平均処理時間の安全な計算
            average_processing_time = 0
            if total_files > 0 and total_processing_time > 0:
                average_processing_time = round(total_processing_time / total_files, 2)

            return {
                "total_files": total_files,
                "status_counts": status_counts,
                "total_size_bytes": total_size,
                "total_size_mb": (
                    round(total_size / (1024 * 1024), 2) if total_size > 0 else 0
                ),
                "total_processing_time": round(total_processing_time, 2),
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

    def cleanup_old_files(self, days: int = 30) -> dict[str, Any]:
        """古いファイルをクリーンアップ"""
        try:
            # 指定日数より古いファイルを検索
            from datetime import timedelta

            cutoff_date = datetime.now() - timedelta(days=days)

            # データベースから古いファイルを取得
            # 注: 実際の実装では、より効率的なクエリを使用
            all_files = db_manager.list_files(page=1, per_page=10000)
            old_files = []

            for file_info in all_files["files"]:
                created_at = datetime.fromisoformat(
                    file_info["created_at"].replace("Z", "+00:00")
                )
                if created_at < cutoff_date:
                    old_files.append(file_info["id"])

            # 古いファイルを削除
            deleted_count = 0
            for file_id in old_files:
                if db_manager.delete_file(file_id):
                    deleted_count += 1

            return {
                "success": True,
                "deleted_count": deleted_count,
                "total_old_files": len(old_files),
                "cutoff_date": cutoff_date.isoformat(),
            }

        except Exception as e:
            return {"success": False, "error": str(e), "deleted_count": 0}

    def get_current_time(self) -> datetime:
        """現在時刻を取得"""
        return datetime.now()

    def validate_file_id(self, file_id: str) -> bool:
        """ファイルIDの妥当性を検証"""
        # UUID形式の検証
        import re

        uuid_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            re.IGNORECASE,
        )
        return bool(uuid_pattern.match(file_id))

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
            existing_file = db_manager.get_file(file_id)
            if not existing_file:
                return {"success": False, "error": "ファイルが見つかりません"}

            # 編集処理を実行
            if db_manager.update_file_content(
                file_id=file_id,
                new_filename=new_filename,
                new_content=new_content,
                edit_reason=edit_reason,
                edited_by=edited_by,
            ):
                # 更新後のファイル情報を取得
                updated_file = db_manager.get_file(file_id)

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
            existing_file = db_manager.get_file(file_id)
            if not existing_file:
                return []

            # 編集履歴を取得
            history = db_manager.get_edit_history(file_id)

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
            existing_file = db_manager.get_file(file_id)
            if not existing_file:
                return {"success": False, "error": "ファイルが見つかりません"}

            # 指定された履歴を取得
            history = db_manager.get_edit_history(file_id)
            target_history = None

            for history_item in history:
                if history_item["id"] == history_id:
                    target_history = history_item
                    break

            if not target_history:
                return {"success": False, "error": "指定された履歴が見つかりません"}

            # ファイルを履歴の状態に復元
            if db_manager.update_file_content(
                file_id=file_id,
                new_filename=target_history["original_filename"],
                new_content=target_history["original_content"],
                edit_reason=f"履歴ID {history_id} への復元",
                edited_by="system",
            ):
                # 復元後のファイル情報を取得
                reverted_file = db_manager.get_file(file_id)

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
            result = db_manager.search_files(
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
        """複数のファイルを一括削除"""
        try:
            print(f"一括削除開始: {file_ids}")  # デバッグログ
            if not file_ids:
                return {"success": False, "error": "ファイルIDが指定されていません"}

            deleted_count = 0
            failed_count = 0
            failed_files = []

            for file_id in file_ids:
                print(f"ファイルID処理中: '{file_id}'")  # デバッグログ
                # ファイルIDの妥当性を検証
                if not self.validate_file_id(file_id):
                    print(f"ファイルID検証失敗: '{file_id}'")  # デバッグログ
                    failed_count += 1
                    failed_files.append(
                        {"file_id": file_id, "error": "無効なファイルID形式"}
                    )
                    continue

                # ファイルの存在確認
                existing_file = db_manager.get_file(file_id)
                if not existing_file:
                    print(f"ファイル存在確認失敗: '{file_id}'")  # デバッグログ
                    failed_count += 1
                    failed_files.append(
                        {"file_id": file_id, "error": "ファイルが見つかりません"}
                    )
                    continue

                # 削除処理を実行
                if db_manager.delete_file(file_id):
                    print(f"ファイル削除成功: '{file_id}'")  # デバッグログ
                    deleted_count += 1
                else:
                    print(f"ファイル削除失敗: '{file_id}'")  # デバッグログ
                    failed_count += 1
                    failed_files.append({"file_id": file_id, "error": "削除処理に失敗"})

            print(
                f"一括削除完了: 成功={deleted_count}, 失敗={failed_count}"
            )  # デバッグログ
            return {
                "success": True,
                "deleted_count": deleted_count,
                "failed_count": failed_count,
                "failed_files": failed_files,
            }

        except Exception as e:
            print(f"一括削除中に例外発生: {str(e)}")  # デバッグログ
            return {
                "success": False,
                "error": f"一括削除中にエラーが発生しました: {str(e)}",
            }
