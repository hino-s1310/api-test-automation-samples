# マイグレーション管理ガイド

## 概要

このドキュメントでは、SQLModel導入後のデータベースマイグレーション管理について説明します。

## マイグレーション管理ツール

### セットアップ

```bash
# マイグレーション管理スクリプトを実行可能にする
chmod +x scripts/migration_manager.py
```

### 基本的な使用方法

```bash
# 前提条件チェック
python scripts/migration_manager.py --action check --environment production

# 現在のリビジョン確認
python scripts/migration_manager.py --action current --environment production

# マイグレーション履歴確認
python scripts/migration_manager.py --action history --environment production

# マイグレーション実行（ドライラン）
python scripts/migration_manager.py --action migrate --environment production --dry-run

# マイグレーション実行
python scripts/migration_manager.py --action migrate --environment production

# ロールバック
python scripts/migration_manager.py --action rollback --environment production --target <revision_id>

# データベースバックアップ
python scripts/migration_manager.py --action backup --environment production
```

## 本番環境でのマイグレーション手順

### 1. 事前準備

#### 1.1 環境確認
```bash
# 本番環境の設定確認
echo $ENVIRONMENT  # production であることを確認

# データベースファイルの存在確認
ls -la data/database.db

# 現在のマイグレーション状態確認
python scripts/migration_manager.py --action current --environment production
```

#### 1.2 バックアップ作成
```bash
# 自動バックアップ（推奨）
python scripts/migration_manager.py --action backup --environment production

# 手動バックアップ
cp data/database.db data/database.db.backup_$(date +%Y%m%d_%H%M%S)
```

#### 1.3 前提条件チェック
```bash
# すべての前提条件が満たされていることを確認
python scripts/migration_manager.py --action check --environment production
```

### 2. マイグレーション実行

#### 2.1 ドライラン実行
```bash
# 実際の変更を行わずにマイグレーション内容を確認
python scripts/migration_manager.py --action migrate --environment production --dry-run
```

#### 2.2 マイグレーション実行
```bash
# 本番環境でマイグレーション実行
python scripts/migration_manager.py --action migrate --environment production
```

#### 2.3 実行後検証
```bash
# マイグレーション後の状態確認
python scripts/migration_manager.py --action current --environment production

# データベース互換性確認
python scripts/migration_manager.py --action check --environment production

# アプリケーション動作確認
make test  # または本番環境での機能テスト
```

### 3. 問題発生時の対応

#### 3.1 ロールバック手順
```bash
# 前のリビジョンにロールバック
python scripts/migration_manager.py --action rollback --environment production --target <previous_revision_id>

# ロールバック後の検証
python scripts/migration_manager.py --action check --environment production
```

#### 3.2 バックアップからの復元
```bash
# バックアップファイルから復元
cp data/database.db.backup_<timestamp> data/database.db

# 復元後の検証
python scripts/migration_manager.py --action check --environment production
```

## 開発環境でのマイグレーション

### 新しいマイグレーション作成

```bash
# 新しいマイグレーションファイル作成
uv run alembic revision --autogenerate -m "Description of changes"

# 手動でマイグレーションファイル作成
uv run alembic revision -m "Description of changes"
```

### 開発環境でのテスト

```bash
# テスト環境でマイグレーション実行
ENVIRONMENT=test python scripts/migration_manager.py --action migrate --environment test

# テスト実行
ENVIRONMENT=test make test
```

## マイグレーション戦略

### バージョン管理戦略

1. **ベースライン管理**
   - 既存のテーブル構造をベースラインとして管理
   - 新しい変更は段階的に適用

2. **後方互換性の維持**
   - 既存のAPI機能を破壊しない変更のみ適用
   - カラムの削除は段階的に実行（非推奨 → 削除）

3. **SQLite制約への対応**
   - `ALTER COLUMN`の制約を考慮した安全なマイグレーション
   - 必要に応じてテーブル再作成による変更

### マイグレーション実行タイミング

1. **開発環境**
   - 機能開発時に随時実行
   - テスト環境での事前検証

2. **本番環境**
   - メンテナンス時間帯での実行
   - 段階的なロールアウト

### リスク管理

1. **バックアップ戦略**
   - マイグレーション前の自動バックアップ
   - 複数世代のバックアップ保持

2. **ロールバック計画**
   - 各マイグレーションのロールバック手順
   - 緊急時の復旧手順

3. **監視・アラート**
   - マイグレーション実行状況の監視
   - エラー発生時の即座な通知

## トラブルシューティング

### よくある問題と解決方法

#### 1. マイグレーション実行エラー
```bash
# エラー内容の確認
uv run alembic upgrade head --sql

# データベース状態の確認
python scripts/migration_manager.py --action check --environment production
```

#### 2. リビジョン不整合
```bash
# 現在の状態確認
python scripts/migration_manager.py --action current --environment production

# 履歴確認
python scripts/migration_manager.py --action history --environment production

# 必要に応じて手動でリビジョン修正
```

#### 3. データベース破損
```bash
# バックアップからの復元
cp data/database.db.backup_<timestamp> data/database.db

# データベース整合性チェック
sqlite3 data/database.db "PRAGMA integrity_check;"
```

## 参考情報

- [Alembic公式ドキュメント](https://alembic.sqlalchemy.org/)
- [SQLModel公式ドキュメント](https://sqlmodel.tiangolo.com/)
- [SQLite ALTER TABLE制約](https://www.sqlite.org/lang_altertable.html)

## 連絡先

マイグレーションに関する問題や質問がある場合は、開発チームまでご連絡ください。
