# AI テスト自動生成機能 - 設計書

## 1. アーキテクチャ概要

```
[Frontend]                    [Backend]                      [External]

MarkdownDisplay  --->  POST /files/{id}/generate-tests  --->  AI API
  (テスト生成タブ)         |                                  (OpenAI互換)
                          v
                    TestGenerationService
                          |
                          v
                    TestGenerationRepository
                          |
                          v
                    SQLite DB (generated_tests テーブル)
```

## 2. バックエンド設計

### 2.1 新規ファイル構成

```
src/api/
├── services/
│   └── test_generation_service.py   # AI テスト生成ビジネスロジック
├── routers/
│   └── test_generation.py           # テスト生成エンドポイント
└── models.py                        # 追加モデル定義
```

### 2.2 データモデル

#### GeneratedTest テーブル

| カラム | 型 | 説明 |
|--------|------|------|
| id | int (PK) | 生成ID |
| file_id | str (FK) | ファイルID |
| test_code | text | 生成されたテストコード |
| test_framework | str | テストフレームワーク |
| language | str | 生成言語 |
| test_type | str | テスト種類 |
| test_count | int | テスト数 |
| model_name | str | 使用AIモデル名 |
| prompt_tokens | int | プロンプトトークン数 |
| completion_tokens | int | 完了トークン数 |
| generation_time | float | 生成時間（秒） |
| created_at | datetime | 作成日時 |

### 2.3 API エンドポイント

#### POST /files/{file_id}/generate-tests

テスト生成リクエスト

**リクエストボディ:**
```json
{
  "test_framework": "pytest",
  "language": "python",
  "test_type": "unit",
  "max_tests": 10,
  "include_edge_cases": true
}
```

**レスポンス:**
```json
{
  "id": 1,
  "file_id": "xxx",
  "generated_tests": "import pytest\n...",
  "test_count": 5,
  "test_framework": "pytest",
  "language": "python",
  "metadata": {
    "model": "gpt-4o",
    "prompt_tokens": 1500,
    "completion_tokens": 2000,
    "generation_time": 3.5
  }
}
```

#### GET /files/{file_id}/generated-tests

生成履歴一覧取得

**レスポンス:**
```json
{
  "tests": [
    {
      "id": 1,
      "test_framework": "pytest",
      "language": "python",
      "test_type": "unit",
      "test_count": 5,
      "created_at": "2025-01-01T00:00:00"
    }
  ],
  "total_count": 1
}
```

#### GET /files/{file_id}/generated-tests/{test_id}

特定の生成テスト詳細取得

### 2.4 TestGenerationService 設計

```python
class TestGenerationService:
    """AI テスト生成サービス"""

    def __init__(self):
        self.api_key = os.getenv("AI_API_KEY")
        self.base_url = os.getenv("AI_API_BASE_URL", "https://api.openai.com/v1")
        self.model = os.getenv("AI_API_MODEL", "gpt-4o")

    async def generate_tests(
        self, markdown_content, options
    ) -> GeneratedTestResponse:
        """Markdownからテストを生成"""

    def _build_prompt(
        self, markdown_content, options
    ) -> str:
        """テスト生成用プロンプトを構築"""

    def _count_tests(self, test_code: str) -> int:
        """生成されたテストコード内のテスト数をカウント"""
```

### 2.5 プロンプト設計

テスト生成に使用するシステムプロンプト:

```
あなたはソフトウェアテストの専門家です。
提供されたMarkdownドキュメント（API仕様書やドキュメント）を分析し、
指定されたフレームワーク・言語でテストコードを生成してください。

要件:
- フレームワーク: {test_framework}
- 言語: {language}
- テスト種類: {test_type}
- 最大テスト数: {max_tests}
- エッジケース: {include_edge_cases}

生成するテストには以下を含めてください:
1. 正常系テスト
2. 異常系テスト（エラーハンドリング）
3. 境界値テスト
4. エッジケーステスト（オプション）

出力はテストコードのみを返してください。説明文は不要です。
```

## 3. フロントエンド設計

### 3.1 新規コンポーネント

#### TestGenerationPanel

テスト生成の設定・実行・結果表示を行うパネルコンポーネント

**Props:**
```typescript
interface TestGenerationPanelProps {
  fileId: string;
  markdownContent: string;
}
```

**状態管理:**
```typescript
interface TestGenerationState {
  isGenerating: boolean;
  generatedCode: string | null;
  error: string | null;
  options: TestGenerationOptions;
  history: GeneratedTestSummary[];
}
```

### 3.2 API クライアント拡張

```typescript
// lib/api.ts に追加
generateTests(fileId: string, options: TestGenerationOptions): Promise<GeneratedTestResponse>
getGeneratedTests(fileId: string): Promise<GeneratedTestListResponse>
getGeneratedTest(fileId: string, testId: number): Promise<GeneratedTestResponse>
```

### 3.3 型定義

```typescript
interface TestGenerationOptions {
  test_framework: 'pytest' | 'jest' | 'playwright';
  language: 'python' | 'typescript';
  test_type: 'unit' | 'integration' | 'e2e';
  max_tests: number;
  include_edge_cases: boolean;
}

interface GeneratedTestResponse {
  id: number;
  file_id: string;
  generated_tests: string;
  test_count: number;
  test_framework: string;
  language: string;
  metadata: {
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    generation_time: number;
  };
}

interface GeneratedTestSummary {
  id: number;
  test_framework: string;
  language: string;
  test_type: string;
  test_count: number;
  created_at: string;
}

interface GeneratedTestListResponse {
  tests: GeneratedTestSummary[];
  total_count: number;
}
```

## 4. DB マイグレーション

Alembic マイグレーションで `generated_tests` テーブルを追加。

## 5. 環境変数

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| AI_API_KEY | Yes | - | AI APIキー |
| AI_API_BASE_URL | No | https://api.openai.com/v1 | APIベースURL |
| AI_API_MODEL | No | gpt-4o | 使用モデル名 |
| AI_API_TIMEOUT | No | 60 | タイムアウト（秒） |

## 6. テスト計画

### 6.1 バックエンドテスト

- TestGenerationService のユニットテスト（AI APIはモック）
- テスト生成ルーターのユニットテスト
- プロンプト構築ロジックのテスト
- エラーハンドリングのテスト

### 6.2 フロントエンドテスト

- TestGenerationPanel コンポーネントテスト
- APIクライアントのテスト（モック使用）
- ユーザーインタラクションテスト
