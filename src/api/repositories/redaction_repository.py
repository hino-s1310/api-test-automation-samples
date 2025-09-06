"""
RedactionRepository

機密情報の赤セルシート機能に関するデータアクセス処理を担当
データベース操作の抽象化とカプセル化
"""

import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.exc import (
    DatabaseError,
    IntegrityError,
    OperationalError,
    SQLAlchemyError,
)
from sqlalchemy.orm import joinedload
from sqlmodel import and_, or_

from ..cache import CacheKeys, cache_manager
from ..database import SQLModelSessionManager, db_manager
from ..models import (
    RedactionLevel,
    RedactionSettings,
    RedactionSettingsShare,
)

# ロガーの設定
logger = logging.getLogger(__name__)


# ===========================
# カスタム例外クラス
# ===========================


class RedactionRepositoryError(Exception):
    """RedactionRepositoryの基底例外クラス"""

    pass


class RedactionValidationError(RedactionRepositoryError):
    """バリデーションエラー"""

    pass


class RedactionDatabaseError(RedactionRepositoryError):
    """データベースエラー"""

    pass


class RedactionNotFoundError(RedactionRepositoryError):
    """リソースが見つからないエラー"""

    pass


class RedactionPermissionError(RedactionRepositoryError):
    """権限エラー"""

    pass


class RedactionRepository:
    """RedactionRepositoryクラス"""

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
    # バリデーション用ヘルパーメソッド
    # ===========================

    def _validate_file_id(self, file_id: str) -> None:
        """ファイルIDのバリデーション"""
        if not file_id or not isinstance(file_id, str):
            raise RedactionValidationError(
                "ファイルIDは有効な文字列である必要があります"
            )

        if len(file_id.strip()) == 0:
            raise RedactionValidationError("ファイルIDは空文字列にできません")

    def _validate_user_id(self, user_id: str) -> None:
        """ユーザーIDのバリデーション"""
        if not user_id or not isinstance(user_id, str):
            raise RedactionValidationError(
                "ユーザーIDは有効な文字列である必要があります"
            )

        if len(user_id.strip()) == 0:
            raise RedactionValidationError("ユーザーIDは空文字列にできません")

    def _validate_settings_name(self, name: str) -> None:
        """設定名のバリデーション"""
        if not name or not isinstance(name, str):
            raise RedactionValidationError("設定名は有効な文字列である必要があります")

        if len(name.strip()) == 0:
            raise RedactionValidationError("設定名は空文字列にできません")

        if len(name) > 255:
            raise RedactionValidationError("設定名は255文字以内である必要があります")

    def _validate_level_settings(self, level_settings: dict[str, Any] | None) -> None:
        """レベル設定のバリデーション"""
        if level_settings is None:
            return

        if not isinstance(level_settings, dict):
            raise RedactionValidationError("レベル設定は辞書形式である必要があります")

        # レベル設定は任意の型の値を許可（JSONシリアライゼーション対応）
        for level, _value in level_settings.items():
            if not isinstance(level, str):
                raise RedactionValidationError(
                    "レベル設定のキーは文字列である必要があります"
                )
            # 値の型は任意（JSONシリアライゼーション対応）

    def _validate_revealed_items(self, revealed_items: list[str] | None) -> None:
        """表示項目のバリデーション"""
        if revealed_items is None:
            return

        if not isinstance(revealed_items, list):
            raise RedactionValidationError("表示項目はリスト形式である必要があります")

        for item in revealed_items:
            if not isinstance(item, str):
                raise RedactionValidationError(
                    "表示項目の要素は文字列である必要があります"
                )

    def _validate_settings_id(self, settings_id: int) -> None:
        """設定IDのバリデーション"""
        if not isinstance(settings_id, int) or settings_id <= 0:
            raise RedactionValidationError("設定IDは正の整数である必要があります")

    def _validate_pagination_params(self, limit: int, offset: int) -> None:
        """ページネーションパラメータのバリデーション"""
        if not isinstance(limit, int) or limit <= 0:
            raise RedactionValidationError("limitは正の整数である必要があります")

        if not isinstance(offset, int) or offset < 0:
            raise RedactionValidationError("offsetは0以上の整数である必要があります")

        if limit > 1000:
            raise RedactionValidationError("limitは1000以下である必要があります")

    # ===========================
    # エラーハンドリング用ヘルパーメソッド
    # ===========================

    def _handle_database_error(self, error: SQLAlchemyError, operation: str) -> None:
        """データベースエラーの処理"""
        logger.error(f"データベースエラーが発生しました (操作: {operation}): {error}")

        if isinstance(error, IntegrityError):
            if "UNIQUE constraint failed" in str(error):
                raise RedactionDatabaseError("データの一意性制約に違反しました")
            elif "FOREIGN KEY constraint failed" in str(error):
                raise RedactionDatabaseError("外部キー制約に違反しました")
            else:
                raise RedactionDatabaseError("データの整合性制約に違反しました")
        elif isinstance(error, OperationalError):
            raise RedactionDatabaseError("データベース接続エラーが発生しました")
        elif isinstance(error, DatabaseError):
            raise RedactionDatabaseError("データベース操作エラーが発生しました")
        else:
            raise RedactionDatabaseError(f"データベースエラーが発生しました: {error}")

    def _handle_validation_error(self, error: Exception, field: str) -> None:
        """バリデーションエラーの処理"""
        logger.error(
            f"バリデーションエラーが発生しました (フィールド: {field}): {error}"
        )
        raise RedactionValidationError(
            f"{field}のバリデーションに失敗しました: {error}"
        )

    def _handle_not_found_error(
        self, resource_type: str, resource_id: str | int
    ) -> None:
        """リソースが見つからないエラーの処理"""
        logger.warning(f"{resource_type}が見つかりません (ID: {resource_id})")
        raise RedactionNotFoundError(
            f"{resource_type}が見つかりません (ID: {resource_id})"
        )

    def _handle_permission_error(self, user_id: str, operation: str) -> None:
        """権限エラーの処理"""
        logger.warning(
            f"権限エラーが発生しました (ユーザー: {user_id}, 操作: {operation})"
        )
        raise RedactionPermissionError("この操作を実行する権限がありません")

    # ===========================
    # 基本的なCRUD操作
    # ===========================

    def create_redaction_settings(
        self,
        file_id: str,
        user_id: str,
        name: str,
        description: str = "",
        show_all: bool = False,
        level_settings: dict[str, bool] | None = None,
        revealed_items: list[str] | None = None,
        is_shared: bool = False,
    ) -> dict[str, Any]:
        """
        機密情報設定を作成

        Args:
            file_id: ファイルID
            user_id: ユーザーID
            name: 設定名
            description: 説明
            show_all: 全て表示するかどうか
            level_settings: レベル別設定
            revealed_items: 表示する項目リスト
            is_shared: 共有設定かどうか

        Returns:
            作成された設定の辞書

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_file_id(file_id)
            self._validate_user_id(user_id)
            self._validate_settings_name(name)
            self._validate_level_settings(level_settings)
            self._validate_revealed_items(revealed_items)

            # 説明の長さチェック
            if len(description) > 1000:
                raise RedactionValidationError("説明は1000文字以内である必要があります")

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "create_redaction_settings")

        try:
            with self.sqlmodel_manager as session:
                # デフォルト値の設定
                if level_settings is None:
                    level_settings = {
                        RedactionLevel.LEVEL1.value: True,
                        RedactionLevel.LEVEL2.value: True,
                        RedactionLevel.LEVEL3.value: True,
                    }

                if revealed_items is None:
                    revealed_items = []

                # 新しい設定を作成
                redaction_settings = RedactionSettings(
                    file_id=file_id,
                    user_id=user_id,
                    name=name,
                    description=description,
                    show_all=show_all,
                    level_settings=json.dumps(level_settings),
                    revealed_items=json.dumps(revealed_items),
                    is_shared=is_shared,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )

                session.add(redaction_settings)
                session.commit()
                session.refresh(redaction_settings)

                # キャッシュをクリア
                if self.enable_cache:
                    cache_manager.delete_pattern("redaction_settings:*:{file_id}:*")
                    cache_manager.delete_pattern("redaction_settings:list:*")

                return redaction_settings.to_dict()

        except SQLAlchemyError as e:
            self._handle_database_error(e, "create_redaction_settings")
        except Exception as e:
            logger.error(
                f"予期しないエラーが発生しました (create_redaction_settings): {e}"
            )
            raise RedactionRepositoryError(f"設定の作成に失敗しました: {e}")

    def get_redaction_settings(
        self, settings_id: int, include_relations: bool = False
    ) -> dict[str, Any] | None:
        """
        機密情報設定を取得

        Args:
            settings_id: 設定ID
            include_relations: 関連データを含めるかどうか

        Returns:
            設定の辞書、見つからない場合はNone

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_settings_id(settings_id)

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "get_redaction_settings")

        try:
            # キャッシュチェック
            if self.enable_cache:
                cache_key_str = CacheKeys.redaction_settings_detail(settings_id)
                if include_relations:
                    cache_key_str += ":relations"

                cached_result = cache_manager.get(cache_key_str)
                if cached_result is not None:
                    return cached_result

            with self.sqlmodel_manager as session:
                query = session.query(RedactionSettings).filter(
                    RedactionSettings.id == settings_id
                )

                if include_relations:
                    query = query.options(
                        joinedload(RedactionSettings.file),
                        joinedload(RedactionSettings.shares),
                    )

                redaction_settings = query.first()

                if redaction_settings is None:
                    return None

                result = redaction_settings.to_dict()

                # キャッシュに保存
                if self.enable_cache:
                    cache_manager.set(cache_key_str, result, ttl=300)

                return result

        except SQLAlchemyError as e:
            self._handle_database_error(e, "get_redaction_settings")
        except Exception as e:
            logger.error(
                f"予期しないエラーが発生しました (get_redaction_settings): {e}"
            )
            raise RedactionRepositoryError(f"設定の取得に失敗しました: {e}")

    def update_redaction_settings(
        self,
        settings_id: int,
        name: str | None = None,
        description: str | None = None,
        show_all: bool | None = None,
        level_settings: dict[str, bool] | None = None,
        revealed_items: list[str] | None = None,
        is_shared: bool | None = None,
    ) -> dict[str, Any] | None:
        """
        機密情報設定を更新

        Args:
            settings_id: 設定ID
            name: 設定名
            description: 説明
            show_all: 全て表示するかどうか
            level_settings: レベル別設定
            revealed_items: 表示する項目リスト
            is_shared: 共有設定かどうか

        Returns:
            更新された設定の辞書、見つからない場合はNone

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_settings_id(settings_id)

            if name is not None:
                self._validate_settings_name(name)
            if level_settings is not None:
                self._validate_level_settings(level_settings)
            if revealed_items is not None:
                self._validate_revealed_items(revealed_items)
            if description is not None and len(description) > 1000:
                raise RedactionValidationError("説明は1000文字以内である必要があります")

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "update_redaction_settings")

        try:
            with self.sqlmodel_manager as session:
                redaction_settings = (
                    session.query(RedactionSettings)
                    .filter(RedactionSettings.id == settings_id)
                    .first()
                )

                if redaction_settings is None:
                    return None

                # 更新可能なフィールドを更新
                if name is not None:
                    redaction_settings.name = name
                if description is not None:
                    redaction_settings.description = description
                if show_all is not None:
                    redaction_settings.show_all = show_all
                if level_settings is not None:
                    redaction_settings.level_settings = json.dumps(level_settings)
                if revealed_items is not None:
                    redaction_settings.revealed_items = json.dumps(revealed_items)
                if is_shared is not None:
                    redaction_settings.is_shared = is_shared

                redaction_settings.updated_at = datetime.now()

                session.commit()
                session.refresh(redaction_settings)

                # キャッシュをクリア
                if self.enable_cache:
                    cache_manager.delete_pattern("redaction_settings:*")
                    cache_manager.delete_pattern("redaction_settings:list:*")

                return redaction_settings.to_dict()

        except SQLAlchemyError as e:
            self._handle_database_error(e, "update_redaction_settings")
        except Exception as e:
            logger.error(
                f"予期しないエラーが発生しました (update_redaction_settings): {e}"
            )
            raise RedactionRepositoryError(f"設定の更新に失敗しました: {e}")

    def delete_redaction_settings(self, settings_id: int) -> bool:
        """
        機密情報設定を削除

        Args:
            settings_id: 設定ID

        Returns:
            削除成功の場合True、見つからない場合はFalse

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_settings_id(settings_id)

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "delete_redaction_settings")

        try:
            with self.sqlmodel_manager as session:
                redaction_settings = (
                    session.query(RedactionSettings)
                    .filter(RedactionSettings.id == settings_id)
                    .first()
                )

                if redaction_settings is None:
                    return False

                # 関連する共有設定も削除
                session.query(RedactionSettingsShare).filter(
                    RedactionSettingsShare.settings_id == settings_id
                ).delete()

                # 設定を削除
                session.delete(redaction_settings)
                session.commit()

                # キャッシュをクリア
                if self.enable_cache:
                    cache_manager.delete_pattern("redaction_settings:*")
                    cache_manager.delete_pattern("redaction_settings:list:*")

                return True

        except SQLAlchemyError as e:
            self._handle_database_error(e, "delete_redaction_settings")
        except Exception as e:
            logger.error(
                f"予期しないエラーが発生しました (delete_redaction_settings): {e}"
            )
            raise RedactionRepositoryError(f"設定の削除に失敗しました: {e}")

    def list_redaction_settings(
        self,
        user_id: str | None = None,
        file_id: str | None = None,
        is_shared: bool | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict[str, Any]:
        """
        機密情報設定のリストを取得

        Args:
            user_id: ユーザーID（フィルタ用）
            file_id: ファイルID（フィルタ用）
            is_shared: 共有設定かどうか（フィルタ用）
            limit: 取得件数上限
            offset: オフセット

        Returns:
            設定リストとメタデータの辞書

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_pagination_params(limit, offset)

            if user_id is not None:
                self._validate_user_id(user_id)
            if file_id is not None:
                self._validate_file_id(file_id)

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "list_redaction_settings")

        try:
            # キャッシュチェック
            if self.enable_cache:
                cache_key_str = CacheKeys.redaction_settings_list(
                    user_id, file_id, is_shared, limit, offset
                )
                cached_result = cache_manager.get(cache_key_str)
                if cached_result is not None:
                    return cached_result

            with self.sqlmodel_manager as session:
                query = session.query(RedactionSettings)

                # フィルタ条件を適用
                if user_id is not None:
                    query = query.filter(RedactionSettings.user_id == user_id)
                if file_id is not None:
                    query = query.filter(RedactionSettings.file_id == file_id)
                if is_shared is not None:
                    query = query.filter(RedactionSettings.is_shared == is_shared)

                # 総件数を取得
                total_count = query.count()

                # ページネーションを適用
                settings_list = (
                    query.order_by(RedactionSettings.created_at.desc())
                    .offset(offset)
                    .limit(limit)
                    .all()
                )

                # 結果を辞書に変換
                settings_data = [settings.to_dict() for settings in settings_list]

                result = {
                    "settings": settings_data,
                    "total_count": total_count,
                    "limit": limit,
                    "offset": offset,
                }

                # キャッシュに保存
                if self.enable_cache:
                    cache_manager.set(cache_key_str, result, ttl=300)

                return result

        except SQLAlchemyError as e:
            self._handle_database_error(e, "list_redaction_settings")
        except Exception as e:
            logger.error(
                f"予期しないエラーが発生しました (list_redaction_settings): {e}"
            )
            raise RedactionRepositoryError(f"設定リストの取得に失敗しました: {e}")

    # ===========================
    # 高度な操作
    # ===========================

    def get_settings_by_file_id(
        self, file_id: str, user_id: str | None = None
    ) -> list[dict[str, Any]]:
        """
        ファイルIDに基づいて設定を取得

        Args:
            file_id: ファイルID
            user_id: ユーザーID（フィルタ用）

        Returns:
            設定のリスト

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_file_id(file_id)

            if user_id is not None:
                self._validate_user_id(user_id)

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "get_settings_by_file_id")

        try:
            with self.sqlmodel_manager as session:
                query = session.query(RedactionSettings).filter(
                    RedactionSettings.file_id == file_id
                )

                if user_id is not None:
                    query = query.filter(RedactionSettings.user_id == user_id)

                settings_list = query.order_by(
                    RedactionSettings.created_at.desc()
                ).all()
                return [settings.to_dict() for settings in settings_list]

        except SQLAlchemyError as e:
            self._handle_database_error(e, "get_settings_by_file_id")
        except Exception as e:
            logger.error(
                f"予期しないエラーが発生しました (get_settings_by_file_id): {e}"
            )
            raise RedactionRepositoryError(f"設定の取得に失敗しました: {e}")

    def get_shared_settings(
        self, user_id: str, limit: int = 100, offset: int = 0
    ) -> dict[str, Any]:
        """
        共有設定を取得

        Args:
            user_id: ユーザーID
            limit: 取得件数上限
            offset: オフセット

        Returns:
            共有設定リストとメタデータの辞書

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_user_id(user_id)
            self._validate_pagination_params(limit, offset)

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "get_shared_settings")

        try:
            with self.sqlmodel_manager as session:
                # 共有設定を取得（自分が作成したものと、共有されているもの）
                query = session.query(RedactionSettings).filter(
                    or_(
                        and_(
                            RedactionSettings.user_id == user_id,
                            RedactionSettings.is_shared,
                        ),
                        RedactionSettings.id.in_(
                            session.query(RedactionSettingsShare.settings_id).filter(
                                RedactionSettingsShare.shared_with_user_id == user_id
                            )
                        ),
                    )
                )

                # 総件数を取得
                total_count = query.count()

                # ページネーションを適用
                settings_list = (
                    query.order_by(RedactionSettings.created_at.desc())
                    .offset(offset)
                    .limit(limit)
                    .all()
                )

                # 結果を辞書に変換
                settings_data = [settings.to_dict() for settings in settings_list]

                return {
                    "settings": settings_data,
                    "total_count": total_count,
                    "limit": limit,
                    "offset": offset,
                }

        except SQLAlchemyError as e:
            self._handle_database_error(e, "get_shared_settings")
        except Exception as e:
            logger.error(f"予期しないエラーが発生しました (get_shared_settings): {e}")
            raise RedactionRepositoryError(f"共有設定の取得に失敗しました: {e}")

    def export_settings(self, settings_id: int) -> dict[str, Any] | None:
        """
        設定をエクスポート用の形式で取得

        Args:
            settings_id: 設定ID

        Returns:
            エクスポート用の設定辞書、見つからない場合はNone

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_settings_id(settings_id)

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "export_settings")

        try:
            with self.sqlmodel_manager as session:
                redaction_settings = (
                    session.query(RedactionSettings)
                    .filter(RedactionSettings.id == settings_id)
                    .first()
                )

                if redaction_settings is None:
                    return None

                # エクスポート用のデータを構築
                export_data = {
                    "name": redaction_settings.name,
                    "description": redaction_settings.description,
                    "show_all": redaction_settings.show_all,
                    "level_settings": redaction_settings.get_level_settings_dict(),
                    "revealed_items": redaction_settings.get_revealed_items_list(),
                    "is_shared": redaction_settings.is_shared,
                    "created_at": redaction_settings.created_at.isoformat(),
                    "updated_at": redaction_settings.updated_at.isoformat(),
                }

                return export_data

        except SQLAlchemyError as e:
            self._handle_database_error(e, "export_settings")
        except Exception as e:
            logger.error(f"予期しないエラーが発生しました (export_settings): {e}")
            raise RedactionRepositoryError(f"設定のエクスポートに失敗しました: {e}")

    def import_settings(
        self,
        file_id: str,
        user_id: str,
        settings_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        設定をインポート

        Args:
            file_id: ファイルID
            user_id: ユーザーID
            settings_data: インポートする設定データ

        Returns:
            作成された設定の辞書

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            # バリデーション
            self._validate_file_id(file_id)
            self._validate_user_id(user_id)

            if not isinstance(settings_data, dict):
                raise RedactionValidationError(
                    "設定データは辞書形式である必要があります"
                )

        except RedactionValidationError:
            raise
        except Exception as e:
            self._handle_validation_error(e, "import_settings")

        try:
            # インポート用の設定を作成
            return self.create_redaction_settings(
                file_id=file_id,
                user_id=user_id,
                name=settings_data.get("name", "Imported Settings"),
                description=settings_data.get("description", ""),
                show_all=settings_data.get("show_all", False),
                level_settings=settings_data.get("level_settings"),
                revealed_items=settings_data.get("revealed_items"),
                is_shared=settings_data.get("is_shared", False),
            )

        except SQLAlchemyError as e:
            self._handle_database_error(e, "import_settings")
        except Exception as e:
            logger.error(f"予期しないエラーが発生しました (import_settings): {e}")
            raise RedactionRepositoryError(f"設定のインポートに失敗しました: {e}")
