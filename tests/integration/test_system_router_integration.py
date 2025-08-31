"""
システムルーター統合テスト

実際のFastAPIアプリケーションと統合してテスト
ルーティング、エンドポイント、レスポンスの一貫性を確認
"""


class TestSystemRouterIntegration:
    """システムルーター統合テスト"""

    def test_router_inclusion(self, test_client):
        """ルーターが正しく統合されているかのテスト"""
        # 各エンドポイントが存在することを確認
        response = test_client.get("/system/health")
        assert response.status_code == 200

        response = test_client.get("/system/statistics")
        assert response.status_code in [200, 500]  # サービスエラーは500

        response = test_client.post("/system/cleanup")
        assert response.status_code in [200, 500]  # サービスエラーは500

        response = test_client.post("/system/test/reset-db")
        assert response.status_code in [200, 403, 500]  # 環境に依存

    def test_router_prefix_and_tags(self, test_client):
        """ルーターのプレフィックスとタグのテスト"""
        # プレフィックスが正しく適用されているか
        response = test_client.get("/health")
        assert response.status_code == 404  # /systemプレフィックスが必要

        response = test_client.get("/system/health")
        assert response.status_code == 200

    def test_router_response_consistency(self, test_client):
        """ルーターのレスポンス一貫性テスト"""
        # ヘルスチェックの一貫性
        response1 = test_client.get("/system/health")
        response2 = test_client.get("/system/health")

        assert response1.status_code == 200
        assert response2.status_code == 200

        data1 = response1.json()
        data2 = response2.json()

        assert data1["status"] == data2["status"]
        assert data1["version"] == data2["version"]
        # uptimeは時間経過で変わる可能性がある

    def test_router_environment_dependent_endpoints(self, test_client):
        """環境依存エンドポイントのテスト"""
        # テスト環境でのデータベースリセット
        response = test_client.post("/system/test/reset-db")
        # 環境変数によって結果が変わる
        assert response.status_code in [200, 403, 500]

    def test_router_endpoint_availability(self, test_client):
        """エンドポイントの可用性テスト"""
        # 存在するエンドポイント
        response = test_client.get("/system/health")
        assert response.status_code == 200

        # 存在しないエンドポイント
        response = test_client.get("/system/nonexistent")
        assert response.status_code == 404
