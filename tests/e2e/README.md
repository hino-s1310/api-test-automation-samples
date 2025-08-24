# Playwright E2E テスト

このディレクトリには、PDF to Markdown APIのE2Eテストが含まれています。

## テスト構成

### プロジェクト分類

Playwrightの`projects`設定を使用して、テストを以下のように分類しています：

#### 1. APIテスト (`api-tests`)
- **対象**: APIエンドポイントのテスト
- **ファイル**: `*.api.spec.ts`
- **ベースURL**: `http://localhost:8000`
- **依存**: APIサーバーのみ

**含まれるテスト**:
- `health.api.spec.ts` - ヘルスチェック
- `crud.api.spec.ts` - CRUD操作
- `error-handling.api.spec.ts` - エラーハンドリング
- `cleanup.api.spec.ts` - クリーンアップ

#### 2. UIテスト (`ui-tests`)
- **対象**: フロントエンドのテスト
- **ファイル**: `*.ui.spec.ts`
- **ベースURL**: `http://localhost:3000`
- **依存**: UIサーバーのみ

**含まれるテスト**:
- `integration.ui.spec.ts` - フロントエンド統合テスト

#### 3. 統合テスト (`integration-tests`)
- **対象**: フロントエンドとAPIの統合テスト
- **ファイル**: `*.integration.spec.ts`
- **ベースURL**: `http://localhost:3000`
- **依存**: APIサーバー + UIサーバー

## テスト実行方法

### 全テスト実行
```bash
pnpm test
```

### プロジェクト別実行

#### APIテストのみ
```bash
pnpm test:api
# または
pnpm test:api-only  # 詳細出力付き
```

#### UIテストのみ
```bash
pnpm test:ui
# または
pnpm test:ui-only  # 詳細出力付き
```

#### 統合テストのみ
```bash
pnpm test:integration
```

### その他のオプション

#### ヘッドレスモード（ブラウザ表示）
```bash
pnpm test:headed
```

#### Playwright UI
```bash
pnpm test:ui
```

#### デバッグモード
```bash
pnpm test:debug
```

#### レポート表示
```bash
pnpm test:report
```

## テストファイル命名規則

テストファイルは以下の命名規則に従って分類されます：

- `*.api.spec.ts` → APIテストプロジェクト
- `*.ui.spec.ts` → UIテストプロジェクト
- `*.integration.spec.ts` → 統合テストプロジェクト

## サーバー起動

テスト実行時は、以下のサーバーが自動的に起動されます：

1. **APIサーバー** (`api-server`)
   - ポート: 8000
   - ヘルスチェック: `/health`

2. **UIサーバー** (`ui-server`)
   - ポート: 3000
   - Next.js開発サーバー

## 注意事項

- テスト実行前に、必要な依存関係がインストールされていることを確認してください
- UIテストは、Next.jsの開発サーバーが完全に起動するまで待機します
- 統合テストは、両方のサーバーが起動してから実行されます
- CI環境では、並列実行が無効化され、タイムアウトが延長されます
