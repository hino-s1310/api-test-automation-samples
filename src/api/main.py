"""
PDF to Markdown API

PDFファイルをMarkdown形式に変換するAPI
"""

import time
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Path
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    FileResponse, FileListResponse, ErrorResponse, HealthResponse,
    UploadResponse, ConversionResponse
)
from .services.pdf_service import PDFService
from .services.file_service import FileService
from .database import db_manager

# アプリケーションの作成
app = FastAPI(
    title="PDF to Markdown API",
    description="PDFファイルをMarkdown形式に変換するAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# サービスの初期化
pdf_service = PDFService()
file_service = FileService()

# 起動時刻を記録
start_time = time.time()


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """ヘルスチェック"""
    uptime = time.time() - start_time
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        uptime=round(uptime, 2)
    )


@app.post("/upload", response_model=UploadResponse, tags=["Files"])
async def upload_pdf(file: UploadFile = File(...)):
    """PDFファイルをアップロードしてMarkdownに変換"""
    try:
        # ファイルの内容を読み込み
        file_content = await file.read()
        
        # PDF変換処理
        result = await pdf_service.process_pdf_upload(file_content, file.filename)
        
        if result["success"]:
            return UploadResponse(
                message="PDFファイルのアップロードと変換が完了しました",
                id=result["file_id"],
                markdown=result["markdown"],
                status=result["status"]
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result["error"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ファイル処理中にエラーが発生しました: {str(e)}"
        )


@app.get("/files/{file_id}", response_model=FileResponse, tags=["Files"])
async def get_file(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイル情報を取得"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(
            status_code=400,
            detail="無効なファイルID形式です"
        )
    
    file_data = file_service.get_file(file_id)
    if not file_data:
        raise HTTPException(
            status_code=404,
            detail="ファイルが見つかりません"
        )
    
    return FileResponse(
        id=file_data["id"],
        filename=file_data["filename"],
        markdown=file_data["markdown"],
        status=file_data["status"],
        created_at=file_data["created_at"],
        updated_at=file_data["updated_at"],
        file_size=file_data["file_size"],
        processing_time=file_data.get("processing_time")
    )


@app.get("/files", response_model=FileListResponse, tags=["Files"])
async def list_files(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(10, ge=1, le=100, description="1ページあたりの件数")
):
    """ファイル一覧を取得"""
    result = file_service.list_files(page, per_page)
    
    return FileListResponse(
        files=result["files"],
        total_count=result["total_count"],
        page=result["page"],
        per_page=result["per_page"]
    )


@app.put("/files/{file_id}", response_model=ConversionResponse, tags=["Files"])
async def update_file(
    file_id: str = Path(..., description="ファイルID"),
    file: UploadFile = File(...)
):
    """指定されたIDのファイルを新しいPDFで更新・再変換"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(
            status_code=400,
            detail="無効なファイルID形式です"
        )
    
    try:
        # ファイルの内容を読み込み
        file_content = await file.read()
        
        # 再変換処理
        result = await pdf_service.reconvert_pdf(file_id, file_content, file.filename)
        
        if result["success"]:
            return ConversionResponse(
                file_id=result["file_id"],
                markdown=result["markdown"],
                status=result["status"],
                processing_time=result["processing_time"]
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result["error"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ファイル更新中にエラーが発生しました: {str(e)}"
        )


@app.delete("/files/{file_id}", tags=["Files"])
async def delete_file(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイルを削除"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(
            status_code=400,
            detail="無効なファイルID形式です"
        )
    
    success = file_service.delete_file(file_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="ファイルが見つかりません"
        )
    
    return {"message": "ファイルが正常に削除されました"}


@app.get("/files/{file_id}/logs", tags=["Files"])
async def get_file_logs(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイルの変換ログを取得"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(
            status_code=400,
            detail="無効なファイルID形式です"
        )
    
    logs = file_service.get_conversion_logs(file_id)
    if not logs:
        raise HTTPException(
            status_code=404,
            detail="ログが見つかりません"
        )
    
    return {"logs": logs}


@app.get("/statistics", tags=["Statistics"])
async def get_statistics():
    """ファイル統計情報を取得"""
    stats = file_service.get_file_statistics()
    
    if "error" in stats:
        raise HTTPException(
            status_code=500,
            detail=f"統計情報の取得に失敗しました: {stats['error']}"
        )
    
    return stats


@app.post("/cleanup", tags=["Maintenance"])
async def cleanup_old_files(days: int = Query(30, ge=1, le=365, description="削除対象の日数")):
    """古いファイルをクリーンアップ"""
    result = file_service.cleanup_old_files(days)
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"クリーンアップに失敗しました: {result['error']}"
        )
    
    return {
        "message": f"{days}日より古いファイルのクリーンアップが完了しました",
        "deleted_count": result["deleted_count"],
        "total_old_files": result["total_old_files"]
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """HTTP例外のハンドラー"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """一般例外のハンドラー"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "内部サーバーエラーが発生しました",
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
