const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的エクスポートの設定
  output: 'export',
  
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
}

module.exports = nextConfig
