# PDF to Markdown Converter UI

Next.jsとTailwind CSSを使用したPDFからMarkdownへの変換UIです。

## 機能

- **ドラッグ&ドロップアップロード**: PDFファイルを簡単にアップロード
- **リアルタイム変換**: ファイルアップロード後、即座にMarkdownに変換
- **プレビュー機能**: 変換されたMarkdownをリアルタイムでプレビュー
- **ファイル一覧表示**: 変換済みファイルの一覧表示とレスポンシブページネーション
- **ファイル管理**: ファイル詳細表示、削除機能
- **アダプティブ表示**: 画面サイズに応じて表示件数を自動調整
- **サイドバーナビゲーション**: 常時表示のクリーンなサイドメニュー
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

### アップロードページ (`/`)
1. **ファイルアップロード**: メインページでPDFファイルをドラッグ&ドロップまたはクリックして選択
2. **変換の確認**: アップロード後、自動的に変換が開始されます
3. **結果の確認**: 右側のパネルに変換されたMarkdownがプレビュー表示されます
4. **コピー/ダウンロード**: 結果をクリップボードにコピーまたはファイルとしてダウンロード

### ファイル一覧ページ (`/files`)
1. **一覧表示**: 変換済みファイルの一覧を確認
2. **ページネーション**: 10件ずつ表示、ページ移動機能
3. **詳細表示**: 「詳細」ボタンでMarkdownの詳細表示
4. **ファイル削除**: 「削除」ボタンでファイル削除

## 技術スタック

- **Next.js 14**: React フレームワーク（App Router使用）
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
│   │   ├── page.tsx         # メインページ（アップロード）
│   │   ├── files/
│   │   │   └── page.tsx     # ファイル一覧ページ
│   │   └── globals.css      # グローバルスタイル
│   ├── components/          # Reactコンポーネント
│   │   ├── FileUpload.tsx   # ファイルアップロードコンポーネント
│   │   ├── MarkdownDisplay.tsx # Markdown表示コンポーネント
│   │   ├── FileListTable.tsx # ファイル一覧テーブル
│   │   ├── FileDetailModal.tsx # ファイル詳細モーダル
│   │   ├── Pagination.tsx   # ページネーションコンポーネント
│   │   └── Sidebar.tsx      # サイドバーナビゲーション
│   ├── hooks/               # カスタムReactフック
│   │   └── useResponsivePagination.ts # レスポンシブページネーション
│   ├── lib/                 # ユーティリティライブラリ
│   │   └── api.ts           # APIクライアント
│   └── types/               # TypeScript型定義
│       └── index.ts         # 共通型定義
├── package.json
├── tailwind.config.js       # Tailwind CSS設定
├── tsconfig.json           # TypeScript設定
└── next.config.js          # Next.js設定（プロキシ・エイリアス含む）
```

## エイリアスパス設定

このプロジェクトでは、`@/` エイリアスパスを使用してモジュールをインポートできます：

```typescript
// エイリアスパス使用例
import { api } from '@/lib/api';
import { UploadResponse } from '@/types';
import FileUpload from '@/components/FileUpload';
```

### 設定詳細

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### `next.config.js`
```javascript
const path = require('path');

const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};
```

## API連携

このUIは以下のAPIエンドポイントと連携します：

- `POST /upload` - PDFファイルのアップロードと変換
- `GET /files/{id}` - 保存済みファイルの取得
- `GET /files` - ファイル一覧の取得（ページネーション対応）
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

## サイドバーナビゲーション

### 概要
常時表示されるクリーンなサイドバーレイアウトで、画面の縦方向のスペースを最大限活用します。

### 特徴
- **デスクトップ**: 常に展開された状態で256px幅固定
- **モバイル**: ハンバーガーメニューでサイドバーを呼び出し
- **アイコンベース**: 直感的なアイコンとラベルの組み合わせ
- **安定したレイアウト**: アニメーションなしのシンプルな動作

### デバイス別動作
- **デスクトップ（1024px以上）**: 
  - 常時表示: 256px幅固定でアイコンとラベルを表示
  - 安定したレイアウト: ホバー効果なし
- **タブレット・モバイル（1024px未満）**: 
  - ハンバーガーメニューからサイドバーを呼び出し
  - オーバーレイ付きのフルサイドバー表示

## レスポンシブページネーション機能

### 概要
画面サイズに応じて自動的に表示件数を調整し、スクロールを最小限に抑える機能です。

### 特徴
- **動的表示件数調整**: 画面高さに基づいて最適な表示件数を自動計算
- **ページ別最適化**: アップロード画面とファイル一覧画面で専用の計算ロジック
- **デバウンス処理**: リサイズイベントの頻発を防ぐ150msデバウンス
- **レスポンシブ対応**: デスクトップ・タブレット・モバイルで最適化
- **パフォーマンス最適化**: 不要な再計算を防ぐメモ化機能
- **表示件数の一貫性**: ページ切り替え時の件数変動を防止

### 技術詳細

#### ファイル一覧画面専用フック
```typescript
const { itemsPerPage } = useFileListPagination({
  minItemsPerPage: 5,     // 最小表示件数
  maxItemsPerPage: 30,    // 最大表示件数
  itemHeight: 72,         // 1行あたりの高さ
});
```

#### アップロード画面用フック
```typescript
const { itemsPerPage } = useResponsivePagination({
  minItemsPerPage: 5,     // 最小表示件数
  maxItemsPerPage: 30,    // 最大表示件数
  itemHeight: 72,         // 1行あたりの高さ
  headerHeight: 160,      // ヘッダー部分の高さ
  paginationHeight: 100,  // ページネーション部分の高さ
  marginHeight: 80        // 余白の高さ
});
```

### 動作例
- **デスクトップ（1080p）**: 約20-25件表示（従来比+50%）
- **タブレット（768px）**: 約12-15件表示（従来比+25%）
- **モバイル（390px）**: 約8-10件表示（従来比+60%）

## 今後の拡張予定

- [x] ファイル一覧表示ページ
- [x] ファイル管理機能（削除）
- [x] ページネーション機能
- [x] レスポンシブページネーション
- [x] レスポンシブデザイン
- [x] ファイル更新機能
- [ ] ダークモード対応
- [ ] プログレスバーの改善
- [ ] エラーハンドリングの強化
- [ ] 認証機能