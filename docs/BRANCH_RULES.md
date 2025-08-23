# ブランチ戦略・ブランチ作成ルール

## 概要

このドキュメントでは、PDF to Markdown APIのテスト自動化サンプルプロジェクトにおけるブランチ戦略とブランチ作成ルールを定義します。

## プロジェクト構成

### **技術スタック**
- **バックエンド**: FastAPI + Python 3.11 + uv
- **フロントエンド**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **テスト**: pytest (Python), Jest (TypeScript), Playwright (E2E)
- **CI/CD**: GitHub Actions
- **パッケージマネージャー**: uv (Python), pnpm (Node.js)

### **ディレクトリ構造**
```
├── src/
│   ├── api/          # FastAPI バックエンド
│   └── ui/           # Next.js フロントエンド
├── tests/
│   ├── unit/         # Python ユニットテスト
│   └── e2e/          # Playwright E2Eテスト
└── .github/workflows/ # GitHub Actions
```

## ブランチ構成

### **メインブランチ**
- `main` - 本番環境用の安定版ブランチ
- `develop` - 開発・統合用のブランチ

### **作業ブランチ**
- `feature/*` - 新機能開発用
- `test/*` - テスト追加・改善用
- `bugfix/*` - バグ修正用
- `refactor/*` - リファクタリング用
- `docs/*` - ドキュメント更新用
- `ci/*` - CI/CD設定変更用

## ブランチ作成ルール

### **1. 新しくAPIを実装するとき**
```bash
# ブランチ名: feature/implement-{api-name}
git checkout develop
git pull origin develop
git checkout -b feature/implement-pdf-upload
git checkout -b feature/implement-markdown-conversion
git checkout -b feature/implement-file-management
```

**命名規則:**
- `feature/implement-{機能名}`
- 例: `feature/implement-pdf-upload`, `feature/implement-markdown-conversion`

**対象:**
- 新しいエンドポイントの追加
- 新しいサービスクラスの実装
- 新しいデータモデルの追加

### **2. フロントエンド機能を追加するとき**
```bash
# ブランチ名: feature/ui-{feature-name}
git checkout develop
git pull origin develop
git checkout -b feature/ui-file-upload-component
git checkout -b feature/ui-markdown-preview
git checkout -b feature/ui-responsive-design
```

**命名規則:**
- `feature/ui-{機能名}`
- 例: `feature/ui-file-upload-component`, `feature/ui-markdown-preview`

**対象:**
- 新しいReactコンポーネント
- UI/UXの改善
- レスポンシブデザイン対応

### **3. pytestまたはPlaywrightのテストを追加するとき**
```bash
# ブランチ名: test/add-{test-type}-{target}
git checkout develop
git pull origin develop
git checkout -b test/add-pytest-api-endpoints
git checkout -b test/add-playwright-e2e-upload
git checkout -b test/add-jest-component-tests
git checkout -b test/add-integration-tests
```

**命名規則:**
- `test/add-{テストタイプ}-{対象}`
- 例: `test/add-pytest-api-endpoints`, `test/add-playwright-e2e-upload`

**対象:**
- 新しいテストケースの追加
- テストカバレッジの向上
- E2Eテストの追加
- パフォーマンステストの追加

### **4. issueに起票された不具合の修正や、Todoを対応するとき**
```bash
# ブランチ名: bugfix/{issue-number}-{description}
git checkout develop
git pull origin develop
git checkout -b bugfix/123-pdf-upload-error
git checkout -b bugfix/456-markdown-conversion-fails
git checkout -b bugfix/789-file-size-validation
```

**命名規則:**
- `bugfix/{issue番号}-{簡潔な説明}`
- 例: `bugfix/123-pdf-upload-error`, `bugfix/456-markdown-conversion-fails`

**対象:**
- バグ修正
- エラーハンドリングの改善
- パフォーマンス問題の解決
- セキュリティ問題の修正

### **5. リファクタリング**
```bash
# ブランチ名: refactor/{target}-{purpose}
git checkout develop
git pull origin develop
git checkout -b refactor/services-extract-common
git checkout -b refactor/models-improve-validation
git checkout -b refactor/api-error-handling
git checkout -b refactor/ui-component-structure
```

**命名規則:**
- `refactor/{対象}-{目的}`
- 例: `refactor/services-extract-common`, `refactor/ui-component-structure`

**対象:**
- コードの可読性向上
- パフォーマンス最適化
- アーキテクチャの改善
- 重複コードの削除

### **6. ドキュメント更新**
```bash
# ブランチ名: docs/update-{document-type}
git checkout develop
git pull origin develop
git checkout -b docs/update-api-specification
git checkout -b docs/update-readme
git checkout -b docs/update-deployment-guide
```

**命名規則:**
- `docs/update-{ドキュメントタイプ}`
- 例: `docs/update-api-specification`, `docs/update-readme`

**対象:**
- API仕様書の更新
- READMEの更新
- デプロイメントガイドの更新
- 開発者向けドキュメントの更新

### **7. CI/CD設定変更**
```bash
# ブランチ名: ci/update-{workflow-name}
git checkout develop
git pull origin develop
git checkout -b ci/update-github-actions
git checkout -b ci/update-test-workflow
git checkout -b ci/update-deployment-pipeline
```

**命名規則:**
- `ci/update-{ワークフロー名}`
- 例: `ci/update-github-actions`, `ci/update-test-workflow`

**対象:**
- GitHub Actionsワークフローの更新
- テスト設定の変更
- デプロイメント設定の変更

## ブランチ作成時のチェックリスト

### **ブランチ作成前**
- [ ] `develop`ブランチが最新であることを確認
- [ ] 作業内容に適したブランチ名を選択
- [ ] 関連するissueやTodoを確認
- [ ] 影響範囲を確認（バックエンド/フロントエンド/両方）

### **ブランチ作成時**
- [ ] `develop`ブランチから作成
- [ ] 適切なブランチ名で作成
- [ ] 作業内容を説明するコメントを追加

### **ブランチ作成後**
- [ ] 作業内容をissueやコメントに記録
- [ ] チームメンバーに作業開始を通知（必要に応じて）

## ブランチのライフサイクル

### **1. 開発フェーズ**
```bash
# 作業ブランチで開発・テスト
git add .
git commit -m "feat: implement PDF upload endpoint"
git commit -m "test: add API endpoint tests"
git commit -m "fix: resolve file size validation issue"
git commit -m "refactor: extract common validation logic"
```

### **2. レビューフェーズ**
```bash
# プルリクエストを作成
git push origin feature/implement-pdf-upload
# GitHubでプルリクエストを作成
```

### **3. 統合フェーズ**
```bash
# developブランチにマージ
git checkout develop
git pull origin develop
git merge feature/implement-pdf-upload
git push origin develop
```

### **4. リリースフェーズ**
```bash
# mainブランチにリリース
git checkout main
git pull origin main
git merge develop
git tag v1.0.0
git push origin main --tags
```

## コミットメッセージのルール

### **プレフィックス**
- `feat:` - 新機能
- `test:` - テスト関連
- `fix:` - バグ修正
- `refactor:` - リファクタリング
- `docs:` - ドキュメント
- `style:` - コードスタイル
- `perf:` - パフォーマンス改善
- `chore:` - その他の変更
- `ci:` - CI/CD設定変更

### **例**
```bash
git commit -m "feat: implement PDF to Markdown conversion API"
git commit -m "test: add Playwright E2E tests for file upload"
git commit -m "fix: resolve memory leak in large file processing"
git commit -m "refactor: extract common validation logic to utils"
git commit -m "docs: update API specification with new endpoints"
git commit -m "ci: update GitHub Actions workflow for Python 3.11"
```

## テスト戦略

### **テスト実行タイミング**
- **コミット前**: pre-commitフックで自動実行
- **プルリクエスト**: GitHub Actionsで自動実行
- **マージ前**: 全テストが通ることを確認

### **テスト構成**
```bash
# バックエンドテスト
make test-unit          # pytest ユニットテスト
make test-services      # サービステスト
make test-api           # APIテスト

# フロントエンドテスト
cd src/ui && pnpm test  # Jest テスト

# E2Eテスト
make test-e2e           # Playwright E2Eテスト

# 全テスト
make test-all           # 全テスト実行
```

### **カバレッジ要件**
- **バックエンド**: 80%以上
- **フロントエンド**: 70%以上
- **E2Eテスト**: 主要機能をカバー

## 注意事項

### **ブランチ名の制約**
- 小文字とハイフンのみ使用
- スペースや特殊文字は使用しない
- 日本語は使用しない
- 長すぎる名前は避ける

### **マージのタイミング**
- 必ずプルリクエストを作成
- コードレビューを実施
- テストが通ることを確認
- コンフリクトを解決してからマージ

### **ブランチの削除**
- マージ完了後は作業ブランチを削除
- リモートブランチも削除
- 古いブランチは定期的にクリーンアップ

### **技術スタック固有の注意点**
- **Python**: uv パッケージマネージャーを使用
- **Node.js**: pnpm パッケージマネージャーを使用
- **テスト**: 各言語・フレームワークに適したテストツールを使用

## 参考資料

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Playwright Documentation](https://playwright.dev/)
