# ブランチ戦略・ブランチ作成ルール

## 概要

このドキュメントでは、PDF to Markdown APIのテスト自動化サンプルプロジェクトにおけるブランチ戦略とブランチ作成ルールを定義します。

## ブランチ構成

### **メインブランチ**
- `main` - 本番環境用の安定版ブランチ
- `develop` - 開発・統合用のブランチ

### **作業ブランチ**
- `feature/*` - 新機能開発用
- `test/*` - テスト追加・改善用
- `bugfix/*` - バグ修正用
- `refactor/*` - リファクタリング用

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

### **2. pytestまたはPlaywrightのテストを追加するとき**
```bash
# ブランチ名: test/add-{test-type}-{target}
git checkout develop
git pull origin develop
git checkout -b test/add-pytest-api-endpoints
git checkout -b test/add-playwright-e2e-upload
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

### **3. issueに起票された不具合の修正や、Todoを対応するとき**
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

### **4. リファクタリング**
```bash
# ブランチ名: refactor/{target}-{purpose}
git checkout develop
git pull origin develop
git checkout -b refactor/services-extract-common
git checkout -b refactor/models-improve-validation
git checkout -b refactor/api-error-handling
```

**命名規則:**
- `refactor/{対象}-{目的}`
- 例: `refactor/services-extract-common`, `refactor/models-improve-validation`

**対象:**
- コードの可読性向上
- パフォーマンス最適化
- アーキテクチャの改善
- 重複コードの削除

## ブランチ作成時のチェックリスト

### **ブランチ作成前**
- [ ] `develop`ブランチが最新であることを確認
- [ ] 作業内容に適したブランチ名を選択
- [ ] 関連するissueやTodoを確認

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
```

### **2. レビューフェーズ**
```bash
# プルリクエストを作成
git push origin feature/implement-pdf-upload
# GitHub/GitLabでプルリクエストを作成
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

### **例**
```bash
git commit -m "feat: implement PDF to Markdown conversion API"
git commit -m "test: add Playwright E2E tests for file upload"
git commit -m "fix: resolve memory leak in large file processing"
git commit -m "refactor: extract common validation logic to utils"
```

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

## 参考資料

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
