const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CI環境では静的エクスポートを無効化
  output: process.env.CI ? undefined : 'export',

  // 画像最適化を無効化（静的エクスポートでは使用できない）
  images: {
    unoptimized: true,
  },

  // トレーリングスラッシュを有効化
  trailingSlash: true,

  // 静的ファイルのベースパス設定
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',

  // ビルド時の警告を抑制
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // 静的エクスポート用の設定
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
