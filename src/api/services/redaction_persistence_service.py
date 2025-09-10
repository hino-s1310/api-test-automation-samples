"""
機密情報設定永続化サービス

機密情報設定の永続化とインポート/エクスポート機能を担当
ファイルシステムとの連携により、設定の保存・読み込み・インポート・エクスポートを提供
"""

import json
import logging
from pathlib import Path
from typing import Any

from ..repositories.redaction_repository import (
    RedactionDatabaseError,
    RedactionRepository,
    RedactionValidationError,
)
from .redaction_service import RedactionService

logger = logging.getLogger(__name__)


class RedactionPersistenceService:
    """機密情報設定永続化サービス"""

    def __init__(
        self,
        redaction_repository: RedactionRepository = None,
        redaction_service: RedactionService = None,
    ):
        """RedactionRepositoryとRedactionServiceのインスタンスを初期化"""
        self.redaction_repository = redaction_repository or RedactionRepository(
            use_sqlmodel=True, enable_cache=True
        )
        self.redaction_service = redaction_service or RedactionService(
            redaction_repository=self.redaction_repository
        )

    def save_settings(
        self,
        file_id: str,
        user_id: str,
        settings_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        機密情報設定を保存

        Args:
            file_id: ファイルID
            user_id: ユーザーID
            settings_data: 保存する設定データ

        Returns:
            保存された設定の辞書

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(f"機密情報設定を保存中: file_id={file_id}, user_id={user_id}")

            # 設定データのバリデーション
            if not self.validate_settings_data(settings_data):
                raise RedactionValidationError("設定データが無効です")

            result = self.redaction_service.create_redaction_settings(
                file_id=file_id,
                user_id=user_id,
                name=settings_data["name"],
                description=settings_data.get("description", ""),
                show_all=settings_data.get("show_all", False),
                level_settings=settings_data.get("level_settings"),
                revealed_items=settings_data.get("revealed_items"),
                is_shared=settings_data.get("is_shared", False),
            )

            logger.info(f"機密情報設定の保存完了: settings_id={result.get('id')}")
            return result

        except RedactionValidationError:
            raise
        except RedactionDatabaseError:
            raise
        except Exception as e:
            logger.error(f"機密情報設定の保存中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定の保存に失敗しました: {e}")

    def load_settings(self, settings_id: int) -> dict[str, Any] | None:
        """
        機密情報設定を読み込み

        Args:
            settings_id: 設定ID

        Returns:
            設定の辞書、見つからない場合はNone

        Raises:
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(f"機密情報設定を読み込み中: settings_id={settings_id}")

            result = self.redaction_service.get_redaction_settings(settings_id)

            if result:
                logger.info(f"機密情報設定の読み込み完了: settings_id={settings_id}")
            else:
                logger.warning(
                    f"機密情報設定が見つかりません: settings_id={settings_id}"
                )

            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定の読み込み中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定の読み込みに失敗しました: {e}")

    def delete_settings(self, settings_id: int) -> bool:
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

            result = self.redaction_service.delete_redaction_settings(settings_id)

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

    def export_settings_to_file(self, settings_id: int, file_path: Path | str) -> str:
        """
        設定をファイルにエクスポート

        Args:
            settings_id: 設定ID
            file_path: エクスポート先のファイルパス

        Returns:
            エクスポートされたファイルのパス

        Raises:
            ValueError: 設定が見つからない場合
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(
                f"機密情報設定をファイルにエクスポート中: settings_id={settings_id}, file_path={file_path}"
            )

            # 設定データを取得
            export_data = self.redaction_service.export_settings(settings_id)
            if export_data is None:
                raise ValueError("設定が見つかりません")

            # ファイルパスをPathオブジェクトに変換
            file_path = Path(file_path)

            # ディレクトリが存在しない場合は作成
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # JSONファイルとして保存
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)

            logger.info(
                f"機密情報設定のファイルエクスポート完了: file_path={file_path}"
            )
            return str(file_path)

        except ValueError:
            raise
        except RedactionValidationError:
            raise
        except RedactionDatabaseError:
            raise
        except Exception as e:
            logger.error(f"機密情報設定のファイルエクスポート中に予期しないエラー: {e}")
            raise RedactionDatabaseError(
                f"設定のファイルエクスポートに失敗しました: {e}"
            )

    def import_settings_from_file(
        self, file_id: str, user_id: str, file_path: Path | str
    ) -> dict[str, Any]:
        """
        設定をファイルからインポート

        Args:
            file_id: ファイルID
            user_id: ユーザーID
            file_path: インポート元のファイルパス

        Returns:
            作成された設定の辞書

        Raises:
            FileNotFoundError: ファイルが見つからない場合
            ValueError: 無効なJSONファイルの場合
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(
                f"機密情報設定をファイルからインポート中: file_id={file_id}, user_id={user_id}, file_path={file_path}"
            )

            # ファイルパスをPathオブジェクトに変換
            file_path = Path(file_path)

            # ファイルの存在確認
            if not file_path.exists():
                raise FileNotFoundError(f"ファイルが見つかりません: {file_path}")

            # JSONファイルを読み込み
            with open(file_path, encoding="utf-8") as f:
                try:
                    import_data = json.load(f)
                except json.JSONDecodeError as e:
                    raise ValueError(f"無効なJSONファイルです: {e}")

            # 設定データのバリデーション
            if not self.validate_settings_data(import_data):
                raise RedactionValidationError("インポートする設定データが無効です")

            # 設定をインポート
            result = self.redaction_service.import_settings(
                file_id, user_id, import_data
            )

            logger.info(
                f"機密情報設定のファイルインポート完了: settings_id={result.get('id')}"
            )
            return result

        except (
            FileNotFoundError,
            ValueError,
            RedactionValidationError,
            RedactionDatabaseError,
        ):
            raise
        except Exception as e:
            logger.error(f"機密情報設定のファイルインポート中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定のファイルインポートに失敗しました: {e}")

    def export_settings_to_json(self, settings_id: int) -> str:
        """
        設定をJSON文字列としてエクスポート

        Args:
            settings_id: 設定ID

        Returns:
            JSON文字列

        Raises:
            ValueError: 設定が見つからない場合
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(
                f"機密情報設定をJSONとしてエクスポート中: settings_id={settings_id}"
            )

            # 設定データを取得
            export_data = self.redaction_service.export_settings(settings_id)
            if export_data is None:
                raise ValueError("設定が見つかりません")

            # JSON文字列として返す
            json_string = json.dumps(export_data, ensure_ascii=False, indent=2)

            logger.info(
                f"機密情報設定のJSONエクスポート完了: settings_id={settings_id}"
            )
            return json_string

        except ValueError:
            raise
        except RedactionValidationError:
            raise
        except RedactionDatabaseError:
            raise
        except Exception as e:
            logger.error(f"機密情報設定のJSONエクスポート中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定のJSONエクスポートに失敗しました: {e}")

    def import_settings_from_json(
        self, file_id: str, user_id: str, json_data: str
    ) -> dict[str, Any]:
        """
        設定をJSON文字列からインポート

        Args:
            file_id: ファイルID
            user_id: ユーザーID
            json_data: JSON文字列

        Returns:
            作成された設定の辞書

        Raises:
            ValueError: 無効なJSONデータの場合
            RedactionValidationError: バリデーションエラー
            RedactionDatabaseError: データベースエラー
        """
        try:
            logger.info(
                f"機密情報設定をJSONからインポート中: file_id={file_id}, user_id={user_id}"
            )

            # JSON文字列をパース
            try:
                import_data = json.loads(json_data)
            except json.JSONDecodeError as e:
                raise ValueError(f"無効なJSONデータです: {e}")

            # 設定データのバリデーション
            if not self.validate_settings_data(import_data):
                raise RedactionValidationError("インポートする設定データが無効です")

            # 設定をインポート
            result = self.redaction_service.import_settings(
                file_id, user_id, import_data
            )

            logger.info(
                f"機密情報設定のJSONインポート完了: settings_id={result.get('id')}"
            )
            return result

        except (ValueError, RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"機密情報設定のJSONインポート中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定のJSONインポートに失敗しました: {e}")

    def validate_settings_data(self, settings_data: dict[str, Any]) -> bool:
        """
        設定データのバリデーション

        Args:
            settings_data: バリデーションする設定データ

        Returns:
            バリデーション成功時True、失敗時False
        """
        try:
            # 必須フィールドのチェック
            if "name" not in settings_data:
                logger.warning("設定名が不足しています")
                return False

            # 名前のバリデーション
            name = settings_data["name"]
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

            logger.debug("設定データのバリデーション成功")
            return True

        except Exception as e:
            logger.error(f"設定データのバリデーション中にエラー: {e}")
            return False

    def get_settings_list(
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

            result = self.redaction_service.list_redaction_settings(
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

            result = self.redaction_service.get_settings_by_file_id(file_id, user_id)

            logger.info(f"ファイルIDによる機密情報設定の取得完了: count={len(result)}")
            return result

        except (RedactionValidationError, RedactionDatabaseError):
            raise
        except Exception as e:
            logger.error(f"ファイルIDによる機密情報設定の取得中に予期しないエラー: {e}")
            raise RedactionDatabaseError(f"設定の取得に失敗しました: {e}")
