"""
テスト生成関連のルーター

AIを使用してMarkdownからテストコードを生成するエンドポイントを定義
"""

from fastapi import APIRouter, HTTPException, Path

from ..models import (
    GeneratedTestListResponse,
    GeneratedTestResponse,
    TestGenerationRequest,
)
from ..services.file_service import FileService
from ..services.test_generation_service import TestGenerationService

router = APIRouter(prefix="/files", tags=["Test Generation"])

file_service = FileService()
test_generation_service = TestGenerationService()


@router.post(
    "/{file_id}/generate-tests",
    response_model=GeneratedTestResponse,
    tags=["Test Generation"],
)
async def generate_tests(
    file_id: str = Path(..., description="ファイルID"),
    request: TestGenerationRequest = TestGenerationRequest(),
):
    """指定されたファイルのMarkdownからテストを自動生成"""
    # AI API利用可能チェック
    if not test_generation_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="AI APIが利用できません。環境変数 AI_API_KEY を設定してください。",
        )

    # ファイルIDの妥当性を検証
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    # ファイル取得
    file_data = file_service.get_file(file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    markdown_content = file_data.get("markdown", "")
    if not markdown_content or not markdown_content.strip():
        raise HTTPException(
            status_code=400, detail="Markdownコンテンツが空です"
        )

    # リクエストバリデーション
    valid_frameworks = {"pytest", "jest", "playwright"}
    if request.test_framework not in valid_frameworks:
        raise HTTPException(
            status_code=400,
            detail=f"無効なテストフレームワーク: {request.test_framework}。"
            f"有効な値: {', '.join(valid_frameworks)}",
        )

    valid_languages = {"python", "typescript"}
    if request.language not in valid_languages:
        raise HTTPException(
            status_code=400,
            detail=f"無効な言語: {request.language}。"
            f"有効な値: {', '.join(valid_languages)}",
        )

    valid_test_types = {"unit", "integration", "e2e"}
    if request.test_type not in valid_test_types:
        raise HTTPException(
            status_code=400,
            detail=f"無効なテスト種類: {request.test_type}。"
            f"有効な値: {', '.join(valid_test_types)}",
        )

    # テスト生成実行
    try:
        result = await test_generation_service.generate_tests(
            markdown_content, request
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"テスト生成中にエラーが発生しました: {str(e)}",
        ) from e

    if not result["success"]:
        error_code = result.get("error_code", "UNKNOWN_ERROR")
        if error_code == "RATE_LIMITED":
            raise HTTPException(status_code=429, detail=result["error"])
        elif error_code == "TIMEOUT":
            raise HTTPException(status_code=504, detail=result["error"])
        else:
            raise HTTPException(status_code=500, detail=result["error"])

    # DBに保存
    try:
        generated_test = test_generation_service.save_generated_test(
            file_id, result, request
        )
        return generated_test.to_response()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"テスト生成結果の保存中にエラーが発生しました: {str(e)}",
        ) from e


@router.get(
    "/{file_id}/generated-tests",
    response_model=GeneratedTestListResponse,
    tags=["Test Generation"],
)
async def list_generated_tests(
    file_id: str = Path(..., description="ファイルID"),
):
    """指定されたファイルの生成テスト一覧を取得"""
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    file_data = file_service.get_file(file_id)
    if not file_data:
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    try:
        tests = test_generation_service.get_generated_tests(file_id)
        return GeneratedTestListResponse(
            tests=[t.to_summary() for t in tests],
            total_count=len(tests),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"テスト生成履歴の取得中にエラーが発生しました: {str(e)}",
        ) from e


@router.get(
    "/{file_id}/generated-tests/{test_id}",
    response_model=GeneratedTestResponse,
    tags=["Test Generation"],
)
async def get_generated_test(
    file_id: str = Path(..., description="ファイルID"),
    test_id: int = Path(..., description="テスト生成ID"),
):
    """指定されたテスト生成の詳細を取得"""
    if not file_service.validate_file_id(file_id):
        raise HTTPException(status_code=400, detail="無効なファイルID形式です")

    try:
        generated_test = test_generation_service.get_generated_test_by_id(
            file_id, test_id
        )
        if not generated_test:
            raise HTTPException(
                status_code=404, detail="テスト生成結果が見つかりません"
            )

        return generated_test.to_response()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"テスト生成結果の取得中にエラーが発生しました: {str(e)}",
        ) from e
