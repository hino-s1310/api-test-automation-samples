# test-automation-samples

Web（Next.js）＋API（FastAPI）＋Mobile（Expo）のサンプルアプリに自動テストコードを作成しています。

サンプルアプリはPDFをMarkdown形式に変換し、PDFの内容を虫食いにして覚えているかどうかを確認できるアプリです。JSTQBの学習に役立てられればと思います。

### **主な特徴**
- 同じAPIに対して複数のテストツールでの実装例を提供
- 包括的なテスト戦略（ユニット、E2E、CI/CD）
- **Web・モバイル・APIの統合開発環境**
- **PDF→Markdown変換 + 穴埋めクイズ機能**
- モダンな技術スタックの採用
- 実用的なサンプルコード

## 技術スタック

### **バックエンド**
- **フレームワーク**: FastAPI 0.104.1+
- **言語**: Python 3.10+
- **パッケージマネージャー**: uv
- **データベース**: SQLite
- **PDF処理**: markitdown, pypdf, pdfplumber

### **フロントエンド**
- **フレームワーク**: Next.js 14
- **言語**: TypeScript 5.2+
- **UIライブラリ**: React 18
- **スタイリング**: Tailwind CSS 3.3+
- **パッケージマネージャー**: pnpm 8.10+ (UI), pnpm 9.15+ (E2E)

### **モバイルアプリ**
- **フレームワーク**: Expo 50
- **言語**: TypeScript 5.3+
- **UIライブラリ**: React Native 0.73.6
- **ナビゲーション**: Expo Router
- **パッケージマネージャー**: pnpm 9.15+

### **テスト**
- **Python**: pytest + pytest-asyncio + pytest-cov
- **TypeScript**: Jest + Testing Library
- **E2E**: Playwright (Web), Maestro (Mobile)
- **カバレッジ**: pytest-cov, Jest coverage

### **CI/CD**
- **プラットフォーム**: GitHub Actions
- **実行環境**: Ubuntu Latest
- **カバレッジ**: Codecov
- **アーティファクト**: GitHub Actions Artifacts

## モバイルアプリ拡充ロードマップ

### **詳細な機能チェックリスト**

#### **フェーズ0: 基盤構築** ✅
- [x] Expo 50 + React Native 0.73.6環境構築
- [x] TypeScript設定・型定義
- [x] 基本的なディレクトリ構造
- [x] pnpmワークスペース設定

#### **フェーズ1: PDFアップロード機能** ✅
- [x] Expo Document Picker統合
- [x] PDFファイル選択・検証
- [x] FastAPI連携・アップロード
- [x] エラーハンドリング

#### **フェーズ2: Markdown表示** ✅
- [x] 変換結果の表示
- [x] 基本的なスタイリング
- [x] レスポンシブレイアウト
- [x] 成功・エラー通知

#### **フェーズ3: 穴埋めクイズ機能** 🔄
- [ ] マークダウンテキストの解析
- [ ] 穴埋め問題の自動生成
- [ ] クイズUIの実装
- [ ] 回答・採点機能

#### **フェーズ4: ファイル管理** 📋
- [ ] アップロード履歴表示
- [ ] ファイル一覧・検索
- [ ] ファイル削除・更新
- [ ] ローカルストレージ連携

#### **フェーズ5: 進捗管理** 📋
- [ ] 変換進捗バー
- [ ] 完了通知・プッシュ通知
- [ ] バックグラウンド処理
- [ ] エラーリトライ機能

#### **フェーズ6: オフライン対応** 📋
- [ ] ローカルキャッシュ
- [ ] オフライン時の動作
- [ ] 同期機能
- [ ] データ整合性チェック

#### **フェーズ7: 高度なUI/UX** 📋
- [ ] アニメーション・トランジション
- [ ] ジェスチャー操作
- [ ] ダークモード対応
- [ ] アクセシビリティ向上

## プロジェクト構成

```
test-automation-samples/
├── apps/                          # アプリケーション群
│   ├── web/                       # Next.js フロントエンド
│   │   ├── src/
│   │   │   ├── app/               # App Router
│   │   │   │   ├── upload/        # アップロードページ
│   │   │   │   └── files/         # ファイル一覧ページ
│   │   │   ├── components/        # React コンポーネント
│   │   │   ├── hooks/             # カスタムフック
│   │   │   ├── lib/               # ユーティリティ
│   │   │   ├── types/             # TypeScript型定義
│   │   │   └── __tests__/         # テストファイル
│   │   ├── package.json           # 依存関係
│   │   └── jest.config.ts         # Jest設定
│   ├── mobile/                    # Expo (React Native) モバイルアプリ
│   │   ├── src/
│   │   │   ├── components/        # React Native コンポーネント
│   │   │   ├── screens/           # 画面コンポーネント
│   │   │   ├── hooks/             # カスタムフック
│   │   │   ├── lib/               # ユーティリティ
│   │   │   └── types/             # TypeScript型定義
│   │   ├── app/                   # Expo Router
│   │   ├── assets/                # 画像・アイコン
│   │   ├── app.json               # Expo設定
│   │   ├── package.json           # 依存関係
│   │   └── tsconfig.json          # TypeScript設定
│   └── api/                       # FastAPI バックエンド
│       ├── main.py                # メインアプリケーション
│       ├── models.py              # データモデル
│       ├── database.py            # データベース管理
│       └── services/              # ビジネスロジック
│           ├── file_service.py    # ファイル管理サービス
│           └── pdf_service.py     # PDF変換サービス
├── tests/                          # テストコード
│   ├── unit/                      # Python ユニットテスト
│   │   ├── test_api.py            # APIテスト
│   │   ├── test_services.py       # サービステスト
│   │   ├── fixtures/              # テストデータ
│   │   └── helpers/               # テストヘルパー
│   └── e2e/                       # E2Eテスト
│       ├── playwright/            # Web E2Eテスト
│       │   ├── tests/             # Playwrightテスト
│       │   ├── fixtures/          # テストデータ
│       │   ├── package.json       # 依存関係
│       │   └── playwright.config.ts # Playwright設定
│       └── maestro/               # Mobile E2Eテスト
│           ├── tests/             # Maestroテスト
│           └── fixtures/          # テストデータ
├── .github/workflows/              # GitHub Actions
│   ├── backend_unit_test.yml      # バックエンドテスト
│   ├── frontend_unit_test.yml     # フロントエンドテスト
│   └── e2e_test_dev.yml           # E2Eテスト
├── docs/                           # ドキュメント
├── data/                           # データファイル
├── Makefile                        # 開発用コマンド
├── pnpm-workspace.yaml            # pnpmワークスペース管理
├── pyproject.toml                 # Python設定
├── package.json                    # ルート設定
└── README.md                       # プロジェクト説明
```

## 機能一覧

### **API エンドポイント**

#### ファイル管理
- `POST /upload` - PDFファイルアップロード・変換
- `GET /files/{file_id}` - ファイル情報取得
- `GET /files` - ファイル一覧取得
- `PUT /files/{file_id}` - ファイル更新・再変換
- `DELETE /files/{file_id}` - ファイル削除
- `GET /files/{file_id}/logs` - 変換ログ取得

#### システム管理
- `GET /health` - ヘルスチェック
- `GET /statistics` - 統計情報
- `POST /cleanup` - 古いファイルクリーンアップ
- `POST /test/reset-db` - テスト用DBリセット

### **フロントエンド機能**
- PDFファイルアップロード
- Markdownプレビュー
- ファイル管理（一覧・削除・更新）
- レスポンシブデザイン

### **モバイルアプリ機能**
- PDFファイル選択・アップロード
- Markdown変換結果表示
- 基本的なUI/UX
- 穴埋めクイズ機能（開発中）

## テストツール
### **テスト構成（テストピラミッド＋サイズ感）**

#### Unitテスト (S: Small)
- **バックエンド**
  - pytest + pytest-asyncio
  - ビジネスロジック、変換関数、バリデーションの検証
- **フロントエンド**
  - Jest + Testing Library
  - UIコンポーネント単体の表示／状態遷移テスト
- **モバイル**
  - Jest + React Native Testing Library
  - Hooksやコンポーネントの単体テスト
- **カバレッジ管理**
  - pytest-cov, Jest coverage

#### Integrationテスト (M: Medium)
- **APIレベル統合**
  - pytest + httpx
  - APIエンドポイント疎通、リクエスト/レスポンス仕様確認
- **DBレベル統合**
  - SQLite + テストデータ
  - ORM操作やクエリ挙動の検証
- **UI→API統合**
  - Playwright（Web）、Maestro（Mobile）
  - UI操作をトリガーにAPIが呼ばれ、レスポンスが反映されることを確認

#### Systemテスト (L: Large, End-to-End)
- **Web**: Playwright
- **Mobile**: Maestro
- **シナリオ**:
  - ユーザーが「PDFアップロード → Markdown変換 → 赤セル編集 → 暗記確認」までを完了できるか
  - ハッピーパス中心

---

## CI/CD & テスト自動化

### GitHub Actions ワークフロー

このプロジェクトは包括的なCI/CDパイプラインを提供します：

#### **主要ワークフロー**

| ワークフロー | トリガー | 目的 | 実行内容 |
|-------------|----------|------|----------|
| `backend_unit_test.yml` | PR作成・main push・定期実行 | バックエンドユニットテスト | pytest + カバレッジ + コード品質 |
| `frontend_unit_test.yml` | PR作成・main push・定期実行 | フロントエンドユニットテスト | Jest + カバレッジ + TypeScript型チェック |
| `e2e_test_dev.yml` | PR作成・main push・定期実行 | E2Eテスト | Playwright + 実際のAPIサーバー連携 |

#### **実行タイミング**
- **PR作成・更新時**: 全テストを実行（Lint + Unit + E2E）
- **mainブランチプッシュ時**: 全テストを実行
- **毎日午前3時（JST）**: バックエンド・フロントエンド・モバイルの定期テスト
- **毎日午後6時（JST）**: E2Eテストの定期実行
- **手動実行**: 必要に応じて実行可能

#### **CI/CDパイプライン構成**
```
CI/CD Pipeline
├── バックエンドテスト
│   ├── Python 3.10 + uv
│   ├── pytest + カバレッジ
│   └── コード品質チェック
├── フロントエンドテスト
│   ├── Node.js 20.x + pnpm
│   ├── Jest + カバレッジ
│   └── TypeScript型チェック
├── モバイルアプリテスト
│   ├── Node.js 20.x + pnpm
│   ├── Jest + React Native Testing Library
│   └── TypeScript型チェック
└── E2Eテスト
    ├── Playwright (Web)
    ├── Maestro (Mobile)
    └── 実際のAPIサーバー連携
```

#### **品質保証プロセス**
1. **Lintチェック**: ESLint, Flake8, Black, Ruff
2. **型チェック**: TypeScript, MyPy
3. **ユニットテスト**: Jest, pytest
4. **E2Eテスト**: Playwright, Maestro
5. **カバレッジ**: 最小80%以上を要求
6. **アーティファクト**: テスト結果・カバレッジレポートを保存

### 開発者向けツール

#### **Make コマンド（バックエンド）**
```bash
# 環境セットアップ
make install          # 依存関係のインストール
make install-hooks    # pre-commitフックのインストール

# テスト実行
make test            # ユニットテスト
make test-unit       # ユニットテスト
make test-services   # サービステスト
make test-api        # APIテスト

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

#### **pnpm コマンド（統合管理）**
```bash
# 全依存関係インストール
pnpm install:all

# 開発サーバー起動
pnpm dev:web        # Next.js フロントエンド
pnpm dev:mobile     # Expo モバイルアプリ
pnpm dev:api        # FastAPI バックエンド

# テスト実行
pnpm test:web       # フロントエンドテスト
pnpm test:mobile    # モバイルアプリテスト
pnpm test:api       # バックエンドテスト
pnpm test:e2e:web   # Web E2Eテスト
pnpm test:e2e:mobile # Mobile E2Eテスト

# ビルド
pnpm build:web      # Next.js ビルド
pnpm build:mobile   # Expo ビルド
```

#### **pnpm コマンド（個別アプリ）**
```bash
# Webアプリ
cd apps/web
pnpm dev             # 開発サーバー起動
pnpm build           # ビルド
pnpm start           # 本番サーバー起動
pnpm test            # テスト実行
pnpm test --coverage # カバレッジ付きテスト
pnpm lint            # Lintチェック
pnpm type-check      # 型チェック

# モバイルアプリ
cd apps/mobile
pnpm start           # Expo開発サーバー起動
pnpm android         # Androidエミュレータ起動
pnpm ios             # iOSシミュレータ起動
pnpm test            # テスト実行
pnpm lint            # Lintチェック
pnpm type-check      # 型チェック
```

#### **Pre-commit フック**
コミット前に自動的に実行されるチェック：
- コードフォーマット (Black, Ruff)
- Lintチェック (Flake8, ESLint)
- 型チェック (MyPy, TypeScript)
- ユニットテスト実行

---

## クイックスタート

### **前提条件**
- Python 3.10+
- Node.js 20.x+
- uv (Python パッケージマネージャー)
- pnpm (Node.js パッケージマネージャー)

### **セットアップ手順**

#### 1. リポジトリクローン
```bash
git clone https://github.com/yourusername/test-automation-samples.git
cd test-automation-samples
```

#### 2. 全依存関係インストール
```bash
# 全アプリケーションの依存関係を一括インストール
pnpm install:all
```

#### 3. 個別アプリケーションの起動

**バックエンド（API）**
```bash
# 開発サーバー起動
pnpm dev:api

# または個別に
cd apps/api
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**フロントエンド（Web）**
```bash
# 開発サーバー起動
pnpm dev:web

# または個別に
cd apps/web
pnpm dev
```

**モバイルアプリ**
```bash
# Expo開発サーバー起動
pnpm dev:mobile

# または個別に
cd apps/mobile
pnpm start
```

#### 4. テスト実行
```bash
# 全テスト実行
pnpm test:web       # フロントエンド
pnpm test:mobile    # モバイルアプリ
pnpm test:api       # バックエンド
pnpm test:e2e:web   # Web E2E
pnpm test:e2e:mobile # Mobile E2E

# 個別実行
cd apps/web && pnpm test
cd apps/mobile && pnpm test
cd apps/api && uv run pytest tests/unit/
```

### **動作確認**
- バックエンド: http://localhost:8000
- フロントエンド: http://localhost:3000
- API ドキュメント: http://localhost:8000/docs
- モバイル: Expo GoアプリでQRコード読み取り

---

## 📋 今後の拡張フェーズ

### **短期目標（1-2ヶ月）**
- [ ] **フェーズ3**: 穴埋めクイズ機能の完全実装
- [ ] **フェーズ4**: ファイル一覧・管理機能
- [ ] **フェーズ5**: 進捗管理・通知機能

### **中期目標（3-6ヶ月）**
- [ ] **フェーズ6**: オフライン対応
- [ ] **フェーズ7**: 高度なUI/UX
- [ ] **テスト拡充**: Maestro E2Eテスト完全実装
- [ ] **CI/CD強化**: モバイルアプリの自動テスト統合

### **長期目標（6ヶ月以上）**
- [ ] **パフォーマンス最適化**: 大容量ファイル対応
- [ ] **セキュリティ強化**: 認証・認可機能
- [ ] **スケーラビリティ**: マイクロサービス化
- [ ] **監視・ログ**: 本格運用対応

### **技術的課題・検討事項**
- [ ] **状態管理**: Zustand vs Redux Toolkit
- [ ] **API設計**: GraphQL vs REST
- [ ] **データベース**: PostgreSQL移行検討
- [ ] **コンテナ化**: Docker Compose最適化
- [ ] **CI/CD**: GitHub Actions vs GitLab CI
---

## トラブルシューティング

### **よくある問題と解決方法**

#### 1. 依存関係のインストールエラー
```bash
# キャッシュクリア
pnpm store prune
rm -rf node_modules
pnpm install:all
```

#### 2. モバイルアプリの起動エラー
```bash
# Expo CLIの更新
npm install -g @expo/cli@latest

# キャッシュクリア
expo start --clear
```

#### 3. APIサーバーの起動エラー
```bash
# Python環境の確認
uv python --version

# 依存関係の再インストール
cd apps/api
uv sync
```

#### 4. テストの実行エラー
```bash
# テスト環境の確認
pnpm test:web --verbose
pnpm test:mobile --verbose
uv run pytest tests/unit/ -v
```

---

## 参考資料

### **公式ドキュメント**
- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Expo公式ドキュメント](https://docs.expo.dev/)
- [React Native公式ドキュメント](https://reactnative.dev/)

### **テスト関連**
- [pytest公式ドキュメント](https://docs.pytest.org/)
- [Playwright公式ドキュメント](https://playwright.dev/)
- [Jest公式ドキュメント](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

### **パッケージ管理**
- [uv公式ドキュメント](https://docs.astral.sh/uv/)
- [pnpm公式ドキュメント](https://pnpm.io/)

---

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

---

**このリポジトリは、モダンなWeb・モバイル・API開発のベストプラクティスを学び、実践できる包括的なサンプルプロジェクトです。**
