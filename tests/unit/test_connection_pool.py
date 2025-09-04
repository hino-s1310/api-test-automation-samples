"""
接続プール設定テスト

SQLAlchemyの接続プール設定の動作確認（ユニットテスト）
"""

import os

import pytest

from src.api.database import SQLModelSessionManager, create_sqlmodel_engine


class TestConnectionPool:
    """接続プールのテストクラス"""

    @pytest.fixture
    def session_manager(self):
        """テスト用のセッションマネージャー"""
        return SQLModelSessionManager()

    def test_pool_configuration_development(self, session_manager):
        """開発環境での接続プール設定をテスト"""
        # 環境変数を開発環境に設定
        os.environ["ENVIRONMENT"] = "development"

        # 新しいエンジンを作成
        engine = create_sqlmodel_engine()

        # プール設定を確認
        assert engine.pool.size() == 10  # 開発環境のプールサイズ
        assert engine.pool._max_overflow == 20  # 最大オーバーフロー
        assert engine.pool._timeout == 30  # タイムアウト
        assert engine.pool._recycle == 3600  # リサイクル時間
        assert engine.pool._pre_ping  # プリピング

    def test_pool_configuration_test(self):
        """テスト環境での接続プール設定をテスト"""
        # 環境変数をテスト環境に設定
        os.environ["ENVIRONMENT"] = "test"

        # 新しいエンジンを作成
        engine = create_sqlmodel_engine()

        # プール設定を確認
        assert engine.pool.size() == 5  # テスト環境のプールサイズ
        assert engine.pool._max_overflow == 10  # 最大オーバーフロー
        assert engine.pool._timeout == 30  # タイムアウト
        assert engine.pool._recycle == 3600  # リサイクル時間
        assert engine.pool._pre_ping  # プリピング

    def test_pool_configuration_production(self):
        """本番環境での接続プール設定をテスト"""
        # 環境変数を本番環境に設定
        os.environ["ENVIRONMENT"] = "production"

        # 新しいエンジンを作成
        engine = create_sqlmodel_engine()

        # プール設定を確認
        assert engine.pool.size() == 20  # 本番環境のプールサイズ
        assert engine.pool._max_overflow == 30  # 最大オーバーフロー
        assert engine.pool._timeout == 30  # タイムアウト
        assert engine.pool._recycle == 3600  # リサイクル時間
        assert engine.pool._pre_ping  # プリピング

    def test_pool_status_monitoring(self, session_manager):
        """接続プールの状態監視をテスト"""
        # プール状態を取得
        pool_status = session_manager.get_pool_status()

        # 必要なキーが存在することを確認
        required_keys = [
            "pool_size",
            "checked_in",
            "checked_out",
            "overflow",
            "total_connections",
            "available_connections",
            "active_connections",
        ]
        for key in required_keys:
            assert key in pool_status
            assert isinstance(pool_status[key], int)

    def test_engine_info(self, session_manager):
        """エンジン情報の取得をテスト"""
        # エンジン情報を取得
        engine_info = session_manager.get_engine_info()

        # 必要なキーが存在することを確認
        required_keys = [
            "url",
            "driver",
            "pool_size",
            "max_overflow",
            "pool_timeout",
            "pool_recycle",
            "pool_pre_ping",
        ]
        for key in required_keys:
            assert key in engine_info

    def test_environment_specific_configuration(self):
        """環境別設定のテスト"""
        environments = ["development", "test", "production"]
        expected_configs = {
            "development": {"pool_size": 10, "max_overflow": 20},
            "test": {"pool_size": 5, "max_overflow": 10},
            "production": {"pool_size": 20, "max_overflow": 30},
        }

        for env in environments:
            # 環境変数を設定
            original_env = os.environ.get("ENVIRONMENT")
            os.environ["ENVIRONMENT"] = env

            try:
                # 新しいエンジンを作成
                engine = create_sqlmodel_engine()

                # 設定を確認
                expected = expected_configs[env]
                assert engine.pool.size() == expected["pool_size"]
                assert engine.pool._max_overflow == expected["max_overflow"]

            finally:
                # 環境変数を元に戻す
                if original_env is not None:
                    os.environ["ENVIRONMENT"] = original_env
                else:
                    os.environ.pop("ENVIRONMENT", None)
