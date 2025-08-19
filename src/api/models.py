"""
データモデル定義
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum


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
    updated_at: Optional[datetime] = Field(None, description="更新日時")
    file_size: int = Field(..., description="ファイルサイズ（バイト）")
    processing_time: Optional[float] = Field(None, description="処理時間（秒）")


class FileListResponse(BaseModel):
    """ファイル一覧レスポンス"""
    files: List[dict] = Field(..., description="ファイル一覧")
    total_count: int = Field(..., description="総ファイル数")
    page: int = Field(1, description="現在のページ")
    per_page: int = Field(10, description="1ページあたりの件数")


class ErrorResponse(BaseModel):
    """エラーレスポンス"""
    detail: str = Field(..., description="エラーの詳細")
    error_code: Optional[str] = Field(None, description="エラーコード")
    timestamp: datetime = Field(default_factory=datetime.now, description="エラー発生時刻")

# APIが正常に起動しているかをチェックするためのレスポンス
class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str = Field(..., description="サービス状態")
    version: str = Field(..., description="APIバージョン")
    timestamp: datetime = Field(default_factory=datetime.now, description="チェック時刻")
    uptime: Optional[float] = Field(None, description="稼働時間（秒）")

# PDFファイルをMarkdownに変換するAPIのレスポンス
class UploadResponse(BaseModel):
    """アップロードレスポンス"""
    message: str = Field(..., description="メッセージ")
    id: str = Field(..., description="ファイルID")  # フロントエンドに合わせてfile_id -> id
    markdown: str = Field(..., description="変換されたMarkdown")  # フロントエンドが期待するmarkdownフィールドを追加
    status: FileStatus = Field(..., description="処理状態")

# PDFファイルをMarkdownに変換するAPIのリクエスト
class ConversionRequest(BaseModel):
    """変換リクエスト"""
    file_id: str = Field(..., description="ファイルID")
    options: Optional[dict] = Field(default_factory=dict, description="変換オプション")

# PDFファイルをMarkdownに変換するAPIのレスポンス
class ConversionResponse(BaseModel):
    """変換レスポンス"""
    file_id: str = Field(..., description="ファイルID")
    markdown: str = Field(..., description="変換されたMarkdown")
    status: FileStatus = Field(..., description="処理状態")
    processing_time: float = Field(..., description="処理時間（秒）")
