const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的エクスポートを完全に無効化（CI環境用）
  output: undefined,

  // 画像最適化を有効化
  images: {
    unoptimized: false,
  },

  // トレーリングスラッシュを無効化
  trailingSlash: false,

  // 静的ファイルのベースパス設定
  assetPrefix: '',

  // ビルド時の警告を抑制
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // CI環境での最適化
  swcMinify: true,
  compress: true,

  // 静的ページ生成のタイムアウト設定
  staticPageGenerationTimeout: 120,

  // ビルド最適化設定
  experimental: {
    // CSS最適化を無効化（crittersの問題を回避）
    optimizeCss: false,
    // パッケージインポートの最適化
    optimizePackageImports: ['@/components', '@/hooks', '@/lib'],
  },

  // ビルド出力の最適化
  poweredByHeader: false,
  generateEtags: false,

  // Webpack設定でパスエイリアスを設定
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
}

module.exports = nextConfig
