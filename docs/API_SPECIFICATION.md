# PDF to Markdown API 仕様書

## 概要

PDFファイルをMarkdown形式に変換するRESTful APIです。

## 基本情報

- **ベースURL**: `http://localhost:8000`
- **API バージョン**: 1.0.0
- **データ形式**: JSON
- **認証**: なし（開発版）

## エンドポイント一覧

### ヘルスチェック

#### GET /health
ヘルスチェックエンドポイント

**レスポンス**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00",
  "uptime": 3600.5
}
```

### ファイル管理

#### POST /upload
PDFファイルをアップロードしてMarkdownに変換

**リクエスト**
- Content-Type: `multipart/form-data`
- Body: PDFファイル

**レスポンス**
```json
{
  "message": "PDFファイルのアップロードと変換が完了しました",
  "file_id": "uuid-string",
  "status": "completed"
}
```

**エラーレスポンス**
```json
{
  "detail": "ファイルサイズは10MB以下にしてください",
  "timestamp": "2024-01-01T00:00:00",
  "path": "/upload"
}
```

#### GET /files/{file_id}
指定されたIDのファイル情報を取得

**パラメータ**
- `file_id`: ファイルID（UUID形式）

**レスポンス**
```json
{
  "id": "uuid-string",
  "filename": "sample.pdf",
  "markdown": "# 見出し\n\n本文...",
  "status": "completed",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00",
  "file_size": 1024000,
  "processing_time": 2.5
}
```

#### GET /files
ファイル一覧を取得

**クエリパラメータ**
- `page`: ページ番号（デフォルト: 1）
- `per_page`: 1ページあたりの件数（デフォルト: 10, 最大: 100）

**レスポンス**
```json
{
  "files": [
    {
      "id": "uuid-string",
      "filename": "sample.pdf",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00",
      "file_size": 1024000,
      "processing_time": 2.5
    }
  ],
  "total_count": 1,
  "page": 1,
  "per_page": 10
}
```

#### PUT /files/{file_id}
指定されたIDのファイルを新しいPDFで更新・再変換

**パラメータ**
- `file_id`: ファイルID（UUID形式）

**リクエスト**
- Content-Type: `multipart/form-data`
- Body: 新しいPDFファイル

**レスポンス**
```json
{
  "file_id": "uuid-string",
  "markdown": "# 更新された見出し\n\n更新された本文...",
  "status": "completed",
  "processing_time": 1.8
}
```

#### DELETE /files/{file_id}
指定されたIDのファイルを削除

**パラメータ**
- `file_id`: ファイルID（UUID形式）

**レスポンス**
```json
{
  "message": "ファイルが正常に削除されました"
}
```

#### GET /files/{file_id}/logs
指定されたIDのファイルの変換ログを取得

**パラメータ**
- `file_id`: ファイルID（UUID形式）

**レスポンス**
```json
{
  "logs": [
    {
      "id": 1,
      "file_id": "uuid-string",
      "action": "upload_and_convert",
      "status": "success",
      "message": "PDF to Markdown conversion completed",
      "timestamp": "2024-01-01T00:00:00",
      "processing_time": 2.5
    }
  ]
}
```

### 統計・メンテナンス

#### GET /statistics
ファイル統計情報を取得

**レスポンス**
```json
{
  "total_files": 10,
  "status_counts": {
    "processing": 0,
    "completed": 8,
    "failed": 2
  },
  "total_size_bytes": 10485760,
  "total_size_mb": 10.0,
  "total_processing_time": 25.5,
  "average_processing_time": 2.55
}
```

#### POST /cleanup
古いファイルをクリーンアップ

**クエリパラメータ**
- `days`: 削除対象の日数（デフォルト: 30, 範囲: 1-365）

**レスポンス**
```json
{
  "message": "30日より古いファイルのクリーンアップが完了しました",
  "deleted_count": 5,
  "total_old_files": 5
}
```

## データモデル

### FileStatus
```python
class FileStatus(str, Enum):
    PROCESSING = "processing"    # 処理中
    COMPLETED = "completed"      # 完了
    FAILED = "failed"           # 失敗
```

### エラーレスポンス
```json
{
  "detail": "エラーの詳細",
  "error_code": "ERROR_CODE",  # オプション
  "timestamp": "2024-01-01T00:00:00"
}
```

## 制限事項

### ファイルサイズ
- 最大: 10MB
- 最小: 1バイト

### ファイル形式
- 対応形式: PDFのみ
- 非対応: その他のファイル形式

### レート制限
- 現在は制限なし（開発版）

## エラーコード

| HTTPステータス | 説明 |
|---------------|------|
| 400 | リクエストが不正（ファイルサイズ超過、形式不正など） |
| 404 | リソースが見つからない |
| 500 | 内部サーバーエラー |

## 使用例

### cURLでの使用例

#### PDFアップロード
```bash
curl -X POST "http://localhost:8000/upload" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@sample.pdf"
```

#### ファイル情報取得
```bash
curl -X GET "http://localhost:8000/files/{file_id}" \
     -H "accept: application/json"
```

#### ファイル一覧取得
```bash
curl -X GET "http://localhost:8000/files?page=1&per_page=10" \
     -H "accept: application/json"
```

#### ファイル更新
```bash
curl -X PUT "http://localhost:8000/files/{file_id}" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@updated_sample.pdf"
```

#### ファイル削除
```bash
curl -X DELETE "http://localhost:8000/files/{file_id}" \
     -H "accept: application/json"
```

## 開発者向け情報

### データベーススキーマ

#### files テーブル
```sql
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    markdown_path TEXT,
    markdown_content TEXT,
    status TEXT NOT NULL DEFAULT 'processing',
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_time REAL,
    metadata TEXT
);
```

#### conversion_logs テーブル
```sql
CREATE TABLE conversion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_time REAL,
    FOREIGN KEY (file_id) REFERENCES files (id)
);
```

### ログ出力
- アプリケーションログ: 標準出力
- エラーログ: 標準エラー出力
- データベースログ: SQLiteのログ

### 設定可能項目
- データベースパス
- アップロードディレクトリ
- Markdown出力ディレクトリ
- ファイルサイズ制限
- ページネーション設定
