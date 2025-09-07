"""
ファイル関連のルーター

ファイルのCRUD操作、検索、編集、履歴管理などのエンドポイントを定義
"""

from typing import Annotated

from fastapi import APIRouter, File, Header, HTTPException, Path, Query, UploadFile

from ..models import (
    FileEditHistoryListResponse,
    FileEditRequest,
    FileEditResponse,
    FileListResponse,
    FileResponse,
    FileSearchRequest,
    FileSearchResponse,
    UploadResponse,
)
from ..services.file_service import FileService
from ..services.pdf_service import PDFService
from ..services.redaction_persistence_service import RedactionPersistenceService
from ..services.redaction_service import RedactionService

# ルーターの作成
router = APIRouter(prefix="/files", tags=["Files"])

# サービスの初期化
pdf_service = PDFService()
file_service = FileService()
redaction_service = RedactionService()
persistence_service = RedactionPersistenceService()


def get_user_id(x_user_id: Annotated[str | None, Header()] = None) -> str:
    """ユーザーIDをヘッダーから取得"""
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-IDヘッダーが必要です")
    return x_user_id


@router.post("/upload", response_model=UploadResponse, tags=["Files"])
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


@router.delete("/batch-delete", tags=["File Editing"])
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


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: str = Path(..., description="ファイルID"),
    include_redaction_settings: bool = Query(
        False, description="赤セルシート設定を含めるかどうか"
    ),
    user_id: Annotated[str, Header()] = None,
):
    """指定されたIDのファイル情報を取得"""
    try:
        # 赤セルシート設定を含める場合はユーザーIDが必要
        if include_redaction_settings and not user_id:
            raise HTTPException(status_code=400, detail="X-User-IDヘッダーが必要です")

        # ファイルIDの妥当性を検証
        if not file_service.validate_file_id(file_id):
            raise HTTPException(status_code=400, detail="無効なファイルID形式です")

        file_data = file_service.get_file(file_id)
        if not file_data:
            raise HTTPException(status_code=404, detail="ファイルが見つかりません")

        # 赤セルシート設定を含める場合
        redaction_settings = None
        if include_redaction_settings and user_id:
            try:
                settings_list = redaction_service.list_redaction_settings(
                    user_id=user_id, file_id=file_id, limit=10, offset=0
                )
                redaction_settings = settings_list.get("settings", [])
            except Exception:
                # 赤セルシート設定の取得に失敗してもファイル情報は返す
                redaction_settings = []

        response_data = {
            "id": file_data["id"],
            "filename": file_data["filename"],
            "markdown": file_data.get("markdown", ""),
            "status": file_data["status"],
            "created_at": file_data["created_at"],
            "updated_at": file_data["updated_at"],
            "file_size": file_data["file_size"],
            "processing_time": file_data.get("processing_time"),
        }

        if include_redaction_settings:
            response_data["redaction_settings"] = redaction_settings

        return FileResponse(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"ファイル処理中にエラーが発生しました: {str(e)}"
        ) from e


@router.get("/", response_model=FileListResponse)
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


@router.post("/search", response_model=FileSearchResponse, tags=["File Search"])
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


@router.put("/{file_id}", response_model=FileResponse)
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
                markdown=file_data.get("markdown", ""),
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


@router.delete("/{file_id}")
async def delete_file(
    file_id: str = Path(..., description="ファイルID"),
    user_id: Annotated[str, Header()] = None,
):
    """指定されたIDのファイルを削除"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    try:
        # ファイル削除処理
        success = file_service.delete_file(file_id)
        if not success:
            raise HTTPException(status_code=404, detail="ファイルが見つかりません")

        # 関連する赤セルシート設定も削除
        if user_id:
            try:
                # ファイルに関連する赤セルシート設定を取得
                settings_list = redaction_service.list_redaction_settings(
                    user_id=user_id, file_id=file_id, limit=100, offset=0
                )

                # 各設定を削除
                for setting in settings_list.get("settings", []):
                    try:
                        redaction_service.delete_redaction_settings(setting["id"])
                    except Exception:
                        # 個別の設定削除に失敗しても続行
                        pass
            except Exception:
                # 赤セルシート設定の削除に失敗してもファイル削除は成功とする
                pass

        return {"message": "ファイルが正常に削除されました"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"ファイル削除中にエラーが発生しました: {str(e)}"
        ) from e


@router.put("/{file_id}/edit", response_model=FileEditResponse, tags=["File Editing"])
async def edit_file(
    file_id: str = Path(..., description="ファイルID"),
    edit_request: FileEditRequest = ...,
    user_id: Annotated[str, Header()] = None,
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
            # 赤セルシート設定が含まれている場合は保存
            if (
                hasattr(edit_request, "redaction_settings")
                and edit_request.redaction_settings
                and user_id
            ):
                try:
                    redaction_service.create_redaction_settings(
                        file_id=file_id,
                        user_id=user_id,
                        name=f"Auto-saved settings for {result['filename']}",
                        description=f"自動保存された設定 - {edit_request.edit_reason or 'ファイル編集時'}",
                        show_all=getattr(
                            edit_request.redaction_settings, "show_all", False
                        ),
                        level_settings=getattr(
                            edit_request.redaction_settings, "level_settings", {}
                        ),
                        revealed_items=getattr(
                            edit_request.redaction_settings, "revealed_items", []
                        ),
                        is_shared=False,
                    )
                except Exception:
                    # 赤セルシート設定の保存に失敗してもファイル編集は成功とする
                    pass

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


@router.get("/{file_id}/logs")
async def get_file_logs(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイルの変換ログを取得"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    logs = file_service.get_conversion_logs(file_id)
    return {"logs": logs}


@router.get("/{file_id}/history", response_model=FileEditHistoryListResponse)
async def get_file_edit_history(file_id: str = Path(..., description="ファイルID")):
    """指定されたIDのファイルの編集履歴を取得"""
    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    history = file_service.get_file_edit_history(file_id)
    return FileEditHistoryListResponse(history=history)


@router.post(
    "/{file_id}/revert", response_model=FileEditResponse, tags=["File Editing"]
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
