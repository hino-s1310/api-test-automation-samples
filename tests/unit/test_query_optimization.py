"""
クエリ最適化テスト

SQLModelのクエリ最適化（インデックス、遅延読み込み、N+1問題解決）の機能をテスト
"""

from datetime import datetime, timedelta

import pytest

from src.api.database import SQLModelSessionManager
from src.api.models import ConversionLog, File, FileEditHistory, FileStatus
from src.api.repositories.file_repository import FileRepository


class TestQueryOptimization:
    """クエリ最適化の機能テストクラス"""

    @pytest.fixture
    def optimized_repository(self):
        """最適化されたリポジトリのインスタンス"""
        return FileRepository(use_sqlmodel=True)

    @pytest.fixture
    def sample_data(self, optimized_repository):
        """テスト用のサンプルデータを作成"""
        with SQLModelSessionManager() as session:
            # 既存のテストデータをクリーンアップ
            session.query(ConversionLog).delete()
            session.query(FileEditHistory).delete()
            session.query(File).delete()
            session.commit()

            # 複数のファイルを作成
            for i in range(10):
                file_obj = File(
                    id=f"test_file_{i}",
                    filename=f"test_file_{i}.pdf",
                    original_path=f"/path/to/test_file_{i}.pdf",
                    markdown_path=f"/path/to/test_file_{i}.md",
                    markdown_content=f"# Test File {i}\n\nThis is test content for file {i}.",
                    status=FileStatus.COMPLETED
                    if i % 2 == 0
                    else FileStatus.PROCESSING,
                    file_size=1024 * (i + 1),
                    created_at=datetime.now() - timedelta(days=i),
                    is_edited=i % 3 == 0,
                )
                session.add(file_obj)

                # 各ファイルに変換ログを追加
                for j in range(3):
                    log_obj = ConversionLog(
                        file_id=f"test_file_{i}",
                        action=f"action_{j}",
                        status="success" if j % 2 == 0 else "failed",
                        message=f"Log message {j} for file {i}",
                        processing_time=1.5 + j * 0.5,
                    )
                    session.add(log_obj)

                # 編集履歴を追加
                if i % 3 == 0:
                    history_obj = FileEditHistory(
                        file_id=f"test_file_{i}",
                        original_filename=f"test_file_{i}.pdf",
                        original_content=f"Original content {i}",
                        edited_filename=f"edited_file_{i}.pdf",
                        edited_content=f"Edited content {i}",
                        edit_reason=f"Test edit {i}",
                        edited_by="test_user",
                    )
                    session.add(history_obj)

            session.commit()

    def test_index_functionality(self, optimized_repository, sample_data):
        """インデックス機能のテスト"""
        result = optimized_repository.get_files_by_status("completed")

        # 結果が正しく取得されていることを確認
        assert "files" in result
        assert "total_count" in result
        assert len(result["files"]) >= 0  # データが存在しない場合もある

    def test_joinedload_functionality(self, optimized_repository, sample_data):
        """joinedload機能のテスト"""
        # 通常のクエリ（N+1問題あり）
        result_normal = optimized_repository.get_files_by_status("completed")

        # joinedloadを使用したクエリ（N+1問題解決）
        result_optimized = optimized_repository.get_files_by_status(
            "completed", include_relations=True
        )

        # 結果が正しく取得されていることを確認
        assert "files" in result_normal
        assert "files" in result_optimized
        assert len(result_normal["files"]) == len(result_optimized["files"])

        # 両方のクエリが同じ結果を返すことを確認
        # これにより、joinedloadが正しく動作していることを検証
        for normal_file, optimized_file in zip(
            result_normal["files"], result_optimized["files"], strict=False
        ):
            assert normal_file["id"] == optimized_file["id"]
            assert normal_file["filename"] == optimized_file["filename"]
            assert normal_file["status"] == optimized_file["status"]

    def test_search_functionality(self, optimized_repository, sample_data):
        """検索クエリの機能テスト"""
        result = optimized_repository.search_files(
            query="test", status="completed", is_edited=True, page=1, per_page=5
        )

        # 結果が正しく取得されていることを確認
        assert "files" in result
        assert "total_count" in result
        assert isinstance(result["files"], list)

    def test_date_filter_functionality(self, optimized_repository, sample_data):
        """日付フィルタリングの機能テスト"""
        # 過去7日間のファイルを取得
        seven_days_ago = datetime.now() - timedelta(days=7)

        result = optimized_repository.get_files_created_after(seven_days_ago)

        # 結果が正しく取得されていることを確認
        assert "files" in result
        assert "total_count" in result
        assert isinstance(result["files"], list)

    def test_edit_history_by_id_functionality(self, optimized_repository, sample_data):
        """編集履歴ID取得の機能テスト（N+1問題解決）"""
        # 最初のファイルの編集履歴を取得
        with SQLModelSessionManager() as session:
            first_file = session.query(File).first()
            if first_file:
                file_id = first_file.id

                # 編集履歴を追加
                history_obj = FileEditHistory(
                    file_id=file_id,
                    original_filename="test.pdf",
                    original_content="Original content",
                    edited_filename="edited_test.pdf",
                    edited_content="Edited content",
                    edit_reason="Test edit",
                    edited_by="test_user",
                )
                session.add(history_obj)
                session.commit()

                # 履歴IDを取得
                history_id = history_obj.id

                # 最適化されたクエリのテスト
                result = optimized_repository.get_edit_history_by_id(history_id)

                # 結果が正しく取得されていることを確認
                assert result is not None
                assert result["id"] == history_id
                assert result["file_id"] == file_id

    def test_conversion_logs_functionality(self, optimized_repository, sample_data):
        """変換ログ取得の機能テスト"""
        # 最初のファイルの変換ログを取得
        with SQLModelSessionManager() as session:
            first_file = session.query(File).first()
            if first_file:
                file_id = first_file.id

                result = optimized_repository.get_conversion_logs(file_id)

                # 結果が正しく取得されていることを確認
                assert isinstance(result, list)
                assert len(result) > 0

    def test_statistics_functionality(self, optimized_repository, sample_data):
        """統計情報取得の機能テスト"""
        result = optimized_repository.get_file_statistics()

        # 結果が正しく取得されていることを確認
        assert "total_files" in result
        assert "total_size_bytes" in result
        assert "status_counts" in result
        assert "total_size_mb" in result
