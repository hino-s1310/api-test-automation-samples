"""
RedactionRepository

機密情報の赤セルシート機能に関するデータアクセス処理を担当
データベース操作の抽象化とカプセル化
"""

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import joinedload
from sqlmodel import and_, or_

from ..cache import CacheKeys, cache_manager
from ..database import SQLModelSessionManager, db_manager
from ..models import (
    RedactionLevel,
    RedactionSettings,
    RedactionSettingsShare,
)


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
        """
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
        """
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
        """
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

    def delete_redaction_settings(self, settings_id: int) -> bool:
        """
        機密情報設定を削除

        Args:
            settings_id: 設定ID

        Returns:
            削除成功の場合True、見つからない場合はFalse
        """
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
        """
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
        """
        with self.sqlmodel_manager as session:
            query = session.query(RedactionSettings).filter(
                RedactionSettings.file_id == file_id
            )

            if user_id is not None:
                query = query.filter(RedactionSettings.user_id == user_id)

            settings_list = query.order_by(RedactionSettings.created_at.desc()).all()
            return [settings.to_dict() for settings in settings_list]

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
        """
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

    def export_settings(self, settings_id: int) -> dict[str, Any] | None:
        """
        設定をエクスポート用の形式で取得

        Args:
            settings_id: 設定ID

        Returns:
            エクスポート用の設定辞書、見つからない場合はNone
        """
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
        """
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
