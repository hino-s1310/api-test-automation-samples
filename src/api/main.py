"""
PDF to Markdown API

PDFファイルをMarkdown形式に変換するAPI
"""

import time
from datetime import datetime

from fastapi import FastAPI, File, HTTPException, Path, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database import db_manager
from .models import (
    FileEditHistoryResponse,
    FileEditRequest,
    FileEditResponse,
    FileListResponse,
    FileResponse,
    FileSearchRequest,
    FileSearchResponse,
    HealthResponse,
    UploadResponse,
)
from .services.file_service import FileService
from .services.pdf_service import PDFService

# アプリケーションの作成
app = FastAPI(
    title="PDF to Markdown API",
    description="PDFファイルをMarkdown形式に変換するAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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
    return HealthResponse(status="healthy", version="1.0.0", uptime=round(uptime, 2))


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
                status=result["status"],
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"ファイル処理中にエラーが発生しました: {str(e)}"
        ) from e


@app.get("/files/{file_id}", response_model=FileResponse, tags=["Files"])
async def get_file(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイル情報を取得"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    file_data = file_service.get_file(file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    return FileResponse(
        id=file_data["id"],
        filename=file_data["filename"],
        markdown=file_data["markdown"],
        status=file_data["status"],
        created_at=file_data["created_at"],
        updated_at=file_data["updated_at"],
        file_size=file_data["file_size"],
        processing_time=file_data.get("processing_time"),
    )


@app.get("/files", response_model=FileListResponse, tags=["Files"])
async def list_files(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(10, ge=1, le=100, description="1ページあたりの件数"),
):
    """ファイル一覧を取得"""
    result = file_service.list_files(page, per_page)

    return FileListResponse(
        files=result["files"],
        total_count=result["total_count"],
        page=result["page"],
        per_page=result["per_page"],
    )


@app.post("/files/search", response_model=FileSearchResponse, tags=["File Search"])
async def search_files(search_request: FileSearchRequest):
    """ファイルを検索・フィルタリング"""
    try:
        result = file_service.search_files(
            query=search_request.query,
            status=search_request.status,
            is_edited=search_request.is_edited,
            page=search_request.page,
            per_page=search_request.per_page,
        )

        # 適用されたフィルターを記録
        filters = {}
        if search_request.query:
            filters["query"] = search_request.query
        if search_request.status:
            filters["status"] = search_request.status
        if search_request.is_edited is not None:
            filters["is_edited"] = search_request.is_edited

        return FileSearchResponse(
            files=result["files"],
            total_count=result["total_count"],
            page=result["page"],
            per_page=result["per_page"],
            filters=filters,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"ファイル検索中にエラーが発生しました: {str(e)}"
        ) from e


@app.put("/files/{file_id}", response_model=FileResponse, tags=["Files"])
async def update_file(
    file_id: str = Path(..., description="ファイルID"), file: UploadFile = File(...)
):
    """指定されたIDのファイルを新しいPDFで更新・再変換"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    try:
        # ファイルの内容を読み込み
        file_content = await file.read()

        # 再変換処理
        result = await pdf_service.reconvert_pdf(file_id, file_content, file.filename)

        if result["success"]:
            # 更新後のファイル情報を取得
            file_data = file_service.get_file(file_id)
            if not file_data:
                raise HTTPException(
                    status_code=404, detail="更新されたファイルが見つかりません"
                )

            return FileResponse(
                id=file_data["id"],
                filename=file_data["filename"],
                markdown=file_data["markdown"],
                status=file_data["status"],
                created_at=file_data["created_at"],
                updated_at=file_data["updated_at"],
                file_size=file_data["file_size"],
                processing_time=file_data.get("processing_time"),
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"ファイル更新中にエラーが発生しました: {str(e)}"
        ) from e


@app.delete("/files/{file_id}", tags=["Files"])
async def delete_file(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイルを削除"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    success = file_service.delete_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    return {"message": "ファイルが正常に削除されました"}


@app.put(
    "/files/{file_id}/edit", response_model=FileEditResponse, tags=["File Editing"]
)
async def edit_file(
    file_id: str = Path(..., description="ファイルID"),
    edit_request: FileEditRequest = ...,
):
    """指定されたIDのファイルを編集（ファイル名・Markdown内容）"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    try:
        # ファイル編集処理
        result = file_service.edit_file(
            file_id=file_id,
            new_filename=edit_request.filename,
            new_content=edit_request.markdown_content,
            edit_reason=edit_request.edit_reason,
            edited_by=edit_request.edited_by,
        )

        if result["success"]:
            return FileEditResponse(
                id=file_id,
                filename=result["filename"],
                markdown=result["markdown"],
                status=result["status"],
                updated_at=result["updated_at"],
                last_edited_at=result["last_edited_at"],
                edit_count=result["edit_count"],
                is_edited=result["is_edited"],
                message="ファイルが正常に編集されました",
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"ファイル編集中にエラーが発生しました: {str(e)}"
        ) from e


@app.get("/files/{file_id}/logs", tags=["Files"])
async def get_file_logs(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイルの変換ログを取得"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    logs = file_service.get_conversion_logs(file_id)
    if not logs:
        raise HTTPException(status_code=404, detail="ログが見つかりません")

    return {"logs": logs}


@app.get(
    "/files/{file_id}/history",
    response_model=list[FileEditHistoryResponse],
    tags=["File Editing"],
)
async def get_file_edit_history(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイルの編集履歴を取得"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    try:
        history = file_service.get_file_edit_history(file_id)
        return history
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"編集履歴の取得に失敗しました: {str(e)}"
        ) from e


@app.post(
    "/files/{file_id}/revert", response_model=FileEditResponse, tags=["File Editing"]
)
async def revert_file_to_version(
    file_id: str = Path(..., description="ファイルID"),
    history_id: int = Query(..., description="復元したい履歴ID"),
):
    """指定された履歴IDのバージョンにファイルを復元"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    try:
        # ファイル復元処理
        result = file_service.revert_file_to_version(file_id, history_id)

        if result["success"]:
            return FileEditResponse(
                id=file_id,
                filename=result["filename"],
                markdown=result["markdown"],
                status=result["status"],
                updated_at=result["updated_at"],
                last_edited_at=result["last_edited_at"],
                edit_count=result["edit_count"],
                is_edited=result["is_edited"],
                message=f"ファイルが履歴ID {history_id} のバージョンに復元されました",
            )
        else:
            raise HTTPException(status_code=400, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"ファイル復元中にエラーが発生しました: {str(e)}"
        ) from e


@app.get("/statistics", tags=["Statistics"])
async def get_statistics():
    """ファイル統計情報を取得"""
    stats = file_service.get_file_statistics()

    if "error" in stats:
        raise HTTPException(
            status_code=500, detail=f"統計情報の取得に失敗しました: {stats['error']}"
        )

    return stats


@app.post("/cleanup", tags=["Maintenance"])
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


@app.post("/files/batch-edit", tags=["File Editing"])
async def batch_edit_files(
    file_ids: list[str] = Query(..., description="編集対象のファイルID一覧"),
    new_filename: str = Query(None, description="新しいファイル名（全ファイルに適用）"),
    new_content: str = Query(
        None, description="新しいMarkdown内容（全ファイルに適用）"
    ),
    edit_reason: str = Query(..., description="編集理由"),
    edited_by: str = Query("system", description="編集者"),
):
    """複数のファイルを一括編集"""
    try:
        if not file_ids:
            raise HTTPException(
                status_code=400, detail="ファイルIDが指定されていません"
            )

        if not new_filename and not new_content:
            raise HTTPException(
                status_code=400,
                detail="ファイル名または内容のいずれかを指定してください",
            )

        result = file_service.batch_edit_files(
            file_ids=file_ids,
            new_filename=new_filename,
            new_content=new_content,
            edit_reason=edit_reason,
            edited_by=edited_by,
        )

        if result["success"]:
            return {
                "message": f"{len(file_ids)}件のファイルが一括編集されました",
                "edited_count": result["edited_count"],
                "failed_count": result["failed_count"],
                "failed_files": result["failed_files"],
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"一括編集中にエラーが発生しました: {str(e)}"
        ) from e


@app.delete("/files/batch-delete", tags=["File Editing"])
async def batch_delete_files(
    file_ids: list[str] = Query(..., description="削除対象のファイルID一覧"),
):
    """複数のファイルを一括削除"""
    try:
        if not file_ids:
            raise HTTPException(
                status_code=400, detail="ファイルIDが指定されていません"
            )

        result = file_service.batch_delete_files(file_ids)

        if result["success"]:
            return {
                "message": f"{len(file_ids)}件のファイルが一括削除されました",
                "deleted_count": result["deleted_count"],
                "failed_count": result["failed_count"],
                "failed_files": result["failed_files"],
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"一括削除中にエラーが発生しました: {str(e)}"
        ) from e


@app.post("/test/reset-db", tags=["Testing"])
async def reset_test_database():
    """テスト用：データベースをリセット（テスト環境のみ）"""
    import os

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


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """HTTP例外のハンドラー"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """一般例外のハンドラー"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "内部サーバーエラーが発生しました",
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
