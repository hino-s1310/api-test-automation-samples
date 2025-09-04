"""
キャッシュ機能のテスト

キャッシュ管理機能の動作確認
"""

import time

import pytest

from src.api.cache import CacheKeys, CacheManager, cache_manager


class TestCacheManager:
    """キャッシュマネージャーのテストクラス"""

    @pytest.fixture
    def cache(self):
        """テスト用のキャッシュマネージャー"""
        return CacheManager(default_ttl=1)  # 1秒のTTL

    def test_cache_set_and_get(self, cache):
        """キャッシュの設定と取得をテスト"""
        # 値を設定
        cache.set("test_key", "test_value")

        # 値を取得
        result = cache.get("test_key")
        assert result == "test_value"

    def test_cache_expiration(self, cache):
        """キャッシュの期限切れをテスト"""
        # 値を設定（1秒のTTL）
        cache.set("test_key", "test_value", ttl=1)

        # 即座に取得（有効）
        result = cache.get("test_key")
        assert result == "test_value"

        # 1秒待機
        time.sleep(1.1)

        # 期限切れ後は取得できない
        result = cache.get("test_key")
        assert result is None

    def test_cache_delete(self, cache):
        """キャッシュの削除をテスト"""
        # 値を設定
        cache.set("test_key", "test_value")

        # 値を取得（存在する）
        result = cache.get("test_key")
        assert result == "test_value"

        # 値を削除
        deleted = cache.delete("test_key")
        assert deleted is True

        # 削除後は取得できない
        result = cache.get("test_key")
        assert result is None

    def test_cache_clear(self, cache):
        """全キャッシュのクリアをテスト"""
        # 複数の値を設定
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        # 全クリア
        cache.clear()

        # 全ての値が削除されている
        assert cache.get("key1") is None
        assert cache.get("key2") is None
        assert cache.get("key3") is None

    def test_cache_pattern_invalidation(self, cache):
        """パターンによるキャッシュ無効化をテスト"""
        # 複数の値を設定
        cache.set("file:1", "value1")
        cache.set("file:2", "value2")
        cache.set("user:1", "value3")
        cache.set("file:3", "value4")

        # file:* パターンで無効化
        deleted_count = cache.invalidate_pattern("file:.*")
        assert deleted_count == 3

        # file:* の値は削除されている
        assert cache.get("file:1") is None
        assert cache.get("file:2") is None
        assert cache.get("file:3") is None

        # user:* の値は残っている
        assert cache.get("user:1") == "value3"

    def test_cache_stats(self, cache):
        """キャッシュ統計情報をテスト"""
        # 初期状態
        stats = cache.get_stats()
        assert stats["total_entries"] == 0
        assert stats["active_entries"] == 0
        assert stats["expired_entries"] == 0

        # 値を設定
        cache.set("key1", "value1", ttl=10)  # 10秒のTTL
        cache.set("key2", "value2", ttl=1)  # 1秒のTTL

        # 統計情報を確認
        stats = cache.get_stats()
        assert stats["total_entries"] == 2
        assert stats["active_entries"] == 2
        assert stats["expired_entries"] == 0

        # 1秒待機して期限切れ
        time.sleep(1.1)

        # 期限切れ後の統計情報（期限切れのエントリは自動的に削除される）
        stats = cache.get_stats()
        assert stats["total_entries"] == 1  # key1のみ有効
        assert stats["active_entries"] == 1  # key1のみ有効
        assert stats["expired_entries"] == 0  # 期限切れは自動削除される

    def test_cache_cleanup_expired(self, cache):
        """期限切れキャッシュのクリーンアップをテスト"""
        # 有効な値と期限切れの値を設定
        cache.set("key1", "value1", ttl=10)  # 有効
        cache.set("key2", "value2", ttl=1)  # 期限切れ予定

        # 1秒待機
        time.sleep(1.1)

        # クリーンアップ実行
        cleaned_count = cache.cleanup_expired()
        assert cleaned_count == 1

        # 有効な値は残っている
        assert cache.get("key1") == "value1"
        # 期限切れの値は削除されている
        assert cache.get("key2") is None

    def test_cache_keys_generation(self):
        """キャッシュキーの生成をテスト"""
        # ファイル一覧のキー
        key1 = CacheKeys.file_list(1, 10)
        assert key1 == "file_list:page:1:per_page:10"

        key2 = CacheKeys.file_list(2, 20, "completed")
        assert key2 == "file_list:page:2:per_page:20:status:completed"

        # ファイル詳細のキー
        key3 = CacheKeys.file_detail("file123")
        assert key3 == "file_detail:file123"

        # 変換ログのキー
        key4 = CacheKeys.conversion_logs("file123")
        assert key4 == "conversion_logs:file123"

    def test_global_cache_manager(self):
        """グローバルキャッシュマネージャーのテスト"""
        # グローバルインスタンスを使用
        cache_manager.set("global_key", "global_value")
        result = cache_manager.get("global_key")
        assert result == "global_value"

        # クリーンアップ
        cache_manager.clear()
        result = cache_manager.get("global_key")
        assert result is None
