# AI テスト自動生成機能 - 要件定義書

## 1. 概要

本機能は、アップロード済みのPDFから変換されたMarkdownコンテンツを入力として、AI API（OpenAI互換）を活用してAPIテストコードを自動生成する機能である。

## 2. 背景・目的

現在のシステムではPDFをMarkdownに変換して表示するのみとなっている。Markdownに含まれるAPI仕様書やドキュメントからテストコードを自動生成することで、テスト作成の工数を削減し、テストカバレッジの向上を支援する。

## 3. 機能要件

### 3.1 テスト生成エンドポイント

| 項目 | 内容 |
|------|------|
| メソッド | POST |
| パス | `/files/{file_id}/generate-tests` |
| 入力 | ファイルID、テスト生成オプション |
| 出力 | 生成されたテストコード |

### 3.2 テスト生成オプション

| パラメータ | 型 | デフォルト | 説明 |
|-----------|------|-----------|------|
| test_framework | string | "pytest" | テストフレームワーク（pytest / jest / playwright） |
| language | string | "python" | 生成言語（python / typescript） |
| test_type | string | "unit" | テスト種類（unit / integration / e2e） |
| max_tests | int | 10 | 最大生成テスト数 |
| include_edge_cases | bool | true | エッジケースを含めるか |

### 3.3 レスポンス仕様

```json
{
  "file_id": "string",
  "generated_tests": "string (テストコード全文)",
  "test_count": 0,
  "test_framework": "pytest",
  "language": "python",
  "metadata": {
    "model": "string",
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "generation_time": 0.0
  }
}
```

### 3.4 テスト生成履歴

- 生成されたテストはDBに保存し、後から参照可能とする
- `GET /files/{file_id}/generated-tests` で履歴一覧を取得可能

## 4. 非機能要件

### 4.1 AI API連携

- OpenAI互換APIをサポート（OpenAI, Azure OpenAI等）
- APIキーは環境変数 `AI_API_KEY` で管理
- APIベースURLは環境変数 `AI_API_BASE_URL` で設定可能
- モデル名は環境変数 `AI_API_MODEL` で設定可能（デフォルト: `gpt-4o`）
- タイムアウト: 60秒

### 4.2 エラーハンドリング

- AI APIへの接続失敗時は適切なエラーメッセージを返却
- APIキー未設定時は 503 Service Unavailable を返却
- レート制限超過時は 429 Too Many Requests を返却
- Markdownが空の場合は 400 Bad Request を返却

### 4.3 セキュリティ

- APIキーはサーバーサイドのみで保持（フロントエンドには露出しない）
- 生成リクエストにはレート制限を設ける

## 5. UI要件

### 5.1 テスト生成ボタン

- MarkdownDisplay コンポーネントのタブに「テスト生成」タブを追加
- ファイル詳細モーダルからもテスト生成にアクセス可能

### 5.2 テスト生成画面

- テストフレームワーク・言語・テスト種類の選択UI
- 生成中のローディング表示
- 生成結果のコード表示（シンタックスハイライト付き）
- 生成されたテストのコピー・ダウンロード機能

## 6. 制約事項

- AI APIの利用にはAPIキーの事前設定が必要
- 生成されるテストコードの品質はAIモデルの性能に依存
- 長大なMarkdownの場合、トークン制限による切り詰めが発生する可能性がある
