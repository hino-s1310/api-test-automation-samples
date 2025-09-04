"""
システム関連のルーター

ヘルスチェック、統計情報、クリーンアップ、テスト用エンドポイントを定義
"""

import os
import time

from fastapi import APIRouter, HTTPException, Query

from ..cache import cache_manager
from ..database import db_manager
from ..models import HealthResponse
from ..services.file_service import FileService

# ルーターの作成
router = APIRouter(prefix="/system", tags=["System"])

# サービスの初期化
file_service = FileService()

# 起動時刻を記録
start_time = time.time()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """ヘルスチェック"""
    uptime = time.time() - start_time
    return HealthResponse(status="healthy", version="1.0.0", uptime=round(uptime, 2))


@router.get("/statistics", tags=["Statistics"])
async def get_statistics():
    """ファイル統計情報を取得"""
    stats = file_service.get_file_statistics()

    if "error" in stats:
        raise HTTPException(
            status_code=500, detail=f"統計情報の取得に失敗しました: {stats['error']}"
        )

    return stats


@router.post("/cleanup", tags=["Maintenance"])
async def cleanup_old_files(
    days: int = Query(30, ge=1, le=365, description="削除対象の日数"),
):
    """古いファイルをクリーンアップ"""
    result = file_service.cleanup_old_files(days)

    if not result["success"]:
        raise HTTPException(
            status_code=500, detail=f"クリーンアップに失敗しました: {result['error']}"
        )

    return {
        "message": f"{days}日より古いファイルのクリーンアップが完了しました",
        "deleted_count": result["deleted_count"],
        "total_old_files": result["total_old_files"],
    }


@router.post("/test/reset-db", tags=["Testing"])
async def reset_test_database():
    """テスト用：データベースをリセット（テスト環境のみ）"""
    if os.getenv("ENVIRONMENT") != "test":
        raise HTTPException(
            status_code=403, detail="この操作はテスト環境でのみ利用可能です"
        )

    if db_manager.clear_all_data():
        return {"message": "テストデータベースがリセットされました"}
    else:
        raise HTTPException(
            status_code=500, detail="データベースのリセットに失敗しました"
        )


@router.get("/test/db-state/{file_id}", tags=["Testing"])
async def get_database_state(file_id: str):
    """テスト用：特定ファイルのデータベース状態を確認（テスト環境のみ）"""
    if os.getenv("ENVIRONMENT") != "test":
        raise HTTPException(
            status_code=403, detail="この操作はテスト環境でのみ利用可能です"
        )

    try:
        file_data = db_manager.get_file(file_id)
        if not file_data:
            raise HTTPException(status_code=404, detail="ファイルが見つかりません")

        return {
            "id": file_data["id"],
            "filename": file_data["filename"],
            "status": file_data["status"],
            "markdown_content": file_data.get("markdown_content"),
            "file_size": file_data["file_size"],
            "created_at": file_data["created_at"],
            "updated_at": file_data["updated_at"],
            "processing_time": file_data.get("processing_time"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"データベース状態の取得に失敗しました: {str(e)}"
        )


@router.get("/cache/stats", tags=["Cache"])
async def get_cache_stats():
    """キャッシュ統計情報を取得"""
    try:
        stats = cache_manager.get_stats()
        return {"cache_enabled": True, "stats": stats}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"キャッシュ統計情報の取得に失敗しました: {str(e)}"
        )


@router.post("/cache/clear", tags=["Cache"])
async def clear_cache():
    """全キャッシュをクリア"""
    try:
        cache_manager.clear()
        return {"message": "キャッシュがクリアされました"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"キャッシュのクリアに失敗しました: {str(e)}"
        )


@router.post("/cache/cleanup", tags=["Cache"])
async def cleanup_expired_cache():
    """期限切れのキャッシュをクリーンアップ"""
    try:
        cleaned_count = cache_manager.cleanup_expired()
        return {
            "message": f"期限切れのキャッシュを{cleaned_count}件クリーンアップしました",
            "cleaned_count": cleaned_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"キャッシュのクリーンアップに失敗しました: {str(e)}",
        )
