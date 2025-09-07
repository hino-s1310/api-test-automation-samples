"""
機密情報設定サービス

機密情報設定のビジネスロジックを担当
リポジトリ層との連携により、データアクセスロジックを分離
"""

import logging
from typing import Any

from ..repositories.redaction_repository import (
    RedactionDatabaseError,
    RedactionRepository,
    RedactionValidationError,
)

logger = logging.getLogger(__name__)


class RedactionService:
    """機密情報設定サービス"""

    def __init__(self, redaction_repository: RedactionRepository = None):
        """RedactionRepositoryのインスタンスを初期化"""
        self.redaction_repository = redaction_repository or RedactionRepository(
            use_sqlmodel=True, enable_cache=True
        )

    def create_redaction_settings(
        self,
        file_id: str,
        user_id: str,
        name: str,
        description: str = "",
        show_all: bool = False,
        level_settings: dict[str, Any] | None = None,
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
            show_all: 全て表示フラグ
            level_settings: レベル設定
            revealed_items: 表示項目リスト
            is_shared: 共有フラグ

        Returns:
            作成された設定の辞書

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(
                f"機密情報設定を作成中: file_id={file_id}, user_id={user_id}, name={name}"
            )

            result = self.redaction_repository.create_redaction_settings(
                file_id=file_id,
                user_id=user_id,
                name=name,
                description=description,
                show_all=show_all,
                level_settings=level_settings,
                revealed_items=revealed_items,
                is_shared=is_shared,
            )

            logger.info(f"機密情報設定の作成完了: settings_id={result.get('id')}")
            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定の作成中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定の作成に失敗しました: {e}")

    def get_redaction_settings(self, settings_id: int) -> dict[str, Any] | None:
        """
        機密情報設定を取得

        Args:
            settings_id: 設定ID

        Returns:
            設定の辞書、見つからない場合はNone

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(f"機密情報設定を取得中: settings_id={settings_id}")

            result = self.redaction_repository.get_redaction_settings(settings_id)

            if result:
                logger.info(f"機密情報設定の取得完了: settings_id={settings_id}")
            else:
                logger.warning(
                    f"機密情報設定が見つかりません: settings_id={settings_id}"
                )

            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定の取得中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定の取得に失敗しました: {e}")

    def update_redaction_settings(
        self,
        settings_id: int,
        name: str | None = None,
        description: str | None = None,
        show_all: bool | None = None,
        level_settings: dict[str, Any] | None = None,
        revealed_items: list[str] | None = None,
        is_shared: bool | None = None,
    ) -> dict[str, Any] | None:
        """
        機密情報設定を更新

        Args:
            settings_id: 設定ID
            name: 設定名
            description: 説明
            show_all: 全て表示フラグ
            level_settings: レベル設定
            revealed_items: 表示項目リスト
            is_shared: 共有フラグ

        Returns:
            更新された設定の辞書、見つからない場合はNone

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(f"機密情報設定を更新中: settings_id={settings_id}")

            result = self.redaction_repository.update_redaction_settings(
                settings_id=settings_id,
                name=name,
                description=description,
                show_all=show_all,
                level_settings=level_settings,
                revealed_items=revealed_items,
                is_shared=is_shared,
            )

            if result:
                logger.info(f"機密情報設定の更新完了: settings_id={settings_id}")
            else:
                logger.warning(
                    f"機密情報設定が見つかりません: settings_id={settings_id}"
                )

            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定の更新中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定の更新に失敗しました: {e}")

    def delete_redaction_settings(self, settings_id: int) -> bool:
        """
        機密情報設定を削除

        Args:
            settings_id: 設定ID

        Returns:
            削除成功時True、見つからない場合はFalse

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(f"機密情報設定を削除中: settings_id={settings_id}")

            result = self.redaction_repository.delete_redaction_settings(settings_id)

            if result:
                logger.info(f"機密情報設定の削除完了: settings_id={settings_id}")
            else:
                logger.warning(
                    f"機密情報設定が見つかりません: settings_id={settings_id}"
                )

            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定の削除中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定の削除に失敗しました: {e}")

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
            logger.info(
                f"機密情報設定リストを取得中: user_id={user_id}, file_id={file_id}"
            )

            result = self.redaction_repository.list_redaction_settings(
                user_id=user_id,
                file_id=file_id,
                is_shared=is_shared,
                limit=limit,
                offset=offset,
            )

            logger.info(
                f"機密情報設定リストの取得完了: count={result.get('total_count', 0)}"
            )
            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定リストの取得中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定リストの取得に失敗しました: {e}")

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
            logger.info(
                f"ファイルIDによる機密情報設定を取得中: file_id={file_id}, user_id={user_id}"
            )

            result = self.redaction_repository.get_settings_by_file_id(file_id, user_id)

            logger.info(f"ファイルIDによる機密情報設定の取得完了: count={len(result)}")
            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"ファイルIDによる機密情報設定の取得中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定の取得に失敗しました: {e}")

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
            logger.info(f"機密情報設定をエクスポート中: settings_id={settings_id}")

            result = self.redaction_repository.export_settings(settings_id)

            if result:
                logger.info(
                    f"機密情報設定のエクスポート完了: settings_id={settings_id}"
                )
            else:
                logger.warning(
                    f"機密情報設定が見つかりません: settings_id={settings_id}"
                )

            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定のエクスポート中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定のエクスポートに失敗しました: {e}")

    def import_settings(
        self, file_id: str, user_id: str, settings_data: dict[str, Any]
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
            logger.info(
                f"機密情報設定をインポート中: file_id={file_id}, user_id={user_id}"
            )

            # インポート前のバリデーション
            if not self.validate_redaction_settings(settings_data):
                raise RedactionValidationError("インポートする設定データが無効です")

            result = self.redaction_repository.import_settings(
                file_id, user_id, settings_data
            )

            logger.info(f"機密情報設定のインポート完了: settings_id={result.get('id')}")
            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定のインポート中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定のインポートに失敗しました: {e}")

    def validate_redaction_settings(self, settings_data: dict[str, Any]) -> bool:
        """
        機密情報設定のバリデーション

        Args:
            settings_data: バリデーションする設定データ

        Returns:
            バリデーション成功時True、失敗時False
        """
        try:
            # 名前のバリデーション
            name = settings_data.get("name")
            if not name or not isinstance(name, str) or len(name.strip()) == 0:
                logger.warning("設定名が無効です")
                return False

            if len(name) > 255:
                logger.warning("設定名が長すぎます")
                return False

            # 説明のバリデーション
            description = settings_data.get("description", "")
            if not isinstance(description, str):
                logger.warning("説明が無効です")
                return False

            if len(description) > 1000:
                logger.warning("説明が長すぎます")
                return False

            # レベル設定のバリデーション
            level_settings = settings_data.get("level_settings")
            if level_settings is not None:
                if not isinstance(level_settings, dict):
                    logger.warning("レベル設定が無効です")
                    return False

                for level, _value in level_settings.items():
                    if not isinstance(level, str):
                        logger.warning("レベル設定のキーが無効です")
                        return False

            # 表示項目のバリデーション
            revealed_items = settings_data.get("revealed_items")
            if revealed_items is not None:
                if not isinstance(revealed_items, list):
                    logger.warning("表示項目が無効です")
                    return False

                for item in revealed_items:
                    if not isinstance(item, str):
                        logger.warning("表示項目の要素が無効です")
                        return False

            logger.debug("機密情報設定のバリデーション成功")
            return True

        except Exception as e:
            logger.error(f"機密情報設定のバリデーション中にエラー: {e}")
            return False
