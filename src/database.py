"""
データベース接続・操作
"""

import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path
import json


class DatabaseManager:
    """SQLiteデータベース管理クラス"""
    
    def __init__(self, db_path: str = "data/database.db"):
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
            conn.execute("""
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
                    metadata TEXT
                )
            """)
            
            conn.execute("""
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
            """)
            
            conn.commit()
    
    def insert_file(self, file_id: str, filename: str, original_path: str, 
                   file_size: int, metadata: Optional[Dict] = None) -> bool:
        """ファイル情報を挿入"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO files (id, filename, original_path, file_size, metadata)
                    VALUES (?, ?, ?, ?, ?)
                """, (file_id, filename, original_path, file_size, 
                     json.dumps(metadata) if metadata else None))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error inserting file: {e}")
            return False
    
    def update_file_status(self, file_id: str, status: str, 
                          markdown_content: Optional[str] = None,
                          processing_time: Optional[float] = None) -> bool:
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
                
                query = f"""
                    UPDATE files 
                    SET {', '.join(update_fields)}
                    WHERE id = ?
                """
                
                conn.execute(query, params)
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating file status: {e}")
            return False
    
    def get_file(self, file_id: str) -> Optional[Dict[str, Any]]:
        """ファイル情報を取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT * FROM files WHERE id = ?
                """, (file_id,))
                row = cursor.fetchone()
                
                if row:
                    file_dict = dict(row)
                    if file_dict.get('metadata'):
                        file_dict['metadata'] = json.loads(file_dict['metadata'])
                    return file_dict
                return None
        except Exception as e:
            print(f"Error getting file: {e}")
            return None
    
    def list_files(self, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        """ファイル一覧を取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                # 総件数を取得
                cursor = conn.execute("SELECT COUNT(*) FROM files")
                total_count = cursor.fetchone()[0]
                
                # ファイル一覧を取得
                offset = (page - 1) * per_page
                cursor = conn.execute("""
                    SELECT id, filename, status, file_size, created_at, updated_at, processing_time
                    FROM files 
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """, (per_page, offset))
                
                files = []
                for row in cursor.fetchall():
                    file_dict = dict(row)
                    files.append(file_dict)
                
                return {
                    "files": files,
                    "total_count": total_count,
                    "page": page,
                    "per_page": per_page
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
                if os.path.exists(file_info['original_path']):
                    os.remove(file_info['original_path'])
                
                # データベースから削除
                conn.execute("DELETE FROM files WHERE id = ?", (file_id,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    def add_conversion_log(self, file_id: str, action: str, status: str, 
                          message: Optional[str] = None, 
                          processing_time: Optional[float] = None) -> bool:
        """変換ログを追加"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO conversion_logs (file_id, action, status, message, processing_time)
                    VALUES (?, ?, ?, ?, ?)
                """, (file_id, action, status, message, processing_time))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error adding conversion log: {e}")
            return False
    
    def get_conversion_logs(self, file_id: str) -> List[Dict[str, Any]]:
        """変換ログを取得"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT * FROM conversion_logs 
                    WHERE file_id = ? 
                    ORDER BY timestamp DESC
                """, (file_id,))
                
                logs = []
                for row in cursor.fetchall():
                    logs.append(dict(row))
                
                return logs
        except Exception as e:
            print(f"Error getting conversion logs: {e}")
            return []


# グローバルインスタンス
db_manager = DatabaseManager()
