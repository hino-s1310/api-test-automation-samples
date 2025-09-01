const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // standaloneモードを有効化（CI環境での起動改善）
  output: 'standalone',

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
    // standaloneモードの設定
    outputFileTracingRoot: path.join(__dirname, '../../'),
    // サーバーコンポーネントの最適化
    serverComponentsExternalPackages: [],
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

    // standaloneモードでの最適化
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }

    return config;
  },
}

module.exports = nextConfig
