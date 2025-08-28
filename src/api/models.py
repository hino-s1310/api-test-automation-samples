"""
データモデル定義
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class FileStatus(str, Enum):
    """ファイルの状態"""

    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileResponse(BaseModel):
    """ファイルレスポンス"""

    id: str = Field(..., description="ファイルID")
    filename: str = Field(..., description="ファイル名")
    markdown: str = Field(..., description="変換されたMarkdown")
    status: FileStatus = Field(..., description="処理状態")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime | None = Field(None, description="更新日時")
    file_size: int = Field(..., description="ファイルサイズ（バイト）")
    processing_time: float | None = Field(None, description="処理時間（秒）")


class FileListResponse(BaseModel):
    """ファイル一覧レスポンス"""

    files: list[dict] = Field(..., description="ファイル一覧")
    total_count: int = Field(..., description="総ファイル数")
    page: int = Field(1, description="現在のページ")
    per_page: int = Field(10, description="1ページあたりの件数")


class ErrorResponse(BaseModel):
    """エラーレスポンス"""

    detail: str = Field(..., description="エラーの詳細")
    error_code: str | None = Field(None, description="エラーコード")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="エラー発生時刻"
    )


# APIが正常に起動しているかをチェックするためのレスポンス
class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""

    status: str = Field(..., description="サービス状態")
    version: str = Field(..., description="APIバージョン")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="チェック時刻"
    )
    uptime: float | None = Field(None, description="稼働時間（秒）")


# PDFファイルをMarkdownに変換するAPIのレスポンス
class UploadResponse(BaseModel):
    """アップロードレスポンス"""

    message: str = Field(..., description="メッセージ")
    id: str = Field(
        ..., description="ファイルID"
    )  # フロントエンドに合わせてfile_id -> id
    markdown: str = Field(
        ..., description="変換されたMarkdown"
    )  # フロントエンドが期待するmarkdownフィールドを追加
    status: FileStatus = Field(..., description="処理状態")


# PDFファイルをMarkdownに変換するAPIのリクエスト
class ConversionRequest(BaseModel):
    """変換リクエスト"""

    file_id: str = Field(..., description="ファイルID")
    options: dict | None = Field(default_factory=dict, description="変換オプション")


# PDFファイルをMarkdownに変換するAPIのレスポンス
class ConversionResponse(BaseModel):
    """変換レスポンス"""

    file_id: str = Field(..., description="ファイルID")
    markdown: str = Field(..., description="変換されたMarkdown")
    status: FileStatus = Field(..., description="処理状態")
    processing_time: float = Field(..., description="処理時間（秒）")


class FileEditRequest(BaseModel):
    """ファイル編集リクエスト"""

    filename: str | None = Field(None, description="新しいファイル名")
    markdown_content: str | None = Field(None, description="新しいMarkdown内容")
    edit_reason: str | None = Field(None, description="編集理由")
    edited_by: str = Field("system", description="編集者")


class FileEditResponse(BaseModel):
    """ファイル編集レスポンス"""

    id: str = Field(..., description="ファイルID")
    filename: str = Field(..., description="更新されたファイル名")
    markdown: str = Field(..., description="更新されたMarkdown")
    status: FileStatus = Field(..., description="処理状態")
    updated_at: datetime = Field(..., description="更新日時")
    last_edited_at: datetime = Field(..., description="最終編集日時")
    edit_count: int = Field(..., description="編集回数")
    is_edited: bool = Field(..., description="編集済みフラグ")
    message: str = Field(..., description="更新メッセージ")


class FileEditHistoryResponse(BaseModel):
    """ファイル編集履歴レスポンス"""

    id: int = Field(..., ge=0, description="履歴ID")
    file_id: str = Field(..., description="ファイルID")
    original_filename: str = Field(..., description="元のファイル名")
    original_content: str = Field(..., description="元の内容")
    edited_filename: str = Field(..., description="編集後のファイル名")
    edited_content: str = Field(..., description="編集後の内容")
    edit_reason: str | None = Field(None, description="編集理由")
    edited_by: str = Field(..., description="編集者")
    created_at: datetime = Field(..., description="編集日時")


class FileSearchRequest(BaseModel):
    """ファイル検索リクエスト"""

    query: str | None = Field(None, description="検索クエリ")
    status: str | None = Field(None, description="ステータスフィルター")
    is_edited: bool | None = Field(None, description="編集済みフィルター")
    page: int = Field(1, gt=0, description="ページ番号")
    per_page: int = Field(10, gt=0, description="1ページあたりの件数")


class FileSearchResponse(BaseModel):
    """ファイル検索レスポンス"""

    files: list[dict] = Field(..., description="ファイル一覧")
    total_count: int = Field(..., description="総ファイル数")
    page: int = Field(1, description="現在のページ")
    per_page: int = Field(10, description="1ページあたりの件数")
    filters: dict = Field(..., description="適用されたフィルター")
