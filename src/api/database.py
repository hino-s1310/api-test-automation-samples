"""
データベース接続・操作
"""

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

# SQLModel関連のインポート
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

# 環境設定
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


# ===========================
# 共通データベース設定
# ===========================


def get_database_path() -> str:
    """既存のDatabaseManagerと同じロジックでDBパスを取得"""
    environment = os.getenv("ENVIRONMENT", "development")
    if environment == "test":
        return "data/test_database.db"
    else:
        return "data/database.db"


# ===========================
# SQLModel用データベース設定
# ===========================


def get_database_url(db_path: str = None) -> str:
    """データベースURLを取得"""
    if db_path is None:
        db_path = get_database_path()

    # SQLite用のURL形式
    return f"sqlite:///{db_path}"


def create_sqlmodel_engine(db_path: str = None):
    """SQLModel用エンジンを作成"""
    database_url = get_database_url(db_path)

    # 環境に応じた接続プール設定
    environment = os.getenv("ENVIRONMENT", "development")

    if environment == "test":
        # テスト環境: 小さなプールサイズで高速実行
        pool_size = 5
        max_overflow = 10
        pool_timeout = 30
        pool_recycle = 3600
        pool_pre_ping = True
    elif environment == "production":
        # 本番環境: 大きなプールサイズで高負荷対応
        pool_size = 20
        max_overflow = 30
        pool_timeout = 30
        pool_recycle = 3600
        pool_pre_ping = True
    else:
        # 開発環境: 中程度のプールサイズ
        pool_size = 10
        max_overflow = 20
        pool_timeout = 30
        pool_recycle = 3600
        pool_pre_ping = True

    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False},  # SQLite用設定
        echo=False,  # SQLクエリのログ出力（開発時はTrueに設定可能）
        # 接続プール設定
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=pool_timeout,
        pool_recycle=pool_recycle,
        pool_pre_ping=pool_pre_ping,
    )
    return engine


def create_session_factory(engine=None):
    """セッションファクトリーを作成"""
    if engine is None:
        engine = create_sqlmodel_engine()

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal


# グローバルエンジンとセッションファクトリー
_engine = None
_session_factory = None


def get_engine():
    """グローバルエンジンを取得"""
    global _engine
    if _engine is None:
        _engine = create_sqlmodel_engine()
    return _engine


def get_session_factory():
    """グローバルセッションファクトリーを取得"""
    global _session_factory
    if _session_factory is None:
        _session_factory = create_session_factory(get_engine())
    return _session_factory


class SQLModelSessionManager:
    """SQLModel用セッション管理クラス"""

    def __init__(self, db_path: str = None):
        self.engine = create_sqlmodel_engine(db_path)
        self.SessionLocal = create_session_factory(self.engine)
        self._pool_stats = None

    def get_session(self):
        """セッションを取得"""
        return self.SessionLocal()

    def create_tables(self):
        """テーブルを作成"""
        SQLModel.metadata.create_all(self.engine)

    def drop_tables(self):
        """テーブルを削除（テスト用）"""
        SQLModel.metadata.drop_all(self.engine)

    def __enter__(self):
        """コンテキストマネージャー開始"""
        self.session = self.get_session()
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        """コンテキストマネージャー終了"""
        if exc_type is not None:
            self.session.rollback()
        else:
            self.session.commit()
        self.session.close()

    def get_pool_status(self):
        """接続プールの状態を取得"""
        try:
            pool = self.engine.pool
            return {
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "total_connections": pool.size() + pool.overflow(),
                "available_connections": pool.checkedin(),
                "active_connections": pool.checkedout(),
            }
        except Exception as e:
            return {"error": str(e)}

    def get_engine_info(self):
        """エンジン情報を取得"""
        try:
            return {
                "url": str(self.engine.url),
                "driver": self.engine.driver,
                "pool_size": self.engine.pool.size(),
                "max_overflow": self.engine.pool._max_overflow,
                "pool_timeout": self.engine.pool._timeout,
                "pool_recycle": self.engine.pool._recycle,
                "pool_pre_ping": self.engine.pool._pre_ping,
            }
        except Exception as e:
            return {"error": str(e)}

    def health_check(self):
        """データベース接続のヘルスチェック"""
        try:
            with self.get_session() as session:
                # 簡単なクエリで接続をテスト
                session.execute("SELECT 1")
                return {
                    "status": "healthy",
                    "message": "Database connection is working",
                    "pool_status": self.get_pool_status(),
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "pool_status": self.get_pool_status(),
            }


class DatabaseManager:
    """SQLiteデータベース管理クラス"""

    def __init__(self, db_path: str = None):
        if db_path is None:
            # 統一されたDBパス取得ロジックを使用
            db_path = get_database_path()

        self.db_path = db_path
        self._ensure_db_directory()
        self._init_database()

    def _ensure_db_directory(self):
        """データベースディレクトリの存在確認・作成"""
        db_dir = Path(self.db_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

    def _init_database(self):
        """データベースの初期化"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS files (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    original_path TEXT NOT NULL,
                    markdown_path TEXT,
                    markdown_content TEXT,
                    status TEXT NOT NULL DEFAULT 'processing',
                    file_size INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processing_time REAL,
                    file_metadata TEXT,
                    last_edited_at TIMESTAMP,
                    edit_count INTEGER DEFAULT 0,
                    is_edited BOOLEAN DEFAULT FALSE
                )
            """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS conversion_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processing_time REAL,
                    FOREIGN KEY (file_id) REFERENCES files (id)
                )
            """
            )

            # ファイル編集履歴テーブル
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS file_edit_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    original_content TEXT NOT NULL,
                    edited_filename TEXT NOT NULL,
                    edited_content TEXT NOT NULL,
                    edit_reason TEXT,
                    edited_by TEXT DEFAULT 'system',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (file_id) REFERENCES files (id)
                )
            """
            )

            # 既存テーブルのマイグレーション
            self._migrate_database(conn)

            conn.commit()

    def _migrate_database(self, conn):
        """データベースマイグレーション"""
        try:
            # 新しいカラムが存在するかチェック
            cursor = conn.execute("PRAGMA table_info(files)")
            columns = [row[1] for row in cursor.fetchall()]

            # last_edited_atカラムの追加
            if "last_edited_at" not in columns:
                conn.execute("ALTER TABLE files ADD COLUMN last_edited_at TIMESTAMP")
                print("Added last_edited_at column to files table")

            # edit_countカラムの追加
            if "edit_count" not in columns:
                conn.execute(
                    "ALTER TABLE files ADD COLUMN edit_count INTEGER DEFAULT 0"
                )
                print("Added edit_count column to files table")

            # is_editedカラムの追加
            if "is_edited" not in columns:
                conn.execute(
                    "ALTER TABLE files ADD COLUMN is_edited BOOLEAN DEFAULT FALSE"
                )
                print("Added is_edited column to files table")

        except Exception as e:
            print(f"Migration error: {e}")

    def insert_file(
        self,
        file_id: str,
        filename: str,
        original_path: str,
        file_size: int,
        metadata: dict | None = None,
    ) -> bool:
        """ファイル情報を挿入"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    INSERT INTO files (id, filename, original_path, file_size, file_metadata)
                    VALUES (?, ?, ?, ?, ?)
                """,
                    (
                        file_id,
                        filename,
                        original_path,
                        file_size,
                        json.dumps(metadata) if metadata else None,
                    ),
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error inserting file: {e}")
            return False

    def update_file_status(
        self,
        file_id: str,
        status: str,
        markdown_content: str | None = None,
        processing_time: float | None = None,
    ) -> bool:
        """ファイルの状態を更新"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                update_fields = ["status = ?", "updated_at = CURRENT_TIMESTAMP"]
                params = [status]

                if markdown_content is not None:
                    update_fields.append("markdown_content = ?")
                    params.append(markdown_content)

                if processing_time is not None:
                    update_fields.append("processing_time = ?")
                    params.append(processing_time)

                params.append(file_id)

                query = f"UPDATE files SET {', '.join(update_fields)} WHERE id = ?"
                conn.execute(query, params)
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating file status: {e}")
            return False

    def update_filename(self, file_id: str, new_filename: str) -> bool:
        """ファイル名を更新"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    UPDATE files
                    SET filename = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """,
                    (new_filename, file_id),
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating filename: {e}")
            return False

    def get_file(self, file_id: str) -> dict[str, Any] | None:
        """ファイル情報を取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(
                    """
                    SELECT * FROM files WHERE id = ?
                """,
                    (file_id,),
                )
                row = cursor.fetchone()

                if row:
                    file_dict = dict(row)
                    if file_dict.get("file_metadata"):
                        file_dict["file_metadata"] = json.loads(
                            file_dict["file_metadata"]
                        )
                    return file_dict
                return None
        except Exception as e:
            print(f"Error getting file: {e}")
            return None

    def list_files(self, page: int = 1, per_page: int = 10) -> dict[str, Any]:
        """ファイル一覧を取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row

                # 総件数を取得
                cursor = conn.execute("SELECT COUNT(*) FROM files")
                total_count = cursor.fetchone()[0]

                # ファイル一覧を取得
                offset = (page - 1) * per_page
                cursor = conn.execute(
                    """
                    SELECT id, filename, status, file_size, created_at, updated_at,
                           processing_time, last_edited_at, edit_count, is_edited
                    FROM files
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """,
                    (per_page, offset),
                )

                files = []
                for row in cursor.fetchall():
                    file_dict = dict(row)
                    files.append(file_dict)

                return {
                    "files": files,
                    "total_count": total_count,
                    "page": page,
                    "per_page": per_page,
                }
        except Exception as e:
            print(f"Error listing files: {e}")
            return {"files": [], "total_count": 0, "page": page, "per_page": per_page}

    def delete_file(self, file_id: str) -> bool:
        """ファイルを削除"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # ファイル情報を取得
                file_info = self.get_file(file_id)
                if not file_info:
                    return False

                # 物理ファイルを削除
                if os.path.exists(file_info["original_path"]):
                    os.remove(file_info["original_path"])

                # データベースから削除
                conn.execute("DELETE FROM files WHERE id = ?", (file_id,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False

    def add_conversion_log(
        self,
        file_id: str,
        action: str,
        status: str,
        message: str | None = None,
        processing_time: float | None = None,
    ) -> bool:
        """変換ログを追加"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    INSERT INTO conversion_logs (file_id, action, status, message, processing_time)
                    VALUES (?, ?, ?, ?, ?)
                """,
                    (file_id, action, status, message, processing_time),
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error adding conversion log: {e}")
            return False

    def get_conversion_logs(self, file_id: str) -> list[dict[str, Any]]:
        """変換ログを取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(
                    """
                    SELECT * FROM conversion_logs
                    WHERE file_id = ?
                    ORDER BY timestamp DESC
                """,
                    (file_id,),
                )

                logs = []
                for row in cursor.fetchall():
                    logs.append(dict(row))

                return logs
        except Exception as e:
            print(f"Error getting conversion logs: {e}")
            return []

    def add_edit_history(
        self,
        file_id: str,
        original_filename: str,
        original_content: str,
        edited_filename: str,
        edited_content: str,
        edit_reason: str | None = None,
        edited_by: str = "system",
    ) -> bool:
        """ファイル編集履歴を追加"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    INSERT INTO file_edit_history
                    (file_id, original_filename, original_content, edited_filename, edited_content, edit_reason, edited_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        file_id,
                        original_filename,
                        original_content,
                        edited_filename,
                        edited_content,
                        edit_reason,
                        edited_by,
                    ),
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error adding edit history: {e}")
            return False

    def get_edit_history(self, file_id: str) -> list[dict[str, Any]]:
        """ファイル編集履歴を取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(
                    """
                    SELECT * FROM file_edit_history
                    WHERE file_id = ?
                    ORDER BY created_at DESC
                """,
                    (file_id,),
                )

                history = []
                for row in cursor.fetchall():
                    history.append(dict(row))

                return history
        except Exception as e:
            print(f"Error getting edit history: {e}")
            return []

    def update_file_content(
        self,
        file_id: str,
        new_filename: str | None = None,
        new_content: str | None = None,
        edit_reason: str | None = None,
        edited_by: str = "system",
    ) -> bool:
        """ファイル内容を更新（編集履歴も記録）"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # 現在のファイル情報を取得
                current_file = self.get_file(file_id)
                if not current_file:
                    return False

                # 編集履歴を追加
                self.add_edit_history(
                    file_id=file_id,
                    original_filename=current_file["filename"],
                    original_content=current_file.get("markdown_content", ""),
                    edited_filename=new_filename or current_file["filename"],
                    edited_content=new_content
                    or current_file.get("markdown_content", ""),
                    edit_reason=edit_reason,
                    edited_by=edited_by,
                )

                # ファイル情報を更新
                update_fields = [
                    "updated_at = CURRENT_TIMESTAMP",
                    "last_edited_at = CURRENT_TIMESTAMP",
                    "edit_count = edit_count + 1",
                    "is_edited = TRUE",
                ]
                params = []

                if new_filename is not None:
                    update_fields.append("filename = ?")
                    params.append(new_filename)

                if new_content is not None:
                    update_fields.append("markdown_content = ?")
                    params.append(new_content)

                params.append(file_id)

                query = f"UPDATE files SET {', '.join(update_fields)} WHERE id = ?"
                conn.execute(query, params)
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating file content: {e}")
            return False

    def search_files(
        self,
        query: str | None = None,
        status: str | None = None,
        is_edited: bool | None = None,
        page: int = 1,
        per_page: int = 10,
    ) -> dict[str, Any]:
        """ファイルを検索・フィルタリング"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row

                # 検索条件を構築
                where_conditions = []
                params = []

                if query:
                    where_conditions.append(
                        "(filename LIKE ? OR markdown_content LIKE ?)"
                    )
                    params.extend([f"%{query}%", f"%{query}%"])

                if status:
                    where_conditions.append("status = ?")
                    params.append(status)

                if is_edited is not None:
                    where_conditions.append("is_edited = ?")
                    params.append(is_edited)

                where_clause = (
                    " AND ".join(where_conditions) if where_conditions else "1=1"
                )

                # 総件数を取得
                count_query = f"SELECT COUNT(*) FROM files WHERE {where_clause}"
                cursor = conn.execute(count_query, params)
                total_count = cursor.fetchone()[0]

                # ファイル一覧を取得
                offset = (page - 1) * per_page
                select_query = f"""
                    SELECT id, filename, status, file_size, created_at, updated_at,
                           processing_time, last_edited_at, edit_count, is_edited
                    FROM files
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """
                params.extend([per_page, offset])

                cursor = conn.execute(select_query, params)
                files = []
                for row in cursor.fetchall():
                    files.append(dict(row))

                return {
                    "files": files,
                    "total_count": total_count,
                    "page": page,
                    "per_page": per_page,
                }
        except Exception as e:
            print(f"Error searching files: {e}")
            return {"files": [], "total_count": 0, "page": page, "per_page": per_page}

    def clear_all_data(self) -> bool:
        """テスト用：全データを削除"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # 外部キー制約を一時的に無効化
                conn.execute("PRAGMA foreign_keys = OFF")

                # 全テーブルのデータを削除
                conn.execute("DELETE FROM conversion_logs")
                conn.execute("DELETE FROM files")
                conn.execute("DELETE FROM file_edit_history")

                # 外部キー制約を再有効化
                conn.execute("PRAGMA foreign_keys = ON")
                conn.commit()
                return True
        except Exception as e:
            print(f"Error clearing all data: {e}")
            return False

    def _get_connection(self):
        """データベース接続を取得（テスト用）"""
        return sqlite3.connect(self.db_path)


# ===========================
# 互換性確保・統合機能
# ===========================


def ensure_database_compatibility():
    """既存のDatabaseManagerとSQLModelの互換性を確保"""
    # 既存のDatabaseManagerでテーブルを作成
    db_manager = DatabaseManager()

    # SQLModel用のテーブルも作成（既存テーブルと互換性を保つ）
    session_manager = SQLModelSessionManager()
    session_manager.create_tables()

    return db_manager, session_manager


def get_unified_database_manager():
    """統合されたデータベース管理機能を提供"""
    db_path = get_database_path()

    # 既存のDatabaseManager
    legacy_manager = DatabaseManager(db_path)

    # SQLModel用のセッションマネージャー
    sqlmodel_manager = SQLModelSessionManager(db_path)

    return {
        "legacy": legacy_manager,
        "sqlmodel": sqlmodel_manager,
        "db_path": db_path,
        "environment": ENVIRONMENT,
    }


def verify_database_compatibility():
    """データベース互換性を検証"""
    try:
        # 既存のDatabaseManagerでテーブル構造を確認
        legacy_manager = DatabaseManager()

        # SQLModel用のテーブルも作成
        sqlmodel_manager = SQLModelSessionManager()
        sqlmodel_manager.create_tables()

        # 基本的な互換性テスト
        with sqlite3.connect(legacy_manager.db_path) as conn:
            # 既存テーブルの存在確認
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]

            required_tables = ["files", "conversion_logs", "file_edit_history"]
            missing_tables = [table for table in required_tables if table not in tables]

            if missing_tables:
                return {
                    "compatible": False,
                    "error": f"Missing tables: {missing_tables}",
                    "tables": tables,
                }

        return {
            "compatible": True,
            "message": "Database compatibility verified",
            "tables": tables,
            "environment": ENVIRONMENT,
            "db_path": legacy_manager.db_path,
        }

    except Exception as e:
        return {"compatible": False, "error": str(e), "environment": ENVIRONMENT}


# グローバルインスタンス
db_manager = DatabaseManager()
