"""
ファイルリポジトリ

ファイル関連のデータアクセス処理を担当
データベース操作の抽象化とカプセル化
"""

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import joinedload
from sqlmodel import and_, func, or_, select

from ..cache import CacheKeys, cache_manager
from ..database import SQLModelSessionManager, db_manager
from ..models import ConversionLog, File, FileEditHistory, FileStatus


class FileRepository:
    """ファイルリポジトリクラス"""

    def __init__(
        self,
        use_sqlmodel: bool = False,
        enable_cache: bool = True,
        sqlmodel_manager: SQLModelSessionManager = None,
    ):
        self.db_manager = db_manager
        self.use_sqlmodel = use_sqlmodel
        self.enable_cache = enable_cache
        if use_sqlmodel:
            self.sqlmodel_manager = sqlmodel_manager or SQLModelSessionManager()
        else:
            self.sqlmodel_manager = None

    # ===========================
    # 基本的なCRUD操作
    # ===========================

    def get_file(
        self, file_id: str, include_relations: bool = False
    ) -> dict[str, Any] | None:
        """ファイル情報を取得"""
        # キャッシュチェック
        if self.enable_cache:
            cache_key_str = CacheKeys.file_detail(file_id)
            if include_relations:
                cache_key_str += ":relations"

            cached_result = cache_manager.get(cache_key_str)
            if cached_result is not None:
                return cached_result

        # データベースから取得
        result = None
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(File).where(File.id == file_id)

                    # リレーションを含める場合はjoinedloadを使用
                    if include_relations:
                        statement = statement.options(
                            joinedload(File.conversion_logs),
                            joinedload(File.edit_history),
                        )

                    file_obj = session.exec(statement).first()
                    if file_obj:
                        result = file_obj.to_dict()
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                result = self.db_manager.get_file(file_id)
        else:
            result = self.db_manager.get_file(file_id)

        # キャッシュに保存
        if self.enable_cache and result is not None:
            cache_key_str = CacheKeys.file_detail(file_id)
            if include_relations:
                cache_key_str += ":relations"
            cache_manager.set(cache_key_str, result, ttl=600)  # 10分キャッシュ

        return result

    def create_file(self, file_data: dict[str, Any]) -> bool:
        """ファイルを作成"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # SQLModelのFileオブジェクトを作成
                    file_obj = File(
                        id=file_data["id"],
                        filename=file_data["filename"],
                        original_path=file_data["original_path"],
                        file_size=file_data["file_size"],
                        status=file_data.get("status", FileStatus.PROCESSING),
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                    )
                    session.add(file_obj)
                    session.commit()
                    return True
            except Exception:
                # フォールバック: 既存のdb_managerを使用
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
        else:
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
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(File).where(File.id == file_id)
                    file_obj = session.exec(statement).first()
                    if not file_obj:
                        return False

                    # 更新データを適用
                    for key, value in update_data.items():
                        if hasattr(file_obj, key):
                            setattr(file_obj, key, value)

                    # updated_atを自動更新
                    file_obj.updated_at = datetime.now()

                    session.add(file_obj)
                    session.commit()
                    return True
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                try:
                    if "status" in update_data:
                        if "markdown_content" in update_data:
                            return self.db_manager.update_file_status(
                                file_id,
                                update_data["status"],
                                update_data["markdown_content"],
                            )
                        else:
                            return self.db_manager.update_file_status(
                                file_id, update_data["status"]
                            )

                    # その他の更新処理
                    return self.update_file_content(
                        file_id=file_id,
                        new_filename=update_data.get("filename"),
                        new_content=update_data.get("markdown_content"),
                        edit_reason=update_data.get("edit_reason"),
                        edited_by=update_data.get("edited_by", "system"),
                    )
                except Exception:
                    return False
        else:
            try:
                # 個別の更新処理を呼び出し
                if "status" in update_data:
                    if "markdown_content" in update_data:
                        return self.db_manager.update_file_status(
                            file_id,
                            update_data["status"],
                            update_data["markdown_content"],
                        )
                    else:
                        return self.db_manager.update_file_status(
                            file_id, update_data["status"]
                        )

                # その他の更新処理
                return self.update_file_content(
                    file_id=file_id,
                    new_filename=update_data.get("filename"),
                    new_content=update_data.get("markdown_content"),
                    edit_reason=update_data.get("edit_reason"),
                    edited_by=update_data.get("edited_by", "system"),
                )
            except Exception:
                return False

    def update_file_content(
        self,
        file_id: str,
        new_filename: str | None = None,
        new_content: str | None = None,
        edit_reason: str | None = None,
        edited_by: str = "system",
    ) -> bool:
        """ファイルの内容を更新（編集履歴も含む）"""
        try:
            return self.db_manager.update_file_content(
                file_id=file_id,
                new_filename=new_filename,
                new_content=new_content,
                edit_reason=edit_reason,
                edited_by=edited_by,
            )
        except Exception:
            return False

    def delete_file(self, file_id: str) -> bool:
        """ファイルを削除"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(File).where(File.id == file_id)
                    file_obj = session.exec(statement).first()
                    if not file_obj:
                        return False

                    session.delete(file_obj)
                    session.commit()
                    return True
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                return self.db_manager.delete_file(file_id)
        else:
            return self.db_manager.delete_file(file_id)

    def file_exists(self, file_id: str) -> bool:
        """ファイルの存在確認"""
        return self.get_file(file_id) is not None

    # ===========================
    # ファイル一覧・検索
    # ===========================

    def list_files(self, page: int = 1, per_page: int = 10) -> dict[str, Any]:
        """ファイル一覧を取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # 総件数を取得
                    count_statement = select(func.count(File.id))
                    total_count = session.exec(count_statement).one()

                    # ページネーション用のオフセット計算
                    offset = (page - 1) * per_page

                    # ファイル一覧を取得
                    statement = select(File).offset(offset).limit(per_page)
                    files = session.exec(statement).all()

                    # 辞書形式に変換
                    file_dicts = [file_obj.to_dict() for file_obj in files]

                    return {
                        "files": file_dicts,
                        "total_count": total_count,
                        "page": page,
                        "per_page": per_page,
                    }
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                return self.db_manager.list_files(page, per_page)
        else:
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
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # ベースクエリ
                    statement = select(File)
                    conditions = []

                    # 検索条件の構築
                    if query:
                        conditions.append(
                            or_(
                                File.filename.contains(query),
                                File.original_path.contains(query),
                            )
                        )

                    if status:
                        conditions.append(File.status == status)

                    if is_edited is not None:
                        conditions.append(File.is_edited == is_edited)

                    # 条件を適用
                    if conditions:
                        statement = statement.where(and_(*conditions))

                    # 総件数を取得
                    count_statement = select(func.count(File.id))
                    if conditions:
                        count_statement = count_statement.where(and_(*conditions))
                    total_count = session.exec(count_statement).one()

                    # ページネーション
                    offset = (page - 1) * per_page
                    statement = statement.offset(offset).limit(per_page)

                    # 結果を取得
                    files = session.exec(statement).all()
                    file_dicts = [file_obj.to_dict() for file_obj in files]

                    return {
                        "files": file_dicts,
                        "total_count": total_count,
                        "page": page,
                        "per_page": per_page,
                    }
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                return self.db_manager.search_files(
                    query=query,
                    status=status,
                    is_edited=is_edited,
                    page=page,
                    per_page=per_page,
                )
        else:
            return self.db_manager.search_files(
                query=query,
                status=status,
                is_edited=is_edited,
                page=page,
                per_page=per_page,
            )

    def get_files_by_status(
        self, status: str, include_relations: bool = False
    ) -> dict[str, Any]:
        """指定されたステータスのファイルを取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # ベースクエリ
                    statement = select(File).where(File.status == status)

                    # リレーションを含める場合はjoinedloadを使用
                    if include_relations:
                        statement = statement.options(
                            joinedload(File.conversion_logs),
                            joinedload(File.edit_history),
                        )

                    # 総件数を取得
                    count_statement = select(func.count(File.id)).where(
                        File.status == status
                    )
                    total_count = session.exec(count_statement).one()

                    # ファイル一覧を取得
                    files = session.exec(statement).all()
                    file_dicts = [file_obj.to_dict() for file_obj in files]

                    return {
                        "files": file_dicts,
                        "total_count": total_count,
                    }
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                result = self.db_manager.list_files(page=1, per_page=10000)
                filtered_files = [f for f in result["files"] if f["status"] == status]
                return {
                    "files": filtered_files,
                    "total_count": len(filtered_files),
                }
        else:
            result = self.db_manager.list_files(page=1, per_page=10000)
            filtered_files = [f for f in result["files"] if f["status"] == status]
            return {
                "files": filtered_files,
                "total_count": len(filtered_files),
            }

    def get_files_created_after(self, date: datetime) -> dict[str, Any]:
        """指定された日時以降に作成されたファイルを取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # 総件数を取得
                    count_statement = select(func.count(File.id)).where(
                        File.created_at >= date
                    )
                    total_count = session.exec(count_statement).one()

                    # ファイル一覧を取得
                    statement = select(File).where(File.created_at >= date)
                    files = session.exec(statement).all()
                    file_dicts = [file_obj.to_dict() for file_obj in files]

                    return {
                        "files": file_dicts,
                        "total_count": total_count,
                    }
            except Exception:
                # フォールバック: 既存のdb_managerを使用
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
                return {
                    "files": files,
                    "total_count": len(files),
                }
        else:
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
            return {
                "files": files,
                "total_count": len(files),
            }

    def get_files_created_before(self, date: datetime) -> dict[str, Any]:
        """指定された日時以前に作成されたファイルを取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # 総件数を取得
                    count_statement = select(func.count(File.id)).where(
                        File.created_at <= date
                    )
                    total_count = session.exec(count_statement).one()

                    # ファイル一覧を取得
                    statement = select(File).where(File.created_at <= date)
                    files = session.exec(statement).all()
                    file_dicts = [file_obj.to_dict() for file_obj in files]

                    return {
                        "files": file_dicts,
                        "total_count": total_count,
                    }
            except Exception:
                # フォールバック: 既存のdb_managerを使用
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
                return {
                    "files": files,
                    "total_count": len(files),
                }
        else:
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
            return {
                "files": files,
                "total_count": len(files),
            }

    # ===========================
    # ファイル統計情報
    # ===========================

    def get_file_count(self) -> int:
        """ファイル総数を取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(func.count(File.id))
                    return session.exec(statement).one()
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                result = self.db_manager.list_files(page=1, per_page=1)
                return result["total_count"]
        else:
            result = self.db_manager.list_files(page=1, per_page=1)
            return result["total_count"]

    def get_file_count_by_status(self, status: str) -> int:
        """指定されたステータスのファイル数を取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(func.count(File.id)).where(File.status == status)
                    return session.exec(statement).one()
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                result = self.get_files_by_status(status)
                return result["total_count"]
        else:
            result = self.get_files_by_status(status)
            return result["total_count"]

    def get_total_file_size(self) -> int:
        """ファイル総サイズを取得（バイト）"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(func.sum(File.file_size))
                    result = session.exec(statement).one()
                    return result if result is not None else 0
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                result = self.db_manager.list_files(page=1, per_page=10000)
                total_size = 0
                for file_info in result["files"]:
                    file_size = file_info.get("file_size", 0)
                    if isinstance(file_size, int | float) and file_size >= 0:
                        total_size += file_size
                return total_size
        else:
            result = self.db_manager.list_files(page=1, per_page=10000)
            total_size = 0
            for file_info in result["files"]:
                file_size = file_info.get("file_size", 0)
                if isinstance(file_size, int | float) and file_size >= 0:
                    total_size += file_size
            return total_size

    def get_average_processing_time(self) -> float:
        """平均処理時間を取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # 処理時間がNULLでないファイルの平均を取得
                    statement = select(func.avg(File.processing_time)).where(
                        File.processing_time.is_not(None)
                    )
                    result = session.exec(statement).one()
                    return round(result, 2) if result is not None else 0.0
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                result = self.db_manager.list_files(page=1, per_page=10000)
                total_time = 0
                count = 0
                for file_info in result["files"]:
                    processing_time = file_info.get("processing_time")
                    if (
                        isinstance(processing_time, int | float)
                        and processing_time >= 0
                    ):
                        total_time += processing_time
                        count += 1
                return round(total_time / count, 2) if count > 0 else 0.0
        else:
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
        # キャッシュチェック
        if self.enable_cache:
            cached_result = cache_manager.get(CacheKeys.FILE_STATISTICS)
            if cached_result is not None:
                return cached_result

        # データベースから取得
        try:
            total_files = self.get_file_count()
            status_counts = {
                "processing": self.get_file_count_by_status(FileStatus.PROCESSING),
                "completed": self.get_file_count_by_status(FileStatus.COMPLETED),
                "failed": self.get_file_count_by_status(FileStatus.FAILED),
            }
            total_size = self.get_total_file_size()
            average_processing_time = self.get_average_processing_time()

            result = {
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

            # キャッシュに保存（5分間）
            if self.enable_cache:
                cache_manager.set(CacheKeys.FILE_STATISTICS, result, ttl=300)

            return result
        except Exception as e:
            error_result = {
                "error": str(e),
                "total_files": 0,
                "status_counts": {"processing": 0, "completed": 0, "failed": 0},
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "total_processing_time": 0,
                "average_processing_time": 0,
            }

            # エラーも短時間キャッシュ（1分間）
            if self.enable_cache:
                cache_manager.set(CacheKeys.FILE_STATISTICS, error_result, ttl=60)

            return error_result

    # ===========================
    # キャッシュ管理
    # ===========================

    def invalidate_file_cache(self, file_id: str) -> None:
        """ファイル関連のキャッシュを無効化"""
        if self.enable_cache:
            # ファイル詳細のキャッシュを削除
            cache_manager.delete(CacheKeys.file_detail(file_id))
            cache_manager.delete(CacheKeys.file_detail(file_id) + ":relations")

            # ファイル一覧のキャッシュを無効化
            cache_manager.invalidate_pattern(f"{CacheKeys.FILE_LIST}:.*")

            # 統計情報のキャッシュを無効化
            cache_manager.delete(CacheKeys.FILE_STATISTICS)

    def invalidate_all_cache(self) -> None:
        """全キャッシュを無効化"""
        if self.enable_cache:
            cache_manager.clear()

    def get_cache_stats(self) -> dict[str, Any]:
        """キャッシュ統計情報を取得"""
        if self.enable_cache:
            return cache_manager.get_stats()
        return {"cache_enabled": False}

    # ===========================
    # ファイル編集履歴
    # ===========================

    def get_file_edit_history(self, file_id: str) -> list[dict[str, Any]]:
        """ファイルの編集履歴を取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(FileEditHistory).where(
                        FileEditHistory.file_id == file_id
                    )
                    history = session.exec(statement).all()
                    return [h.to_dict() for h in history]
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                return self.db_manager.get_edit_history(file_id)
        else:
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
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    history_obj = FileEditHistory(
                        file_id=file_id,
                        original_filename=original_filename,
                        original_content=original_content,
                        edited_filename=edited_filename,
                        edited_content=edited_content,
                        edit_reason=edit_reason,
                        edited_by=edited_by,
                        created_at=datetime.now(),
                    )
                    session.add(history_obj)
                    session.commit()
                    return True
            except Exception:
                # フォールバック: 既存のdb_managerを使用
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
        else:
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

    def get_edit_history(self, file_id: str) -> list[dict[str, Any]]:
        """指定されたファイルの編集履歴を取得"""
        try:
            return self.db_manager.get_edit_history(file_id)
        except Exception:
            return []

    def get_edit_history_by_id(self, history_id: int) -> dict[str, Any] | None:
        """指定された履歴IDの編集履歴を取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # SQLModelを使用した効率的なクエリ
                    statement = select(FileEditHistory).where(
                        FileEditHistory.id == history_id
                    )
                    history_obj = session.exec(statement).first()
                    if history_obj:
                        return history_obj.to_dict()
                    return None
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                pass

        # 既存の非効率的な実装（フォールバック）
        for file_info in self.db_manager.list_files(page=1, per_page=10000)["files"]:
            history = self.get_edit_history(file_info["id"])
            for history_item in history:
                if history_item["id"] == history_id:
                    return history_item
        return None

    # ===========================
    # 変換ログ
    # ===========================

    def get_conversion_logs(self, file_id: str) -> list[dict[str, Any]]:
        """変換ログを取得"""
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    statement = select(ConversionLog).where(
                        ConversionLog.file_id == file_id
                    )
                    logs = session.exec(statement).all()
                    return [log.to_dict() for log in logs]
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                return self.db_manager.get_conversion_logs(file_id)
        else:
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
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    log_obj = ConversionLog(
                        file_id=file_id,
                        action=action,
                        status=status,
                        message=message,
                        timestamp=datetime.now(),
                        processing_time=processing_time,
                    )
                    session.add(log_obj)
                    session.commit()
                    return True
            except Exception:
                # フォールバック: 既存のdb_managerを使用
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
        else:
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
            old_files_result = self.get_files_created_before(cutoff_date)
            old_files = old_files_result["files"]

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

    def get_orphaned_files(self) -> dict[str, Any]:
        """孤立したファイルを取得（ファイルシステム上で削除されたファイル）"""
        # 注: この実装は簡易版。実際の実装ではファイルシステムとの整合性チェックが必要
        if self.use_sqlmodel and self.sqlmodel_manager:
            try:
                with self.sqlmodel_manager as session:
                    # ファイル一覧を取得
                    statement = select(File)
                    files = session.exec(statement).all()
                    orphaned_files = []

                    for _file_obj in files:
                        # ファイルパスの存在確認ロジックをここに追加
                        # 現在は簡易的に空のリストを返す
                        pass

                    return {
                        "orphaned_files": orphaned_files,
                        "total_orphaned": len(orphaned_files),
                    }
            except Exception:
                # フォールバック: 既存のdb_managerを使用
                result = self.db_manager.list_files(page=1, per_page=10000)
                orphaned_files = []

                for _file_info in result["files"]:
                    # ファイルパスの存在確認ロジックをここに追加
                    # 現在は簡易的に空のリストを返す
                    pass

                return {
                    "orphaned_files": orphaned_files,
                    "total_orphaned": len(orphaned_files),
                }
        else:
            result = self.db_manager.list_files(page=1, per_page=10000)
            orphaned_files = []

            for _file_info in result["files"]:
                # ファイルパスの存在確認ロジックをここに追加
                # 現在は簡易的に空のリストを返す
                pass

            return {
                "orphaned_files": orphaned_files,
                "total_orphaned": len(orphaned_files),
            }

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
