"""
キャッシュ管理

頻繁にアクセスされるデータのキャッシュ機能を提供
"""

import time
from threading import Lock
from typing import Any


class CacheManager:
    """シンプルなメモリキャッシュ管理クラス"""

    def __init__(self, default_ttl: int = 300):  # デフォルト5分
        self._cache: dict[str, dict[str, Any]] = {}
        self._lock = Lock()
        self.default_ttl = default_ttl

    def get(self, key: str) -> Any | None:
        """キャッシュから値を取得"""
        with self._lock:
            if key not in self._cache:
                return None

            cache_entry = self._cache[key]

            # TTLチェック
            if time.time() > cache_entry["expires_at"]:
                del self._cache[key]
                return None

            return cache_entry["value"]

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """キャッシュに値を設定"""
        if ttl is None:
            ttl = self.default_ttl

        with self._lock:
            self._cache[key] = {
                "value": value,
                "expires_at": time.time() + ttl,
                "created_at": time.time(),
            }

    def delete(self, key: str) -> bool:
        """キャッシュから値を削除"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        """全キャッシュをクリア"""
        with self._lock:
            self._cache.clear()

    def invalidate_pattern(self, pattern: str) -> int:
        """パターンに一致するキーを無効化"""
        import re

        deleted_count = 0

        with self._lock:
            keys_to_delete = []
            for key in self._cache.keys():
                if re.match(pattern, key):
                    keys_to_delete.append(key)

            for key in keys_to_delete:
                del self._cache[key]
                deleted_count += 1

        return deleted_count

    def get_stats(self) -> dict[str, Any]:
        """キャッシュ統計情報を取得"""
        with self._lock:
            current_time = time.time()
            active_entries = 0
            expired_entries = 0

            # 期限切れのエントリを削除しながらカウント
            keys_to_delete = []
            for key, entry in self._cache.items():
                if current_time > entry["expires_at"]:
                    expired_entries += 1
                    keys_to_delete.append(key)
                else:
                    active_entries += 1

            # 期限切れのエントリを削除
            for key in keys_to_delete:
                del self._cache[key]

            return {
                "total_entries": len(self._cache),
                "active_entries": active_entries,
                "expired_entries": 0,  # 削除したので0
                "cache_size_mb": self._estimate_memory_usage(),
            }

    def _estimate_memory_usage(self) -> float:
        """メモリ使用量を推定（MB）"""
        import sys

        total_size = 0
        for entry in self._cache.values():
            total_size += sys.getsizeof(entry["value"])
            total_size += sys.getsizeof(entry)
        return round(total_size / (1024 * 1024), 2)

    def cleanup_expired(self) -> int:
        """期限切れのエントリをクリーンアップ"""
        current_time = time.time()
        expired_keys = []

        with self._lock:
            for key, entry in self._cache.items():
                if current_time > entry["expires_at"]:
                    expired_keys.append(key)

            for key in expired_keys:
                del self._cache[key]

        return len(expired_keys)


# グローバルキャッシュインスタンス
cache_manager = CacheManager(default_ttl=300)  # 5分のデフォルトTTL


def get_cache_manager() -> CacheManager:
    """キャッシュマネージャーを取得"""
    return cache_manager


def cache_key(prefix: str, *args) -> str:
    """キャッシュキーを生成"""
    return f"{prefix}:{':'.join(str(arg) for arg in args)}"


# キャッシュキー定数
class CacheKeys:
    """キャッシュキーの定数定義"""

    # ファイル統計情報
    FILE_STATISTICS = "file_statistics"

    # 変換統計情報
    CONVERSION_STATISTICS = "conversion_statistics"

    # ファイル一覧（ページネーション付き）
    FILE_LIST = "file_list"

    # ファイル詳細
    FILE_DETAIL = "file_detail"

    # 変換ログ
    CONVERSION_LOGS = "conversion_logs"

    # 機密情報設定
    REDACTION_SETTINGS_DETAIL = "redaction_settings_detail"
    REDACTION_SETTINGS_LIST = "redaction_settings_list"

    @staticmethod
    def file_list(page: int, per_page: int, status: str | None = None) -> str:
        """ファイル一覧のキャッシュキー"""
        if status:
            return (
                f"{CacheKeys.FILE_LIST}:page:{page}:per_page:{per_page}:status:{status}"
            )
        return f"{CacheKeys.FILE_LIST}:page:{page}:per_page:{per_page}"

    @staticmethod
    def file_detail(file_id: str) -> str:
        """ファイル詳細のキャッシュキー"""
        return f"{CacheKeys.FILE_DETAIL}:{file_id}"

    @staticmethod
    def conversion_logs(file_id: str) -> str:
        """変換ログのキャッシュキー"""
        return f"{CacheKeys.CONVERSION_LOGS}:{file_id}"

    @staticmethod
    def redaction_settings_detail(settings_id: int) -> str:
        """機密情報設定詳細のキャッシュキー"""
        return f"{CacheKeys.REDACTION_SETTINGS_DETAIL}:{settings_id}"

    @staticmethod
    def redaction_settings_list(
        user_id: str | None = None,
        file_id: str | None = None,
        is_shared: bool | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> str:
        """機密情報設定一覧のキャッシュキー"""
        key_parts = [CacheKeys.REDACTION_SETTINGS_LIST]

        if user_id:
            key_parts.append(f"user:{user_id}")
        if file_id:
            key_parts.append(f"file:{file_id}")
        if is_shared is not None:
            key_parts.append(f"shared:{is_shared}")

        key_parts.extend([f"limit:{limit}", f"offset:{offset}"])

        return ":".join(key_parts)
