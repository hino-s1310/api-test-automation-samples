# GitHub リポジトリ設定ガイド

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

## カバレッジレポートの確認方法

### 1. Step Summary
GitHub Actions の実行結果ページで「Summary」タブを確認

### 2. Artifacts
- 実行完了後に Artifacts セクションからダウンロード
- `htmlcov/index.html` をブラウザで開く

### 3. ローカル実行
```bash
make coverage
open htmlcov/index.html
```

## セキュリティ考慮事項

### Fork からの PR の制限理由

1. **機密情報の保護**: シークレットへのアクセス制限
2. **不正なコード実行の防止**: 悪意のあるコードの実行防止
3. **リポジトリの改ざん防止**: 不正な変更の防止

### 安全な運用のためのベストプラクティス

1. **最小権限の原則**: 必要最小限の権限のみ付与
2. **条件付き実行**: Fork の場合は機能を制限
3. **フォールバック機能**: 権限不足時の代替手段を用意
