# GitHub リポジトリ設定ガイド

## プロジェクト概要

このプロジェクトは、PDF to Markdown APIのテスト自動化サンプルを提供する包括的なリポジトリです。

### **技術スタック**
- **バックエンド**: FastAPI + Python 3.11 + uv
- **フロントエンド**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **テスト**: pytest (Python), Jest (TypeScript), Playwright (E2E)
- **CI/CD**: GitHub Actions

### **ワークフロー構成**
- `backend_unit_test.yml` - バックエンドユニットテスト
- `frontend_unit_test.yml` - フロントエンドユニットテスト
- `e2e_test.yml` - E2Eテスト

## GitHub Actions 権限設定

### 1. ワークフロー権限の設定

リポジトリの **Settings** → **Actions** → **General** で以下を確認：

```
Workflow permissions:
☑️ Read and write permissions
☐ Read repository contents and packages permissions
```

### 2. 必要な権限

CI/CDワークフローが正常に動作するために必要な権限：

- `contents: read` - コードの読み取り
- `pull-requests: write` - PRコメント投稿
- `checks: write` - チェック結果更新
- `statuses: write` - ステータス更新

### 3. Fork からの貢献について

セキュリティ上の理由により、Fork からの PR では一部機能が制限されます：

- ❌ PR への自動コメント投稿
- ✅ テスト実行とカバレッジ測定
- ✅ Artifacts のアップロード
- ✅ Step Summary での結果表示

### 4. トラブルシューティング

#### カバレッジコメントが投稿されない場合

1. **権限確認**: リポジトリの Actions 権限設定を確認
2. **Fork 確認**: Fork からの PR の場合は Step Summary を確認
3. **Token 確認**: `GITHUB_TOKEN` の権限スコープを確認

#### 解決策

- **Internal PR**: 権限設定を修正
- **Fork PR**: Artifacts と Step Summary で結果確認
- **手動確認**: ダウンロードしたカバレッジレポートを確認

## ワークフロー詳細

### Backend Unit Tests (`backend_unit_test.yml`)

#### **実行タイミング**
- PR作成・更新時
- mainブランチへのpush時
- 毎日午前3時（JST）の定期実行
- 手動実行可能

#### **実行環境**
- **OS**: Ubuntu Latest
- **Python**: 3.11
- **パッケージマネージャー**: uv

#### **実行内容**
```yaml
steps:
  - コードチェックアウト
  - Python 3.11 セットアップ
  - uv インストール
  - 依存関係インストール
  - ユニットテスト実行（カバレッジ付き）
  - カバレッジレポートアップロード
  - テスト結果アップロード
  - PRへのカバレッジコメント投稿
```

### Frontend Unit Tests (`frontend_unit_test.yml`)

#### **実行タイミング**
- PR作成・更新時
- mainブランチへのpush時
- 毎日午前3時（JST）の定期実行
- 手動実行可能

#### **実行環境**
- **OS**: Ubuntu Latest
- **Node.js**: 20.x
- **パッケージマネージャー**: pnpm 8.10.0

#### **実行内容**
```yaml
steps:
  - コードチェックアウト
  - Node.js 20.x セットアップ
  - pnpm セットアップ
  - 依存関係インストール
  - TypeScript型チェック
  - ESLintチェック
  - Jestテスト実行（カバレッジ付き）
  - カバレッジレポートアップロード
  - テスト結果アップロード
```

### E2E Tests (`e2e_test.yml`)

#### **実行タイミング**
- PR作成・更新時
- mainブランチへのpush時
- 毎日午前3時（JST）の定期実行
- 手動実行可能

#### **実行環境**
- **OS**: Ubuntu Latest
- **Python**: 3.11
- **Node.js**: 20.x
- **パッケージマネージャー**: uv + pnpm 9.15.0

#### **実行内容**
```yaml
steps:
  - コードチェックアウト
  - Python + Node.js セットアップ
  - uv + pnpm セットアップ
  - 依存関係インストール
  - APIサーバー起動
  - Playwrightテスト実行
  - テスト結果アップロード
```

## カバレッジレポートの確認方法

### 1. Step Summary
GitHub Actions の実行結果ページで「Summary」タブを確認

### 2. Artifacts
- 実行完了後に Artifacts セクションからダウンロード
- バックエンド: `htmlcov/index.html` をブラウザで開く
- フロントエンド: `src/ui/coverage/lcov-report/index.html` をブラウザで開く

### 3. ローカル実行
```bash
# バックエンドカバレッジ
make coverage
open htmlcov/index.html

# フロントエンドカバレッジ
cd src/ui
pnpm test --coverage
open coverage/lcov-report/index.html
```

### 4. Codecov
- 各ワークフローでCodecovにカバレッジレポートをアップロード
- フラグ付きで管理（`unittests`, `frontend-unittests`）

## 開発環境セットアップ

### 前提条件
- Python 3.11+
- Node.js 20.x+
- uv (Python パッケージマネージャー)
- pnpm (Node.js パッケージマネージャー)

### セットアップ手順

#### 1. リポジトリクローン
```bash
git clone https://github.com/yourusername/api-test-automation-samples.git
cd api-test-automation-samples
```

#### 2. バックエンド環境セットアップ
```bash
# uv インストール（未インストールの場合）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 依存関係インストール
make install

# データベース初期化
make db-init
```

#### 3. フロントエンド環境セットアップ
```bash
cd src/ui

# pnpm インストール（未インストールの場合）
npm install -g pnpm

# 依存関係インストール
pnpm install
```

#### 4. 開発サーバー起動
```bash
# バックエンド（別ターミナル）
make dev

# フロントエンド（別ターミナル）
cd src/ui
pnpm dev
```

## テスト実行

### ローカルテスト実行

#### バックエンドテスト
```bash
# 全ユニットテスト
make test-unit

# 特定のテスト
make test-services
make test-api

# カバレッジ付きテスト
make coverage
```

#### フロントエンドテスト
```bash
cd src/ui

# テスト実行
pnpm test

# カバレッジ付きテスト
pnpm test --coverage

# 型チェック
pnpm run type-check

# Lintチェック
pnpm run lint
```

#### E2Eテスト
```bash
# バックエンドサーバー起動（別ターミナル）
make dev

# E2Eテスト実行
make test-e2e
```

### CI/CD テスト実行

#### 手動実行
1. GitHub リポジトリページで **Actions** タブを開く
2. 実行したいワークフローを選択
3. **Run workflow** ボタンをクリック
4. ブランチとパラメータを設定して実行

#### 定期実行
- バックエンド・フロントエンドテスト: 毎日午前3時（JST）
- E2Eテスト: 毎日午前3時（JST）

## セキュリティ考慮事項

### Fork からの PR の制限理由

1. **機密情報の保護**: シークレットへのアクセス制限
2. **不正なコード実行の防止**: 悪意のあるコードの実行防止
3. **リポジトリの改ざん防止**: 不正な変更の防止

### 安全な運用のためのベストプラクティス

1. **最小権限の原則**: 必要最小限の権限のみ付与
2. **条件付き実行**: Fork の場合は機能を制限
3. **フォールバック機能**: 権限不足時の代替手段を用意
4. **定期的な監査**: ワークフローの権限設定を定期的に確認

## トラブルシューティング

### よくある問題と解決方法

#### 1. 依存関係のインストールエラー
```bash
# Python 依存関係
uv pip install --upgrade pip
uv pip install -e ".[dev,test]"

# Node.js 依存関係
cd src/ui
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 2. テスト実行エラー
```bash
# データベースリセット
make db-reset

# キャッシュクリア
make clean

# 環境変数確認
echo $ENVIRONMENT
```

#### 3. カバレッジレポートが生成されない
```bash
# カバレッジディレクトリの確認
ls -la htmlcov/
ls -la src/ui/coverage/

# 手動でカバレッジ実行
uv run pytest tests/unit/ --cov=src --cov-report=html
```

#### 4. GitHub Actions が失敗する
- ワークフローファイルの構文エラーを確認
- 権限設定を確認
- 依存関係のバージョン互換性を確認
- ログを詳しく確認してエラーの原因を特定

## 参考資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Playwright Documentation](https://playwright.dev/)
- [uv Documentation](https://docs.astral.sh/uv/)
- [pnpm Documentation](https://pnpm.io/)
