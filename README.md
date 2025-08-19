# api-test-automation-samples
PDFをMarkdown形式に変換するAPIに対して、様々なAPIテストツールで自動テストのサンプルコードを作成する

様々なテストツールでの実装例を提供します。

## プロジェクトの目的

このプロジェクトは、**サンプルコード集**として、同じAPIに対して様々なテストツールでの実装例を提供することを目的としています。

### **対応予定のテストツール**
| カテゴリ | ツール | 言語 | 特徴 | ステータス |
|----------|--------|------|------|------------|
| **APIテスト** | pytest + httpx | Python | 軽量・高速 | 実装中 |
| **E2Eテスト** | Playwright | Node.js | ブラウザ自動化 | 実装中 |
| **APIテスト** | Postman/Newman | - | GUI・コレクション | 予定 |
| **BDDテスト** | Karate | Java | 自然言語記述 | 予定 |

---

## 概要
本プロジェクトは、PDFファイルをアップロードし、[MarkItDown](https://github.com/microsoft/markitdown) を使用して **Markdown形式** に変換するサンプルAPIに対して、APIテストツールでサンプルコードを作成します。

**現在対応しているテストツール:**
- **Python + pytest** - 基本的なAPIテスト
- **Node.js + Playwright** - E2Eテスト
- **その他のツール** - 順次追加予定

---

## 🚀 CI/CD & テスト自動化

### GitHub Actions ワークフロー

このプロジェクトは包括的なCI/CDパイプラインを提供します：

#### **主要ワークフロー**

| ワークフロー | トリガー | 目的 |
|-------------|----------|------|
| `unit_test.yml` | PR作成・main push・定期実行 | ユニットテスト専用 |

#### **実行タイミング**
- **PR作成・更新時**: 全テストを実行
- **mainブランチプッシュ時**: 全テストを実行
- **毎日午前3時**: 定期的なヘルスチェック
- **手動実行**: 必要に応じて実行可能

#### **テスト構成**
```
CI/CD Pipeline
├── コード品質チェック
│   ├── Black (フォーマット)
│   ├── Flake8 (Lint)
│   └── MyPy (型チェック)
├── ユニットテスト
│   ├── Python 3.10, 3.11, 3.12
│   ├── カバレッジレポート
│   └── JUnit XMLレポート
├── サービステスト
│   └── サービス層の単体テスト
└── E2Eテスト
    ├── Playwright
    └── 実際のAPIサーバー連携
```

### 🛠️ 開発者向けツール

#### **Make コマンド**
```bash
# 環境セットアップ
make install          # 依存関係のインストール
make install-hooks    # pre-commitフックのインストール

# テスト実行
make test            # ユニットテスト
make test-unit       # ユニットテスト

# コード品質
make lint            # Lintチェック
make format          # コードフォーマット
make check           # 全品質チェック

# 開発サーバー
make dev             # 開発サーバー起動
make run             # 本番サーバー起動

# その他
make coverage        # カバレッジレポート生成
make clean           # 生成ファイルのクリーンアップ
```

#### **Pre-commit フック**
コミット前に自動的に実行されるチェック：
- コードフォーマット (Black)
- Lintチェック (Flake8)  
- 型チェック (MyPy)
- ユニットテスト実行

---

## 機能要件
1. **PDFアップロード**
   - `/upload` エンドポイントでPDFファイルを受け付け
2. **Markdown変換**
   - MarkItDownで変換し、Markdown文字列として返却
3. **変換結果の表示**
   - 即時レスポンス（オプションでファイル保存＆DB）
4. **Markdown変換の再実行、更新**
   - 一度DBに保存したものを再実行し、更新をかける
5. **DBに保存したMarkdownの削除**
   - 即時レスポンス（オプションでファイル保存＆DB）   
6. **エラーハンドリング**
   - PDF以外のファイル拒否
   - サイズ制限（例：10MBまで）
   - 変換失敗時のエラー応答

---

## APIエンドポイント

| メソッド | パス | 概要 | リクエスト例 | レスポンス例 |
|----------|------|------|--------------|--------------|
| **POST** | `/upload` | PDFアップロード＆Markdown変換 | multipart/form-dataでPDF送信 | `{ "markdown": "# 見出し...", "id": "123" }` |
| **GET** | `/files/{id}` | 保存済みMarkdown取得 | `/files/123` | `{ "id": "123", "markdown": "# 見出し...", "created_at": "2024-01-01T00:00:00" }` |
| **PUT** | `/files/{id}` | 保存済みMarkdownの再変換・更新 | `/files/123` + PDF | `{ "id": "123", "markdown": "# 更新された見出し...", "updated_at": "2024-01-01T00:00:00" }` |
| **DELETE** | `/files/{id}` | 保存済みMarkdownの削除 | `/files/123` | `{ "message": "File deleted successfully" }` |
| **GET** | `/files` | 保存済みファイル一覧取得 | `/files` | `{ "files": [{"id": "123", "created_at": "2024-01-01T00:00:00"}] }` |

---

## プロジェクト構造

```
api-test-automation-samples/
├── README.md
├── pyproject.toml         # Python依存関係管理
├── src/                   # ソースコード
│   ├── __init__.py
│   ├── main.py            # FastAPIアプリケーション
│   ├── models.py          # データモデル定義
│   ├── database.py        # データベース接続・操作
│   └── services/          # ビジネスロジック
│       ├── __init__.py
│       ├── pdf_service.py # PDF変換処理
│       └── file_service.py # ファイル管理処理
├── tests/                 # テストコード
│   ├── pytest/            # pytestテスト
│   │   ├── __init__.py
│   │   ├── test_api.py    # APIテスト
│   │   ├── test_services.py # サービス層テスト
│   │   └── conftest.py    # テスト設定
│   └── playwright/            # Playwrightテスト
│       ├── package.json   # Node.js依存関係
│       ├── playwright.config.ts # Playwright設定
│       ├── tests/         # Playwrightテスト
│       │   └── api.spec.ts # API E2Eテスト
│       └── utils/         # テスト用ユーティリティ
├── data/                  # データ保存用ディレクトリ
│   ├── uploads/           # アップロードされたPDF
│   ├── markdown/          # 変換されたMarkdown
│   └── database.db        # SQLiteデータベース
├── docs/                  # ドキュメント
│   ├── BRANCH_RULES.md    # ブランチ戦略・ルール
│   └── API_SPECIFICATION.md # API仕様書
└── sample.pdf             # テスト用サンプルPDF
```

---

## 処理フロー
1. クライアントがPDFをアップロード（Web or モバイルアプリ）
2. APIがMarkItDownでMarkdownへ変換
3. 即時レスポンスとしてMarkdownを返却し、DBに保存する

---

## 使用技術

### **バックエンド**
- **言語**: Python3.10以上
- **フレームワーク**: FastAPI
- **変換ライブラリ**: MarkItDown
- **DB**: SQLite
- **その他**: Uvicorn（開発用サーバー）
- **パッケージ管理**: uv

### **テスト**
- **Python**: pytest + httpx
- **Node.js**: Playwright + TypeScript
- **E2Eテスト**: ブラウザベースの統合テスト

### **パッケージ管理**
- **Python**: uv + pyproject.toml
- **Node.js**: pnpm + package.json

---

### システム要件
- Python 3.8以上
- 十分なディスク容量（アップロードファイル用）

---

## セットアップ手順

### 1. プロジェクトのクローン・初期化
```bash
git clone <repository-url>
cd api-test-automation-samples
```

### 2. Python環境のセットアップ
```bash
# uvがインストールされていない場合は先にインストール
curl -LsSf https://astral.sh/uv/install.sh | sh

# Python依存関係のインストール（仮想環境も自動で作成される）
uv sync

# 仮想環境の有効化
source .venv/bin/activate  # macOS/Linux
# または
.venv\Scripts\activate     # Windows
```

### 3. Node.js環境のセットアップ
```bash
# Node.jsがインストールされていない場合は先にインストール
# https://nodejs.org/ からダウンロード、またはnvmを使用

# pnpmがインストールされていない場合は先にインストール
npm install -g pnpm

# UIの依存関係をインストール
cd src/ui
pnpm install

# Playwrightディレクトリに移動
cd ../../tests/e2e

# Node.js依存関係のインストール
pnpm install

# Playwrightのブラウザをインストール
pnpm exec playwright install
```

### 4. 必要なディレクトリの作成
```bash
mkdir -p data/uploads data/markdown
```

### 5. 開発サーバーの起動
```bash
uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```


## テストの実行

### 1. Pythonテスト（pytest）の実行
```bash
# 全テストの実行
pytest tests/python/

# 特定のテストファイルの実行
pytest tests/python/test_api.py

# 詳細出力でテスト実行
pytest tests/python/ -v

# カバレッジ付きでテスト実行
pytest tests/python/ --cov=src
```

### 2. Node.jsテスト（Playwright）の実行
```bash
# 全テストの実行
pnpm playwright test

# 特定のテストファイルの実行
pnpm playwright test tests/api.spec.ts

# UIモードでテスト実行（デバッグ用）
pnpm playwright test --ui

# ヘッドレスモードでテスト実行
pnpm playwright test --headed

# 特定のブラウザでテスト実行
pnpm playwright test --project=chromium
```

### 3. テスト用サンプルPDFの準備
```bash
# テスト用のサンプルPDFを作成（テキストベース）
echo "This is a test PDF content" > sample.txt
# または既存のPDFファイルをコピー
cp /path/to/your/sample.pdf ./sample.pdf
```

---

## API使用例

### 1. PDFアップロード・変換
```bash
curl -X POST "http://localhost:8000/upload" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@sample.pdf"
```

### 2. 変換結果の取得
```bash
curl -X GET "http://localhost:8000/files/{file_id}" \
     -H "accept: application/json"
```

### 3. ファイル一覧の取得
```bash
curl -X GET "http://localhost:8000/files" \
     -H "accept: application/json"
```

### 4. ファイルの更新
```bash
curl -X PUT "http://localhost:8000/files/{file_id}" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@updated_sample.pdf"
```

### 5. ファイルの削除
```bash
curl -X DELETE "http://localhost:8000/files/{file_id}" \
     -H "accept: application/json"
```

---

##　Web UI（Swagger）

開発サーバー起動後、以下のURLでAPIドキュメントとテストUIにアクセスできます：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. MarkItDownライブラリのインストールエラー
```bash
# 代替案：pipで直接インストール
pip install git+https://github.com/microsoft/markitdown.git
```

#### 2. ファイルアップロードエラー
- ファイルサイズ制限の確認（10MB以下）
- ファイル形式の確認（.pdfのみ）
- ディレクトリの権限確認

#### 3. データベースエラー
```bash
# データベースファイルの権限確認
chmod 755 data/
chmod 644 data/database.db
```

#### 4. ポートが既に使用されている
```bash
# 別のポートで起動
uvicorn main:app --reload --port 8001
```

---

## 今後の拡張案

### **機能拡張**
- 認証機能の追加（JWT）
- 外部ストレージ（S3等）への対応
- リアルタイム変換進捗の表示

### **テストツールの拡張**
- **Postman/Newman** - APIテストコレクション
- **Karate** - BDDスタイルのAPIテスト

---

## 参考資料

### **API・フレームワーク**
- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [MarkItDown GitHub](https://github.com/microsoft/markitdown)
- [SQLite公式ドキュメント](https://www.sqlite.org/docs.html)

### **Pythonテスト**
- [pytest公式ドキュメント](https://docs.pytest.org/)
- [httpx公式ドキュメント](https://www.python-httpx.org/)

### **Node.jsテスト**
- [Playwright公式ドキュメント](https://playwright.dev/)
- [TypeScript公式ドキュメント](https://www.typescriptlang.org/)

### **パッケージ管理**
- [uv公式ドキュメント](https://docs.astral.sh/uv/)
- [pnpm公式ドキュメント](https://pnpm.io/)

---

## Docker環境での実行

> **⚠️ 注意**: Python 3.10以上が必要です（markitdownライブラリの要件）

### **本番環境での実行**
```bash
# 全サービスを起動（API + テスト実行）
docker-compose up --build

# バックグラウンドで実行
docker-compose up -d --build

# ログの確認
docker-compose logs -f api

# サービスの停止
docker-compose down
```

### **開発環境での実行**
```bash
# 開発用APIを起動（ホットリロード対応）
docker-compose -f docker-compose.dev.yml up --build

# バックグラウンドで起動
docker-compose -f docker-compose.dev.yml up -d api-dev

# ログの確認
docker-compose -f docker-compose.dev.yml logs -f api-dev
```

### **個別のサービス実行**
```bash
# APIのみビルド・起動（Python 3.10以上）
docker build -t pdf-markdown-api .
docker run -p 8000:8000 -v $(pwd)/src:/app/src pdf-markdown-api

# Playwrightテストのみ実行
docker run --rm -v $(pwd)/tests/playwright:/app mcr.microsoft.com/playwright:v1.40.0-focal

# Pythonバージョン確認
docker run --rm pdf-markdown-api python --version
```

---

## 開発ルール関連

### **ブランチ戦略**
詳細なブランチ作成ルールは [ブランチ戦略ドキュメント](docs/BRANCH_RULES.md) を参照してください。

### **GitHubテンプレート**
- **Pull Request**: `.github/PULL_REQUEST_TEMPLATE.md` を使用
- **Issue**: `.github/ISSUE_TEMPLATE/` 内のテンプレートを使用
  - バグ報告: `BUG_REPORT.md`
  - 機能要求: `FEATURE_REQUEST.md`

### **ブランチ命名例**
```bash
# 新機能実装
git checkout -b feature/implement-pdf-upload

# テスト追加
git checkout -b test/add-playwright-e2e-tests

# バグ修正
git checkout -b bugfix/123-pdf-conversion-error

# リファクタリング
git checkout -b refactor/services-extract-common
```

---

## ローカルでの動作確認

### **Python環境での動作確認**
```bash
# 環境構築
# uvがインストールされていない場合は先にインストール
curl -LsSf https://astral.sh/uv/install.sh | sh

# 依存関係のインストール
uv sync

# 仮想環境の有効化（uvが自動で作成）
source .venv/bin/activate

# 開発サーバー起動
uv run uvicorn src.api.main:app --reload

# 動作確認
curl -F "file=@sample.pdf" http://localhost:8000/upload
```

### **Node.js環境での動作確認**
```bash
# UIの動作確認
cd src/ui
pnpm install
pnpm dev

# Playwrightテストの実行
cd ../../tests/e2e
pnpm install
pnpm exec playwright install
pnpm playwright test

# UIモードでのテスト実行
pnpm playwright test --ui
```
