"""
データベース拡張機能のテスト

新しく追加したファイル編集関連のデータベース機能のテストを実装
"""

import shutil
import tempfile
from pathlib import Path

import pytest

from src.api.database import DatabaseManager


class TestFileEditHistory:
    """ファイル編集履歴機能のテスト"""

    @pytest.fixture
    def temp_db_manager(self):
        """一時的なデータベースマネージャーを作成"""
        # 一時ディレクトリにテスト用DBを作成
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_edit_history.db"

        db_manager = DatabaseManager(str(db_path))

        yield db_manager

        # クリーンアップ
        shutil.rmtree(temp_dir)

    @pytest.fixture
    def sample_file(self, temp_db_manager):
        """テスト用ファイルを作成"""
        file_id = "test_file_123"
        filename = "test.md"
        original_path = "/tmp/test.md"
        file_size = 1024

        # ファイルを挿入
        temp_db_manager.insert_file(
            file_id=file_id,
            filename=filename,
            original_path=original_path,
            file_size=file_size,
        )

        # Markdown内容を更新
        temp_db_manager.update_file_status(
            file_id=file_id,
            status="completed",
            markdown_content="# Test Content\n\nThis is test content.",
        )

        return {
            "id": file_id,
            "filename": filename,
            "content": "# Test Content\n\nThis is test content.",
        }

    def test_add_edit_history_success(self, temp_db_manager, sample_file):
        """編集履歴の追加テスト（成功）"""
        # 編集履歴を追加
        result = temp_db_manager.add_edit_history(
            file_id=sample_file["id"],
            original_filename=sample_file["filename"],
            original_content=sample_file["content"],
            edited_filename="updated_test.md",
            edited_content="# Updated Test Content\n\nThis is updated content.",
            edit_reason="Content improvement",
            edited_by="test_user",
        )

        assert result is True

        # 履歴が正しく保存されているか確認
        history = temp_db_manager.get_edit_history(sample_file["id"])
        assert len(history) == 1

        history_item = history[0]
        assert history_item["file_id"] == sample_file["id"]
        assert history_item["original_filename"] == sample_file["filename"]
        assert history_item["original_content"] == sample_file["content"]
        assert history_item["edited_filename"] == "updated_test.md"
        assert (
            history_item["edited_content"]
            == "# Updated Test Content\n\nThis is updated content."
        )
        assert history_item["edit_reason"] == "Content improvement"
        assert history_item["edited_by"] == "test_user"

    def test_add_edit_history_minimal_fields(self, temp_db_manager, sample_file):
        """最小限のフィールドでの編集履歴追加テスト"""
        result = temp_db_manager.add_edit_history(
            file_id=sample_file["id"],
            original_filename=sample_file["filename"],
            original_content=sample_file["content"],
            edited_filename=sample_file["filename"],
            edited_content=sample_file["content"],
        )

        assert result is True

        # デフォルト値が正しく設定されているか確認
        history = temp_db_manager.get_edit_history(sample_file["id"])
        assert len(history) == 1

        history_item = history[0]
        assert history_item["edit_reason"] is None
        assert history_item["edited_by"] == "system"

    def test_get_edit_history_empty(self, temp_db_manager):
        """存在しないファイルの編集履歴取得テスト"""
        history = temp_db_manager.get_edit_history("non_existent_file")
        assert history == []

    def test_get_edit_history_multiple_entries(self, temp_db_manager, sample_file):
        """複数の編集履歴の取得テスト"""
        # 複数の編集履歴を追加
        for i in range(3):
            temp_db_manager.add_edit_history(
                file_id=sample_file["id"],
                original_filename=f"test_{i}.md",
                original_content=f"# Test {i}",
                edited_filename=f"test_{i + 1}.md",
                edited_content=f"# Test {i + 1}",
                edit_reason=f"Update {i + 1}",
                edited_by=f"user_{i}",
            )

        # 履歴を取得
        history = temp_db_manager.get_edit_history(sample_file["id"])
        assert len(history) == 3

        # 作成日時の降順でソートされているか確認
        timestamps = [item["created_at"] for item in history]
        assert timestamps == sorted(timestamps, reverse=True)


class TestFileContentUpdate:
    """ファイル内容更新機能のテスト"""

    @pytest.fixture
    def temp_db_manager(self):
        """一時的なデータベースマネージャーを作成"""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_content_update.db"

        db_manager = DatabaseManager(str(db_path))

        yield db_manager

        shutil.rmtree(temp_dir)

    @pytest.fixture
    def sample_file(self, temp_db_manager):
        """テスト用ファイルを作成"""
        file_id = "test_file_456"
        filename = "original.md"
        original_path = "/tmp/original.md"
        file_size = 2048

        # ファイルを挿入
        temp_db_manager.insert_file(
            file_id=file_id,
            filename=filename,
            original_path=original_path,
            file_size=file_size,
        )

        # Markdown内容を更新
        temp_db_manager.update_file_status(
            file_id=file_id,
            status="completed",
            markdown_content="# Original Content\n\nThis is the original content.",
        )

        return {
            "id": file_id,
            "filename": filename,
            "content": "# Original Content\n\nThis is the original content.",
        }

    def test_update_file_content_filename_only(self, temp_db_manager, sample_file):
        """ファイル名のみの更新テスト"""
        new_filename = "updated_filename.md"

        result = temp_db_manager.update_file_content(
            file_id=sample_file["id"],
            new_filename=new_filename,
            edit_reason="Filename update",
        )

        assert result is True

        # ファイル情報が更新されているか確認
        updated_file = temp_db_manager.get_file(sample_file["id"])
        assert updated_file["filename"] == new_filename
        assert (
            updated_file["markdown_content"] == sample_file["content"]
        )  # 内容は変更されていない
        assert updated_file["edit_count"] == 1
        assert updated_file["is_edited"] == 1  # SQLiteでは1がTrue
        assert updated_file["last_edited_at"] is not None

        # 編集履歴が作成されているか確認
        history = temp_db_manager.get_edit_history(sample_file["id"])
        assert len(history) == 1

        history_item = history[0]
        assert history_item["original_filename"] == sample_file["filename"]
        assert history_item["edited_filename"] == new_filename
        assert history_item["edit_reason"] == "Filename update"

    def test_update_file_content_markdown_only(self, temp_db_manager, sample_file):
        """Markdown内容のみの更新テスト"""
        new_content = (
            "# Updated Content\n\nThis is the updated content with improvements."
        )

        result = temp_db_manager.update_file_content(
            file_id=sample_file["id"],
            new_content=new_content,
            edit_reason="Content improvement",
        )

        assert result is True

        # ファイル情報が更新されているか確認
        updated_file = temp_db_manager.get_file(sample_file["id"])
        assert (
            updated_file["filename"] == sample_file["filename"]
        )  # ファイル名は変更されていない
        assert updated_file["markdown_content"] == new_content
        assert updated_file["edit_count"] == 1
        assert updated_file["is_edited"] == 1  # SQLiteでは1がTrue

        # 編集履歴が作成されているか確認
        history = temp_db_manager.get_edit_history(sample_file["id"])
        assert len(history) == 1

        history_item = history[0]
        assert history_item["original_content"] == sample_file["content"]
        assert history_item["edited_content"] == new_content

    def test_update_file_content_both_fields(self, temp_db_manager, sample_file):
        """ファイル名と内容の両方を更新するテスト"""
        new_filename = "completely_updated.md"
        new_content = "# Completely Updated\n\nThis is a completely new content."

        result = temp_db_manager.update_file_content(
            file_id=sample_file["id"],
            new_filename=new_filename,
            new_content=new_content,
            edit_reason="Complete rewrite",
            edited_by="admin_user",
        )

        assert result is True

        # ファイル情報が更新されているか確認
        updated_file = temp_db_manager.get_file(sample_file["id"])
        assert updated_file["filename"] == new_filename
        assert updated_file["markdown_content"] == new_content
        assert updated_file["edit_count"] == 1
        assert updated_file["is_edited"] == 1  # SQLiteでは1がTrue

        # 編集履歴が作成されているか確認
        history = temp_db_manager.get_edit_history(sample_file["id"])
        assert len(history) == 1

        history_item = history[0]
        assert history_item["edited_by"] == "admin_user"
        assert history_item["edit_reason"] == "Complete rewrite"

    def test_update_file_content_nonexistent_file(self, temp_db_manager):
        """存在しないファイルの更新テスト"""
        result = temp_db_manager.update_file_content(
            file_id="non_existent_file", new_filename="new.md"
        )

        assert result is False

    def test_update_file_content_multiple_updates(self, temp_db_manager, sample_file):
        """複数回の更新テスト"""
        # 1回目の更新
        temp_db_manager.update_file_content(
            file_id=sample_file["id"],
            new_filename="first_update.md",
            edit_reason="First update",
        )

        # 2回目の更新
        temp_db_manager.update_file_content(
            file_id=sample_file["id"],
            new_content="# Second update content",
            edit_reason="Second update",
        )

        # 3回目の更新
        temp_db_manager.update_file_content(
            file_id=sample_file["id"],
            new_filename="final_version.md",
            new_content="# Final version content",
            edit_reason="Final update",
        )

        # 最終状態を確認
        final_file = temp_db_manager.get_file(sample_file["id"])
        assert final_file["filename"] == "final_version.md"
        assert final_file["markdown_content"] == "# Final version content"
        assert final_file["edit_count"] == 3
        assert final_file["is_edited"] == 1  # SQLiteでは1がTrue

        # 履歴の件数を確認
        history = temp_db_manager.get_edit_history(sample_file["id"])
        assert len(history) == 3


class TestFileSearchAndFilter:
    """ファイル検索・フィルタリング機能のテスト"""

    @pytest.fixture
    def temp_db_manager(self):
        """一時的なデータベースマネージャーを作成"""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_search.db"

        db_manager = DatabaseManager(str(db_path))

        yield db_manager

        shutil.rmtree(temp_dir)

    @pytest.fixture
    def sample_files(self, temp_db_manager):
        """テスト用ファイルを作成"""
        files_data = [
            {
                "id": "file1",
                "filename": "document1.md",
                "content": "# Document 1\n\nThis is the first document about Python programming.",
                "status": "completed",
                "is_edited": False,
            },
            {
                "id": "file2",
                "filename": "document2.md",
                "content": "# Document 2\n\nThis is the second document about JavaScript.",
                "status": "completed",
                "is_edited": True,
            },
            {
                "id": "file3",
                "filename": "tutorial.md",
                "content": "# Tutorial\n\nThis is a tutorial about web development.",
                "status": "processing",
                "is_edited": False,
            },
        ]

        for file_data in files_data:
            temp_db_manager.insert_file(
                file_id=file_data["id"],
                filename=file_data["filename"],
                original_path=f"/tmp/{file_data['filename']}",
                file_size=1024,
            )

            temp_db_manager.update_file_status(
                file_id=file_data["id"],
                status=file_data["status"],
                markdown_content=file_data["content"],
            )

            # 編集済みファイルの場合は編集フラグを設定
            if file_data["is_edited"]:
                temp_db_manager.update_file_content(
                    file_id=file_data["id"], edit_reason="Initial edit"
                )

        return files_data

    def test_search_files_by_query(self, temp_db_manager, sample_files):
        """クエリによる検索テスト"""
        # "Python"で検索
        result = temp_db_manager.search_files(query="Python")
        assert result["total_count"] == 1
        assert result["files"][0]["id"] == "file1"

        # "JavaScript"で検索
        result = temp_db_manager.search_files(query="JavaScript")
        assert result["total_count"] == 1
        assert result["files"][0]["id"] == "file2"

        # "web"で検索
        result = temp_db_manager.search_files(query="web")
        assert result["total_count"] == 1
        assert result["files"][0]["id"] == "file3"

    def test_search_files_by_status(self, temp_db_manager, sample_files):
        """ステータスによるフィルタリングテスト"""
        # completedステータスのファイル
        result = temp_db_manager.search_files(status="completed")
        assert result["total_count"] == 2

        # processingステータスのファイル
        result = temp_db_manager.search_files(status="processing")
        assert result["total_count"] == 1

    def test_search_files_by_edit_status(self, temp_db_manager, sample_files):
        """編集状態によるフィルタリングテスト"""
        # 編集済みファイル
        result = temp_db_manager.search_files(is_edited=True)
        assert result["total_count"] == 1
        assert result["files"][0]["id"] == "file2"

        # 未編集ファイル
        result = temp_db_manager.search_files(is_edited=False)
        assert result["total_count"] == 2

    def test_search_files_combined_filters(self, temp_db_manager, sample_files):
        """複数フィルターの組み合わせテスト"""
        # completed + 未編集
        result = temp_db_manager.search_files(status="completed", is_edited=False)
        assert result["total_count"] == 1
        assert result["files"][0]["id"] == "file1"

        # クエリ + ステータス
        result = temp_db_manager.search_files(query="document", status="completed")
        assert result["total_count"] == 2

    def test_search_files_pagination(self, temp_db_manager, sample_files):
        """ページネーションテスト"""
        # 1ページ目（2件）
        result = temp_db_manager.search_files(page=1, per_page=2)
        assert result["page"] == 1
        assert result["per_page"] == 2
        assert result["total_count"] == 3
        assert len(result["files"]) == 2

        # 2ページ目（1件）
        result = temp_db_manager.search_files(page=2, per_page=2)
        assert result["page"] == 2
        assert result["per_page"] == 2
        assert result["total_count"] == 3
        assert len(result["files"]) == 1

    def test_search_files_no_filters(self, temp_db_manager, sample_files):
        """フィルターなしの検索テスト"""
        result = temp_db_manager.search_files()
        assert result["total_count"] == 3
        assert len(result["files"]) == 3
        assert result["page"] == 1
        assert result["per_page"] == 10

    def test_search_files_empty_result(self, temp_db_manager, sample_files):
        """検索結果が空の場合のテスト"""
        result = temp_db_manager.search_files(query="nonexistent")
        assert result["total_count"] == 0
        assert len(result["files"]) == 0

    def test_search_files_case_insensitive(self, temp_db_manager, sample_files):
        """大文字小文字を区別しない検索テスト"""
        # 大文字で検索
        result = temp_db_manager.search_files(query="PYTHON")
        assert result["total_count"] == 1

        # 小文字で検索
        result = temp_db_manager.search_files(query="python")
        assert result["total_count"] == 1


class TestDatabaseMigration:
    """データベースマイグレーション機能のテスト"""

    def test_migration_adds_new_columns(self):
        """新しいカラムが追加されるマイグレーションテスト"""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_migration.db"

        try:
            # 初期データベースを作成
            db_manager = DatabaseManager(str(db_path))

            # 新しいカラムが追加されているか確認
            with db_manager._get_connection() as conn:
                cursor = conn.execute("PRAGMA table_info(files)")
                columns = [row[1] for row in cursor.fetchall()]

                # 新しいカラムが存在することを確認
                assert "last_edited_at" in columns
                assert "edit_count" in columns
                assert "is_edited" in columns

                # 既存のカラムも存在することを確認
                assert "id" in columns
                assert "filename" in columns
                assert "status" in columns

        finally:
            shutil.rmtree(temp_dir)

    def test_migration_preserves_existing_data(self):
        """既存データが保持されるマイグレーションテスト"""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_migration_data.db"

        try:
            # 初期データベースを作成
            db_manager = DatabaseManager(str(db_path))

            # テストデータを挿入
            test_file_id = "test_migration_file"
            db_manager.insert_file(
                file_id=test_file_id,
                filename="test.md",
                original_path="/tmp/test.md",
                file_size=1024,
            )

            # マイグレーション後にデータが保持されているか確認
            file_data = db_manager.get_file(test_file_id)
            assert file_data is not None
            assert file_data["filename"] == "test.md"
            assert file_data["edit_count"] == 0  # デフォルト値
            assert file_data["is_edited"] == 0  # SQLiteでは0がFalse

        finally:
            shutil.rmtree(temp_dir)
