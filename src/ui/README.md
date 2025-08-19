# PDF to Markdown Converter UI

Next.jsとTailwind CSSを使用したPDFからMarkdownへの変換UIです。

## 機能

- **ドラッグ&ドロップアップロード**: PDFファイルを簡単にアップロード
- **リアルタイム変換**: ファイルアップロード後、即座にMarkdownに変換
- **プレビュー機能**: 変換されたMarkdownをリアルタイムでプレビュー
- **コピー/ダウンロード**: 変換結果をクリップボードにコピーまたはファイルとしてダウンロード
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップに対応

## セットアップ

### 1. 依存関係のインストール

```bash
cd src/ui
pnpm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下を設定してください：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 使用方法

1. **ファイルアップロード**: メインページでPDFファイルをドラッグ&ドロップまたはクリックして選択
2. **変換の確認**: アップロード後、自動的に変換が開始されます
3. **結果の確認**: 右側のパネルに変換されたMarkdownがプレビュー表示されます
4. **コピー/ダウンロード**: 結果をクリップボードにコピーまたはファイルとしてダウンロード

## 技術スタック

- **Next.js 14**: React フレームワーク
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストCSS
- **React Markdown**: Markdownプレビュー
- **React Dropzone**: ファイルアップロード
- **Axios**: HTTP クライアント

## プロジェクト構造

```
src/ui/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # ルートレイアウト
│   │   ├── page.tsx         # メインページ
│   │   └── globals.css      # グローバルスタイル
│   ├── components/          # Reactコンポーネント
│   │   ├── FileUpload.tsx   # ファイルアップロードコンポーネント
│   │   └── MarkdownDisplay.tsx # Markdown表示コンポーネント
│   ├── lib/                 # ユーティリティライブラリ
│   │   └── api.ts           # APIクライアント
│   └── types/               # TypeScript型定義
│       └── index.ts         # 共通型定義
├── package.json
├── tailwind.config.js       # Tailwind CSS設定
├── tsconfig.json           # TypeScript設定
└── next.config.js          # Next.js設定
```

## API連携

このUIは以下のAPIエンドポイントと連携します：

- `POST /upload` - PDFファイルのアップロードと変換
- `GET /files/{id}` - 保存済みファイルの取得
- `GET /files` - ファイル一覧の取得
- `PUT /files/{id}` - ファイルの更新
- `DELETE /files/{id}` - ファイルの削除

## 開発

### linting

```bash
pnpm lint
```

### 型チェック

```bash
pnpm type-check
```

### ビルド

```bash
pnpm build
```

### 本番実行

```bash
pnpm start
```

## 今後の拡張予定

- [ ] ファイル一覧表示ページ
- [ ] ファイル管理機能（更新・削除）
- [ ] 変換履歴の表示
- [ ] ダークモード対応
- [ ] 多言語対応
- [ ] プログレスバーの改善
- [ ] エラーハンドリングの強化
