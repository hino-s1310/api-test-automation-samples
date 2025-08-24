"""
ファイル管理サービス

ファイルの取得、一覧表示、削除などの処理を担当
"""

import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

from ..database import db_manager
from ..models import FileStatus


class FileService:
    """ファイル管理サービス"""
    
    def __init__(self):
        pass
    
    def get_file(self, file_id: str) -> Optional[Dict[str, Any]]:
        """ファイル情報を取得"""
        file_info = db_manager.get_file(file_id)
        if not file_info:
            return None
        
        # レスポンス用のデータを整形
        return {
            "id": file_info["id"],
            "filename": file_info["filename"],
            "markdown": file_info.get("markdown_content", ""),
            "status": file_info["status"],
            "created_at": file_info["created_at"],
            "updated_at": file_info["updated_at"],
            "file_size": file_info["file_size"],
            "processing_time": file_info.get("processing_time")
        }
    
    def list_files(self, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        """ファイル一覧を取得"""
        result = db_manager.list_files(page, per_page)
        
        # レスポンス用のデータを整形
        files = []
        for file_info in result["files"]:
            files.append({
                "id": file_info["id"],
                "filename": file_info["filename"],
                "status": file_info["status"],
                "created_at": file_info["created_at"],
                "updated_at": file_info["updated_at"],
                "file_size": file_info["file_size"],
                "processing_time": file_info.get("processing_time")
            })
        
        return {
            "files": files,
            "total_count": result["total_count"],
            "page": result["page"],
            "per_page": result["per_page"]
        }
    
    def update_file(self, file_id: str, markdown_content: str) -> Optional[Dict[str, Any]]:
        """ファイル情報を更新"""
        # 既存ファイルの確認
        existing_file = db_manager.get_file(file_id)
        if not existing_file:
            return None
        
        # 更新処理
        if db_manager.update_file_status(
            file_id, 
            FileStatus.COMPLETED, 
            markdown_content
        ):
            # 更新後のファイル情報を取得
            return self.get_file(file_id)
        
        return None
    
    def delete_file(self, file_id: str) -> bool:
        """ファイルを削除"""
        return db_manager.delete_file(file_id)
    
    def get_file_status(self, file_id: str) -> Optional[str]:
        """ファイルの状態を取得"""
        file_info = db_manager.get_file(file_id)
        return file_info["status"] if file_info else None
    
    def get_conversion_logs(self, file_id: str) -> List[Dict[str, Any]]:
        """変換ログを取得"""
        return db_manager.get_conversion_logs(file_id)
    
    def get_file_statistics(self) -> Dict[str, Any]:
        """ファイル統計情報を取得"""
        try:
            # 全ファイル数を取得
            all_files = db_manager.list_files(page=1, per_page=10000)
            total_files = all_files["total_count"]
            
            # 状態別のファイル数を集計
            status_counts = {"processing": 0, "completed": 0, "failed": 0}
            total_size = 0
            total_processing_time = 0
            
            # ファイルリストが存在する場合のみ処理
            if all_files["files"]:
                for file_info in all_files["files"]:
                    status = file_info.get("status", "unknown")
                    if status in status_counts:
                        status_counts[status] += 1
                    
                    # ファイルサイズの安全な取得
                    file_size = file_info.get("file_size", 0)
                    if isinstance(file_size, (int, float)) and file_size >= 0:
                        total_size += file_size
                    
                    # 処理時間の安全な取得
                    processing_time = file_info.get("processing_time")
                    if isinstance(processing_time, (int, float)) and processing_time >= 0:
                        total_processing_time += processing_time
            
            # 平均処理時間の安全な計算
            average_processing_time = 0
            if total_files > 0 and total_processing_time > 0:
                average_processing_time = round(total_processing_time / total_files, 2)
            
            return {
                "total_files": total_files,
                "status_counts": status_counts,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2) if total_size > 0 else 0,
                "total_processing_time": round(total_processing_time, 2),
                "average_processing_time": average_processing_time
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "total_files": 0,
                "status_counts": {"processing": 0, "completed": 0, "failed": 0},
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "total_processing_time": 0,
                "average_processing_time": 0
            }
    
    def cleanup_old_files(self, days: int = 30) -> Dict[str, Any]:
        """古いファイルをクリーンアップ"""
        try:
            # 指定日数より古いファイルを検索
            from datetime import timedelta
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # データベースから古いファイルを取得
            # 注: 実際の実装では、より効率的なクエリを使用
            all_files = db_manager.list_files(page=1, per_page=10000)
            old_files = []
            
            for file_info in all_files["files"]:
                created_at = datetime.fromisoformat(file_info["created_at"].replace('Z', '+00:00'))
                if created_at < cutoff_date:
                    old_files.append(file_info["id"])
            
            # 古いファイルを削除
            deleted_count = 0
            for file_id in old_files:
                if db_manager.delete_file(file_id):
                    deleted_count += 1
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "total_old_files": len(old_files),
                "cutoff_date": cutoff_date.isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "deleted_count": 0
            }
    
    def get_current_time(self) -> datetime:
        """現在時刻を取得"""
        return datetime.now()
    
    def validate_file_id(self, file_id: str) -> bool:
        """ファイルIDの妥当性を検証"""
        # UUID形式の検証
        import re
        uuid_pattern = re.compile(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            re.IGNORECASE
        )
        return bool(uuid_pattern.match(file_id))
