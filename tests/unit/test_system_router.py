"""
システムルーターのユニットテスト

routers/system.pyの各エンドポイントの機能適合性をテスト
"""

import os
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routers.system import router


class TestSystemRouter:
    """システムルーターのテストクラス"""

    @pytest.fixture
    def system_router_client(self):
        """システムルーター専用のテストクライアント"""
        app = FastAPI()
        app.include_router(router)
        return TestClient(app)

    @pytest.fixture
    def mock_file_service(self):
        """FileServiceのモック"""
        with patch("src.api.routers.system.file_service") as mock_service:
            yield mock_service

    @pytest.fixture
    def mock_db_manager(self):
        """db_managerのモック"""
        with patch("src.api.routers.system.db_manager") as mock_db:
            yield mock_db

    @pytest.fixture
    def mock_time(self):
        """timeモジュールのモック"""
        with patch("src.api.routers.system.time") as mock_time:
            yield mock_time

    @pytest.fixture
    def sample_statistics_data(self):
        """テスト用統計データ"""
        return {
            "total_files": 10,
            "completed_files": 8,
            "processing_files": 1,
            "failed_files": 1,
            "total_size": 1024000,
            "average_processing_time": 2.5,
        }

    @pytest.fixture
    def sample_cleanup_result(self):
        """テスト用クリーンアップ結果"""
        return {
            "success": True,
            "deleted_count": 5,
            "total_old_files": 5,
        }

    @pytest.fixture
    def sample_health_response(self):
        """テスト用ヘルスレスポンス"""
        return {
            "status": "healthy",
            "version": "1.0.0",
            "uptime": 123.45,
        }


class TestHealthCheck(TestSystemRouter):
    """ヘルスチェックエンドポイントのテスト"""

    def test_health_check_success(self, system_router_client, mock_time):
        """ヘルスチェック成功のテスト"""
        # モック設定
        mock_time.time.return_value = 100.0
        with patch("src.api.routers.system.start_time", 0.0):
            response = system_router_client.get("/system/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert data["uptime"] == 100.0

    def test_health_check_uptime_calculation(self, system_router_client, mock_time):
        """アップタイム計算の正確性テスト"""
        # モック設定
        mock_time.time.return_value = 150.5
        with patch("src.api.routers.system.start_time", 50.0):
            response = system_router_client.get("/system/health")

        assert response.status_code == 200
        data = response.json()
        assert data["uptime"] == 100.5

    def test_health_check_response_structure(self, system_router_client):
        """ヘルスチェックレスポンス構造のテスト"""
        response = system_router_client.get("/system/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "uptime" in data
        assert isinstance(data["status"], str)
        assert isinstance(data["version"], str)
        assert isinstance(data["uptime"], int | float)


class TestGetStatistics(TestSystemRouter):
    """統計情報取得エンドポイントのテスト"""

    def test_get_statistics_success(
        self, system_router_client, mock_file_service, sample_statistics_data
    ):
        """統計情報取得成功のテスト"""
        # モック設定
        mock_file_service.get_file_statistics.return_value = sample_statistics_data

        response = system_router_client.get("/system/statistics")

        assert response.status_code == 200
        data = response.json()
        assert data == sample_statistics_data
        mock_file_service.get_file_statistics.assert_called_once()

    def test_get_statistics_service_error(
        self, system_router_client, mock_file_service
    ):
        """統計情報取得でサービスエラーが発生した場合のテスト"""
        # モック設定
        mock_file_service.get_file_statistics.return_value = {
            "error": "Database connection failed"
        }

        response = system_router_client.get("/system/statistics")

        assert response.status_code == 500
        data = response.json()
        assert "統計情報の取得に失敗しました" in data["detail"]
        assert "Database connection failed" in data["detail"]

    def test_get_statistics_response_structure(
        self, system_router_client, mock_file_service
    ):
        """統計情報レスポンス構造のテスト"""
        # モック設定
        mock_file_service.get_file_statistics.return_value = {
            "total_files": 0,
            "completed_files": 0,
            "processing_files": 0,
            "failed_files": 0,
            "total_size": 0,
            "average_processing_time": 0.0,
        }

        response = system_router_client.get("/system/statistics")

        assert response.status_code == 200
        data = response.json()
        assert "total_files" in data
        assert "completed_files" in data
        assert "processing_files" in data
        assert "failed_files" in data
        assert "total_size" in data
        assert "average_processing_time" in data


class TestCleanupOldFiles(TestSystemRouter):
    """古いファイルクリーンアップエンドポイントのテスト"""

    def test_cleanup_old_files_success(
        self, system_router_client, mock_file_service, sample_cleanup_result
    ):
        """クリーンアップ成功のテスト"""
        # モック設定
        mock_file_service.cleanup_old_files.return_value = sample_cleanup_result

        response = system_router_client.post("/system/cleanup?days=30")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "30日より古いファイルのクリーンアップが完了しました"
        assert data["deleted_count"] == 5
        assert data["total_old_files"] == 5
        mock_file_service.cleanup_old_files.assert_called_once_with(30)

    def test_cleanup_old_files_custom_days(
        self, system_router_client, mock_file_service
    ):
        """カスタム日数でのクリーンアップテスト"""
        # モック設定
        mock_file_service.cleanup_old_files.return_value = {
            "success": True,
            "deleted_count": 3,
            "total_old_files": 3,
        }

        response = system_router_client.post("/system/cleanup?days=7")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "7日より古いファイルのクリーンアップが完了しました"
        assert data["deleted_count"] == 3
        assert data["total_old_files"] == 3
        mock_file_service.cleanup_old_files.assert_called_once_with(7)

    def test_cleanup_old_files_service_error(
        self, system_router_client, mock_file_service
    ):
        """クリーンアップでサービスエラーが発生した場合のテスト"""
        # モック設定
        mock_file_service.cleanup_old_files.return_value = {
            "success": False,
            "error": "Permission denied",
        }

        response = system_router_client.post("/system/cleanup?days=30")

        assert response.status_code == 500
        data = response.json()
        assert "クリーンアップに失敗しました" in data["detail"]
        assert "Permission denied" in data["detail"]

    def test_cleanup_old_files_validation(self, system_router_client):
        """クリーンアップパラメータのバリデーションテスト"""
        # 最小値未満
        response = system_router_client.post("/system/cleanup?days=0")
        assert response.status_code == 422

        # 最大値超過
        response = system_router_client.post("/system/cleanup?days=366")
        assert response.status_code == 422

        # 有効な範囲
        response = system_router_client.post("/system/cleanup?days=1")
        assert response.status_code in [200, 500]  # サービスエラーは500

        response = system_router_client.post("/system/cleanup?days=365")
        assert response.status_code in [200, 500]  # サービスエラーは500

    def test_cleanup_old_files_default_days(
        self, system_router_client, mock_file_service
    ):
        """デフォルト日数（30日）でのクリーンアップテスト"""
        # モック設定
        mock_file_service.cleanup_old_files.return_value = {
            "success": True,
            "deleted_count": 0,
            "total_old_files": 0,
        }

        response = system_router_client.post("/system/cleanup")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "30日より古いファイルのクリーンアップが完了しました"
        mock_file_service.cleanup_old_files.assert_called_once_with(30)


class TestResetTestDatabase(TestSystemRouter):
    """テストデータベースリセットエンドポイントのテスト"""

    def test_reset_test_database_success(self, system_router_client, mock_db_manager):
        """テストデータベースリセット成功のテスト（テスト環境）"""
        # モック設定
        with patch.dict(os.environ, {"ENVIRONMENT": "test"}):
            mock_db_manager.clear_all_data.return_value = True

            response = system_router_client.post("/system/test/reset-db")

            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "テストデータベースがリセットされました"
            mock_db_manager.clear_all_data.assert_called_once()

    def test_reset_test_database_not_test_environment(self, system_router_client):
        """テスト環境以外でのデータベースリセット拒否テスト"""
        # モック設定
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            response = system_router_client.post("/system/test/reset-db")

            assert response.status_code == 403
            data = response.json()
            assert "この操作はテスト環境でのみ利用可能です" in data["detail"]

    def test_reset_test_database_no_environment_variable(self, system_router_client):
        """環境変数が設定されていない場合のテスト"""
        # モック設定
        with patch.dict(os.environ, {}, clear=True):
            response = system_router_client.post("/system/test/reset-db")

            assert response.status_code == 403
            data = response.json()
            assert "この操作はテスト環境でのみ利用可能です" in data["detail"]

    def test_reset_test_database_db_error(self, system_router_client, mock_db_manager):
        """データベースリセットでエラーが発生した場合のテスト"""
        # モック設定
        with patch.dict(os.environ, {"ENVIRONMENT": "test"}):
            mock_db_manager.clear_all_data.return_value = False

            response = system_router_client.post("/system/test/reset-db")

            assert response.status_code == 500
            data = response.json()
            assert "データベースのリセットに失敗しました" in data["detail"]


class TestSystemRouterIntegration(TestSystemRouter):
    """システムルーター統合テスト"""

    def test_router_inclusion(self, system_router_client):
        """ルーターが正しく統合されているかのテスト"""
        # 各エンドポイントが存在することを確認
        response = system_router_client.get("/system/health")
        assert response.status_code == 200

        response = system_router_client.get("/system/statistics")
        assert response.status_code in [200, 500]  # サービスエラーは500

        response = system_router_client.post("/system/cleanup")
        assert response.status_code in [200, 500]  # サービスエラーは500

        response = system_router_client.post("/system/test/reset-db")
        assert response.status_code in [200, 403, 500]  # 環境に依存

    def test_router_prefix_and_tags(self, system_router_client):
        """ルーターのプレフィックスとタグのテスト"""
        # プレフィックスが正しく適用されているか
        response = system_router_client.get("/health")
        assert response.status_code == 404  # /systemプレフィックスが必要

        response = system_router_client.get("/system/health")
        assert response.status_code == 200

    def test_router_response_consistency(self, system_router_client):
        """ルーターのレスポンス一貫性テスト"""
        # ヘルスチェックの一貫性
        response1 = system_router_client.get("/system/health")
        response2 = system_router_client.get("/system/health")

        assert response1.status_code == 200
        assert response2.status_code == 200

        data1 = response1.json()
        data2 = response2.json()

        assert data1["status"] == data2["status"]
        assert data1["version"] == data2["version"]
        # uptimeは時間経過で変わる可能性がある


class TestSystemRouterParameterized(TestSystemRouter):
    """システムルーターパラメータ化テスト"""

    @pytest.mark.parametrize(
        "days,expected_status",
        [
            (1, 200),  # 最小値
            (30, 200),  # デフォルト値
            (365, 200),  # 最大値
            (0, 422),  # 最小値未満
            (366, 422),  # 最大値超過
        ],
    )
    def test_cleanup_days_parameter_validation(
        self, system_router_client, mock_file_service, days, expected_status
    ):
        """クリーンアップ日数パラメータのバリデーションテスト"""
        if expected_status == 200:
            # 成功ケースのモック設定
            mock_file_service.cleanup_old_files.return_value = {
                "success": True,
                "deleted_count": 0,
                "total_old_files": 0,
            }

        response = system_router_client.post(f"/system/cleanup?days={days}")
        assert response.status_code == expected_status

    @pytest.mark.parametrize(
        "environment,expected_status",
        [
            ("test", 200),  # テスト環境
            ("development", 403),  # 開発環境
            ("production", 403),  # 本番環境
            ("", 403),  # 環境変数未設定
        ],
    )
    def test_reset_db_environment_validation(
        self, system_router_client, mock_db_manager, environment, expected_status
    ):
        """データベースリセットの環境変数バリデーションテスト"""
        if expected_status == 200:
            # 成功ケースのモック設定
            mock_db_manager.clear_all_data.return_value = True

        with patch.dict(os.environ, {"ENVIRONMENT": environment}):
            response = system_router_client.post("/system/test/reset-db")
            assert response.status_code == expected_status


class TestSystemRouterErrorHandling(TestSystemRouter):
    """システムルーターエラーハンドリングテスト"""

    def test_service_methods_exception_handling(
        self, system_router_client, mock_file_service
    ):
        """サービスメソッドの例外ハンドリングテスト"""
        # 統計情報取得で例外発生
        mock_file_service.get_file_statistics.side_effect = Exception("Service error")

        # 例外が発生することを確認
        with pytest.raises(Exception, match="Service error"):
            system_router_client.get("/system/statistics")

        # クリーンアップで例外発生
        mock_file_service.cleanup_old_files.side_effect = Exception("Service error")

        # 例外が発生することを確認
        with pytest.raises(Exception, match="Service error"):
            system_router_client.post("/system/cleanup")

    def test_database_manager_exception_handling(
        self, system_router_client, mock_db_manager
    ):
        """データベースマネージャーの例外ハンドリングテスト"""
        with patch.dict(os.environ, {"ENVIRONMENT": "test"}):
            # データベースリセットで例外発生
            mock_db_manager.clear_all_data.side_effect = Exception("DB error")

            # 例外が発生することを確認
            with pytest.raises(Exception, match="DB error"):
                system_router_client.post("/system/test/reset-db")

    def test_router_initialization(self):
        """ルーター初期化のテスト"""
        # ルーターが正しく作成されているか
        assert router.prefix == "/system"
        assert "System" in router.tags

        # ルーターにエンドポイントが登録されているか
        routes = [route.path for route in router.routes]
        assert "/system/health" in routes
        assert "/system/statistics" in routes
        assert "/system/cleanup" in routes
        assert "/system/test/reset-db" in routes
