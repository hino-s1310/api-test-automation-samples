"""
データモデル定義
"""

import json
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field
from sqlmodel import Field as SQLField
from sqlmodel import Relationship, SQLModel


class FileStatus(str, Enum):
    """ファイルの状態"""

    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RedactionLevel(str, Enum):
    """赤セルシートレベル"""

    LEVEL1 = "level1"  # 最高機密
    LEVEL2 = "level2"  # 一般機密
    LEVEL3 = "level3"  # 内部限定


# ===========================
# SQLModel データベースモデル
# ===========================


class File(SQLModel, table=True):
    """ファイルデータベースモデル"""

    __tablename__ = "files"

    id: str = SQLField(primary_key=True, description="ファイルID")
    filename: str = SQLField(description="ファイル名")
    original_path: str = SQLField(description="元ファイルパス")
    markdown_path: str | None = SQLField(
        default=None, description="Markdownファイルパス"
    )
    markdown_content: str | None = SQLField(default=None, description="Markdown内容")
    status: FileStatus = SQLField(default=FileStatus.PROCESSING, description="処理状態")
    file_size: int = SQLField(description="ファイルサイズ（バイト）")
    created_at: datetime = SQLField(
        default_factory=datetime.now, description="作成日時"
    )
    updated_at: datetime | None = SQLField(default=None, description="更新日時")
    processing_time: float | None = SQLField(default=None, description="処理時間（秒）")
    file_metadata: str | None = SQLField(
        default=None, description="メタデータ（JSON文字列）"
    )
    last_edited_at: datetime | None = SQLField(default=None, description="最終編集日時")
    edit_count: int = SQLField(default=0, description="編集回数")
    is_edited: bool = SQLField(default=False, description="編集済みフラグ")

    # リレーションシップ（遅延読み込み）
    conversion_logs: list["ConversionLog"] = Relationship(
        back_populates="file", sa_relationship_kwargs={"lazy": "selectin"}
    )
    edit_history: list["FileEditHistory"] = Relationship(
        back_populates="file", sa_relationship_kwargs={"lazy": "selectin"}
    )
    redaction_settings: list["RedactionSettings"] = Relationship(
        back_populates="file", sa_relationship_kwargs={"lazy": "selectin"}
    )

    def get_metadata_dict(self) -> dict | None:
        """メタデータを辞書として取得"""
        if self.file_metadata:
            try:
                return json.loads(self.file_metadata)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    def set_metadata_dict(self, metadata: dict) -> None:
        """メタデータを辞書から設定"""
        if metadata:
            self.file_metadata = json.dumps(metadata)
        else:
            self.file_metadata = None

    def to_file_response(self) -> "FileResponse":
        """FileResponseに変換"""
        return FileResponse(
            id=self.id,
            filename=self.filename,
            markdown=self.markdown_content or "",
            status=self.status,
            created_at=self.created_at,
            updated_at=self.updated_at,
            file_size=self.file_size,
            processing_time=self.processing_time,
        )

    def to_upload_response(
        self, message: str = "ファイルが正常にアップロードされました"
    ) -> "UploadResponse":
        """UploadResponseに変換"""
        return UploadResponse(
            message=message,
            id=self.id,
            markdown=self.markdown_content or "",
            status=self.status,
        )

    def to_file_edit_response(
        self, message: str = "ファイルが正常に更新されました"
    ) -> "FileEditResponse":
        """FileEditResponseに変換"""
        return FileEditResponse(
            id=self.id,
            filename=self.filename,
            markdown=self.markdown_content or "",
            status=self.status,
            updated_at=self.updated_at or self.created_at,
            last_edited_at=self.last_edited_at or self.created_at,
            edit_count=self.edit_count,
            is_edited=self.is_edited,
            message=message,
        )


class ConversionLog(SQLModel, table=True):
    """変換ログデータベースモデル"""

    __tablename__ = "conversion_logs"

    id: int | None = SQLField(default=None, primary_key=True, description="ログID")
    file_id: str = SQLField(foreign_key="files.id", description="ファイルID")
    action: str = SQLField(description="アクション")
    status: str = SQLField(description="ステータス")
    message: str | None = SQLField(default=None, description="メッセージ")
    timestamp: datetime = SQLField(
        default_factory=datetime.now, description="タイムスタンプ"
    )
    processing_time: float | None = SQLField(default=None, description="処理時間（秒）")

    # リレーションシップ
    file: File | None = Relationship(back_populates="conversion_logs")

    def to_dict(self) -> dict:
        """辞書形式に変換"""
        return {
            "id": self.id,
            "file_id": self.file_id,
            "action": self.action,
            "status": self.status,
            "message": self.message,
            "timestamp": self.timestamp,
            "processing_time": self.processing_time,
        }


class FileEditHistory(SQLModel, table=True):
    """ファイル編集履歴データベースモデル"""

    __tablename__ = "file_edit_history"

    id: int | None = SQLField(default=None, primary_key=True, description="履歴ID")
    file_id: str = SQLField(foreign_key="files.id", description="ファイルID")
    original_filename: str = SQLField(description="元のファイル名")
    original_content: str = SQLField(description="元の内容")
    edited_filename: str = SQLField(description="編集後のファイル名")
    edited_content: str = SQLField(description="編集後の内容")
    edit_reason: str | None = SQLField(default=None, description="編集理由")
    edited_by: str = SQLField(default="system", description="編集者")
    created_at: datetime = SQLField(
        default_factory=datetime.now, description="編集日時"
    )

    # リレーションシップ
    file: File | None = Relationship(back_populates="edit_history")

    def to_file_edit_history_response(self) -> "FileEditHistoryResponse":
        """FileEditHistoryResponseに変換"""
        return FileEditHistoryResponse(
            id=self.id or 0,
            file_id=self.file_id,
            original_filename=self.original_filename,
            original_content=self.original_content,
            edited_filename=self.edited_filename,
            edited_content=self.edited_content,
            edit_reason=self.edit_reason,
            edited_by=self.edited_by,
            created_at=self.created_at,
        )

    def to_dict(self) -> dict:
        """辞書形式に変換"""
        return {
            "id": self.id,
            "file_id": self.file_id,
            "original_filename": self.original_filename,
            "original_content": self.original_content,
            "edited_filename": self.edited_filename,
            "edited_content": self.edited_content,
            "edit_reason": self.edit_reason,
            "edited_by": self.edited_by,
            "created_at": self.created_at,
        }


class RedactionSettings(SQLModel, table=True):
    """赤セルシート設定データベースモデル"""

    __tablename__ = "redaction_settings"

    id: int = SQLField(primary_key=True, description="設定ID")
    file_id: str = SQLField(foreign_key="files.id", description="ファイルID")
    user_id: str | None = SQLField(default=None, description="ユーザーID")
    name: str = SQLField(description="設定名")
    description: str | None = SQLField(default=None, description="設定の説明")
    show_all: bool = SQLField(default=False, description="全項目表示フラグ")
    level_settings: str = SQLField(
        default="{}", description="レベル別設定（JSON文字列）"
    )
    revealed_items: str = SQLField(
        default="[]", description="表示項目リスト（JSON文字列）"
    )
    is_shared: bool = SQLField(default=False, description="共有フラグ")
    created_at: datetime = SQLField(
        default_factory=datetime.now, description="作成日時"
    )
    updated_at: datetime | None = SQLField(default=None, description="更新日時")

    # リレーションシップ
    file: File | None = Relationship(back_populates="redaction_settings")

    def get_level_settings_dict(self) -> dict:
        """レベル設定を辞書として取得"""
        try:
            return json.loads(self.level_settings)
        except (json.JSONDecodeError, TypeError):
            return {}

    def set_level_settings_dict(self, level_settings: dict) -> None:
        """レベル設定を辞書から設定"""
        if level_settings:
            self.level_settings = json.dumps(level_settings)
        else:
            self.level_settings = "{}"

    def get_revealed_items_list(self) -> list[str]:
        """表示項目リストを取得"""
        try:
            return json.loads(self.revealed_items)
        except (json.JSONDecodeError, TypeError):
            return []

    def set_revealed_items_list(self, revealed_items: list[str]) -> None:
        """表示項目リストを設定"""
        if revealed_items:
            self.revealed_items = json.dumps(revealed_items)
        else:
            self.revealed_items = "[]"

    def to_dict(self) -> dict:
        """辞書形式に変換"""
        return {
            "id": self.id,
            "file_id": self.file_id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "show_all": self.show_all,
            "level_settings": self.get_level_settings_dict(),
            "revealed_items": self.get_revealed_items_list(),
            "is_shared": self.is_shared,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class RedactionSettingsShare(SQLModel, table=True):
    """赤セルシート設定共有データベースモデル"""

    __tablename__ = "redaction_settings_shares"

    id: int = SQLField(primary_key=True, description="共有ID")
    settings_id: int = SQLField(
        foreign_key="redaction_settings.id", description="設定ID"
    )
    shared_with_user_id: str | None = SQLField(
        default=None, description="共有先ユーザーID"
    )
    shared_with_team_id: str | None = SQLField(
        default=None, description="共有先チームID"
    )
    permission_level: str = SQLField(
        default="read", description="権限レベル（read/write/admin）"
    )
    created_at: datetime = SQLField(
        default_factory=datetime.now, description="作成日時"
    )

    # リレーションシップ
    settings: RedactionSettings | None = Relationship()

    def to_dict(self) -> dict:
        """辞書形式に変換"""
        return {
            "id": self.id,
            "settings_id": self.settings_id,
            "shared_with_user_id": self.shared_with_user_id,
            "shared_with_team_id": self.shared_with_team_id,
            "permission_level": self.permission_level,
            "created_at": self.created_at,
        }


# ===========================
# レスポンス変換ユーティリティ
# ===========================


def files_to_file_list_response(
    files: list[File], total_count: int, page: int = 1, per_page: int = 10
) -> "FileListResponse":
    """FileモデルのリストをFileListResponseに変換"""
    file_dicts = []
    for file in files:
        file_dict = {
            "id": file.id,
            "filename": file.filename,
            "status": file.status,
            "file_size": file.file_size,
            "created_at": file.created_at,
            "updated_at": file.updated_at,
            "processing_time": file.processing_time,
            "last_edited_at": file.last_edited_at,
            "edit_count": file.edit_count,
            "is_edited": file.is_edited,
        }
        file_dicts.append(file_dict)

    return FileListResponse(
        files=file_dicts,
        total_count=total_count,
        page=page,
        per_page=per_page,
    )


def conversion_logs_to_dict_list(logs: list[ConversionLog]) -> list[dict]:
    """ConversionLogモデルのリストを辞書リストに変換"""
    return [log.to_dict() for log in logs]


def edit_history_to_response_list(
    history: list[FileEditHistory],
) -> "FileEditHistoryListResponse":
    """FileEditHistoryモデルのリストをFileEditHistoryListResponseに変換"""
    history_responses = [h.to_file_edit_history_response() for h in history]
    return FileEditHistoryListResponse(history=history_responses)


# ===========================
# Pydantic レスポンスモデル（既存）
# ===========================


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


class FileEditHistoryListResponse(BaseModel):
    """ファイル編集履歴リストレスポンス"""

    history: list[FileEditHistoryResponse] = Field(..., description="編集履歴のリスト")


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


# ===========================
# 赤セルシート関連レスポンスモデル
# ===========================


class RedactionSettingsResponse(BaseModel):
    """赤セルシート設定レスポンス"""

    id: str = Field(..., description="設定ID")
    file_id: str = Field(..., description="ファイルID")
    user_id: str | None = Field(None, description="ユーザーID")
    name: str = Field(..., description="設定名")
    description: str | None = Field(None, description="設定の説明")
    show_all: bool = Field(..., description="全項目表示フラグ")
    level_settings: dict = Field(..., description="レベル別設定")
    revealed_items: list[str] = Field(..., description="表示項目リスト")
    is_shared: bool = Field(..., description="共有フラグ")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime | None = Field(None, description="更新日時")


class RedactionSettingsListResponse(BaseModel):
    """赤セルシート設定一覧レスポンス"""

    settings: list[RedactionSettingsResponse] = Field(..., description="設定一覧")
    total: int = Field(..., description="総設定数")


class RedactionSettingsCreateRequest(BaseModel):
    """赤セルシート設定作成リクエスト"""

    name: str = Field(..., description="設定名")
    description: str | None = Field(None, description="設定の説明")
    show_all: bool = Field(False, description="全項目表示フラグ")
    level_settings: dict = Field(default_factory=dict, description="レベル別設定")
    revealed_items: list[str] = Field(
        default_factory=list, description="表示項目リスト"
    )
    is_shared: bool = Field(False, description="共有フラグ")


class RedactionSettingsUpdateRequest(BaseModel):
    """赤セルシート設定更新リクエスト"""

    name: str | None = Field(None, description="設定名")
    description: str | None = Field(None, description="設定の説明")
    show_all: bool | None = Field(None, description="全項目表示フラグ")
    level_settings: dict | None = Field(None, description="レベル別設定")
    revealed_items: list[str] | None = Field(None, description="表示項目リスト")
    is_shared: bool | None = Field(None, description="共有フラグ")


class RedactionSettingsExportResponse(BaseModel):
    """赤セルシート設定エクスポートレスポンス"""

    settings_data: str = Field(..., description="設定データ（JSON文字列）")
    export_format: str = Field("json", description="エクスポート形式")


class RedactionSettingsImportRequest(BaseModel):
    """赤セルシート設定インポートリクエスト"""

    settings_data: str = Field(..., description="設定データ（JSON文字列）")
    format: str = Field("json", description="インポート形式")
