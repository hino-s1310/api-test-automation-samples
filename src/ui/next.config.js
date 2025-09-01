const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // CI環境では静的エクスポートを完全に無効化
  output: undefined,

  // 画像最適化を有効化（サーバー起動時）
  images: {
    unoptimized: false,
  },

  // トレーリングスラッシュを無効化（サーバー起動時）
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

  // App Routerの有効化
  experimental: {
    appDir: true,
  },

  // CI環境での最適化
  swcMinify: true,
  compress: true,
}

module.exports = nextConfig
