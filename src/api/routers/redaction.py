"""
機密情報設定関連のルーター

機密情報設定のCRUD操作、インポート/エクスポートなどのエンドポイントを定義
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, Response

from ..models import (
    RedactionSettingsCreateRequest,
    RedactionSettingsImportRequest,
    RedactionSettingsListResponse,
    RedactionSettingsResponse,
    RedactionSettingsUpdateRequest,
)
from ..repositories.redaction_repository import (
    RedactionDatabaseError,
    RedactionValidationError,
)
from ..services.redaction_persistence_service import RedactionPersistenceService
from ..services.redaction_service import RedactionService

logger = logging.getLogger(__name__)

# ルーターの作成
router = APIRouter(prefix="/files", tags=["Redaction Settings"])


def get_redaction_service() -> RedactionService:
    """RedactionServiceの依存性注入"""
    return RedactionService()


def get_persistence_service() -> RedactionPersistenceService:
    """RedactionPersistenceServiceの依存性注入"""
    return RedactionPersistenceService()


def get_user_id(x_user_id: Annotated[str | None, Header()] = None) -> str:
    """ユーザーIDをヘッダーから取得"""
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-IDヘッダーが必要です")
    return x_user_id


def validate_file_id(file_id: str) -> str:
    """ファイルIDのバリデーション"""
    if not file_id or len(file_id.strip()) == 0:
        raise HTTPException(status_code=400, detail="ファイルIDが無効です")
    return file_id


def validate_settings_id(settings_id: int) -> int:
    """設定IDのバリデーション"""
    if settings_id <= 0:
        raise HTTPException(status_code=400, detail="設定IDが無効です")
    return settings_id


@router.get(
    "/{file_id}/redaction-settings",
    response_model=RedactionSettingsListResponse,
    summary="機密情報設定の一覧取得",
    description="指定されたファイルの機密情報設定一覧を取得します",
)
async def list_redaction_settings(
    file_id: Annotated[str, Path(description="ファイルID")],
    user_id: Annotated[str, Depends(get_user_id)],
    redaction_service: Annotated[RedactionService, Depends(get_redaction_service)],
    limit: Annotated[int, Query(ge=1, le=100, description="取得件数上限")] = 10,
    offset: Annotated[int, Query(ge=0, description="オフセット")] = 0,
    is_shared: Annotated[bool | None, Query(description="共有設定フィルタ")] = None,
):
    """機密情報設定の一覧を取得"""
    try:
        validate_file_id(file_id)

        result = redaction_service.list_redaction_settings(
            user_id=user_id,
            file_id=file_id,
            is_shared=is_shared,
            limit=limit,
            offset=offset,
        )

        return RedactionSettingsListResponse(**result)

    except RedactionValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RedactionDatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラーが発生しました")


@router.get(
    "/{file_id}/redaction-settings/{settings_id}",
    response_model=RedactionSettingsResponse,
    summary="機密情報設定の取得",
    description="指定された機密情報設定の詳細を取得します",
)
async def get_redaction_settings(
    file_id: Annotated[str, Path(description="ファイルID")],
    settings_id: Annotated[int, Path(description="設定ID")],
    user_id: Annotated[str, Depends(get_user_id)],
    redaction_service: Annotated[RedactionService, Depends(get_redaction_service)],
):
    """機密情報設定を取得"""
    try:
        validate_file_id(file_id)
        validate_settings_id(settings_id)

        result = redaction_service.get_redaction_settings(settings_id)

        if result is None:
            raise HTTPException(status_code=404, detail="機密情報設定が見つかりません")

        return RedactionSettingsResponse(**result)

    except HTTPException:
        raise
    except RedactionValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RedactionDatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラーが発生しました")


@router.post(
    "/{file_id}/redaction-settings",
    response_model=RedactionSettingsResponse,
    status_code=201,
    summary="機密情報設定の作成",
    description="新しい機密情報設定を作成します",
)
async def create_redaction_settings(
    file_id: Annotated[str, Path(description="ファイルID")],
    request: RedactionSettingsCreateRequest,
    user_id: Annotated[str, Depends(get_user_id)],
    redaction_service: Annotated[RedactionService, Depends(get_redaction_service)],
):
    """機密情報設定を作成"""
    try:
        validate_file_id(file_id)

        result = redaction_service.create_redaction_settings(
            file_id=file_id,
            user_id=user_id,
            name=request.name,
            description=request.description,
            show_all=request.show_all,
            level_settings=request.level_settings,
            revealed_items=request.revealed_items,
            is_shared=request.is_shared,
        )

        return RedactionSettingsResponse(**result)

    except RedactionValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RedactionDatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラーが発生しました")


@router.put(
    "/{file_id}/redaction-settings/{settings_id}",
    response_model=RedactionSettingsResponse,
    summary="機密情報設定の更新",
    description="既存の機密情報設定を更新します",
)
async def update_redaction_settings(
    file_id: Annotated[str, Path(description="ファイルID")],
    settings_id: Annotated[int, Path(description="設定ID")],
    request: RedactionSettingsUpdateRequest,
    user_id: Annotated[str, Depends(get_user_id)],
    redaction_service: Annotated[RedactionService, Depends(get_redaction_service)],
):
    """機密情報設定を更新"""
    try:
        validate_file_id(file_id)
        validate_settings_id(settings_id)

        result = redaction_service.update_redaction_settings(
            settings_id=settings_id,
            name=request.name,
            description=request.description,
            show_all=request.show_all,
            level_settings=request.level_settings,
            revealed_items=request.revealed_items,
            is_shared=request.is_shared,
        )

        if result is None:
            raise HTTPException(status_code=404, detail="機密情報設定が見つかりません")

        return RedactionSettingsResponse(**result)

    except HTTPException:
        raise
    except RedactionValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RedactionDatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラーが発生しました")


@router.delete(
    "/{file_id}/redaction-settings/{settings_id}",
    status_code=204,
    summary="機密情報設定の削除",
    description="機密情報設定を削除します",
)
async def delete_redaction_settings(
    file_id: Annotated[str, Path(description="ファイルID")],
    settings_id: Annotated[int, Path(description="設定ID")],
    user_id: Annotated[str, Depends(get_user_id)],
    redaction_service: Annotated[RedactionService, Depends(get_redaction_service)],
):
    """機密情報設定を削除"""
    try:
        validate_file_id(file_id)
        validate_settings_id(settings_id)

        result = redaction_service.delete_redaction_settings(settings_id)

        if not result:
            raise HTTPException(status_code=404, detail="機密情報設定が見つかりません")

        return Response(status_code=204)

    except HTTPException:
        raise
    except RedactionValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RedactionDatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラーが発生しました")


@router.get(
    "/{file_id}/redaction-settings/{settings_id}/export",
    response_class=Response,
    summary="機密情報設定のエクスポート",
    description="機密情報設定をJSON形式でエクスポートします",
)
async def export_redaction_settings(
    file_id: Annotated[str, Path(description="ファイルID")],
    settings_id: Annotated[int, Path(description="設定ID")],
    user_id: Annotated[str, Depends(get_user_id)],
    persistence_service: Annotated[
        RedactionPersistenceService, Depends(get_persistence_service)
    ],
):
    """機密情報設定をエクスポート"""
    try:
        validate_file_id(file_id)
        validate_settings_id(settings_id)

        json_data = persistence_service.export_settings_to_json(settings_id)

        return Response(
            content=json_data,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=redaction_settings_{settings_id}.json"
            },
        )

    except ValueError as e:
        logger.warning(f"エクスポートエラー: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except RedactionValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RedactionDatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラーが発生しました")


@router.post(
    "/{file_id}/redaction-settings/import",
    response_model=RedactionSettingsResponse,
    status_code=201,
    summary="機密情報設定のインポート",
    description="JSON形式の機密情報設定をインポートします",
)
async def import_redaction_settings(
    file_id: Annotated[str, Path(description="ファイルID")],
    request: RedactionSettingsImportRequest,
    user_id: Annotated[str, Depends(get_user_id)],
    persistence_service: Annotated[
        RedactionPersistenceService, Depends(get_persistence_service)
    ],
):
    """機密情報設定をインポート"""
    try:
        validate_file_id(file_id)

        result = persistence_service.import_settings_from_json(
            file_id=file_id,
            user_id=user_id,
            json_data=request.settings_data,
        )

        return RedactionSettingsResponse(**result)

    except ValueError as e:
        logger.warning(f"インポートエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RedactionValidationError as e:
        logger.warning(f"バリデーションエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RedactionDatabaseError as e:
        logger.error(f"データベースエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="内部サーバーエラーが発生しました")
