'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import MarkdownDisplay from '@/components/MarkdownDisplay';
import { api } from '@/lib/api';
import { UploadState, UploadResponse } from '@/types';
import { useViewportHeight } from '@/hooks/useViewportHeight';

export default function Home() {
  const { availableHeight, availableHeightMobile } = useViewportHeight();
  const [uploadState, setUploadState] = useState<UploadState>({
    isLoading: false,
    error: null,
    result: null,
  });

  const handleUpload = async (file: File) => {
    setUploadState({
      isLoading: true,
      error: null,
      result: null,
    });

    try {
      const result = await api.uploadPdf(file);
      setUploadState({
        isLoading: false,
        error: null,
        result,
      });
    } catch (error: any) {
      let errorMessage = 'アップロードに失敗しました。';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUploadState({
        isLoading: false,
        error: errorMessage,
        result: null,
      });
    }
  };

  const handleNewUpload = () => {
    setUploadState({
      isLoading: false,
      error: null,
      result: null,
    });
  };

  return (
    <div 
      className="flex flex-col h-full max-h-full"
      style={{ 
        height: `${availableHeight}px`,
        maxHeight: `${availableHeight}px`
      }}
      data-testid="upload-page"
    >
      {/* ヘッダー部分 - 固定サイズ */}
      <div className="text-left mb-4 flex-shrink-0" data-testid="page-header">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1" data-testid="page-title">
          アップロード
        </h1>
        <p className="text-lg text-gray-600" data-testid="page-description">
          PDFファイルをアップロードしてMarkdown形式に変換します。
        </p>
      </div>
      
      {/* メインコンテンツ - 残りの高さを均等に分割 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 flex-1 min-h-0" data-testid="main-content">
        {/* 左側: アップロードセクション - スクロールなし */}
        <div className="flex flex-col space-y-3 lg:space-y-4 h-full" data-testid="upload-section">
          {/* ファイルアップロード - 固定サイズ */}
          <div className="card flex-shrink-0" data-testid="upload-card">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3" data-testid="upload-card-title">
              ファイルアップロード
            </h2>
            <FileUpload onUpload={handleUpload} uploadState={uploadState} />
          </div>

          {/* 使用方法の説明 - コンパクト化して固定サイズ */}
          <div className="card flex-shrink-0" data-testid="usage-card">
            <h3 className="text-md lg:text-lg font-semibold text-gray-900 mb-2" data-testid="usage-title">使用方法</h3>
            <div className="grid grid-cols-2 gap-2 text-xs lg:text-sm text-gray-600" data-testid="usage-steps">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>PDFファイルをドラッグ&ドロップ</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>自動変換開始</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>右側にプレビュー表示</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>コピー・ダウンロード可能</span>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md" data-testid="usage-note">
              <p className="text-xs text-yellow-800">
                <strong>注意:</strong> 10MB以下のPDFファイルのみ対応
              </p>
            </div>
          </div>
        </div>

        {/* 右側: 結果表示セクション - スクロールなし */}
        <div className="flex flex-col h-full min-h-0" data-testid="result-section">
          {uploadState.result ? (
            <MarkdownDisplay 
              result={uploadState.result} 
              onNewUpload={handleNewUpload}
            />
          ) : (
            <div className="card h-full flex items-center justify-center" data-testid="empty-state">
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3" data-testid="empty-icon">
                  <svg 
                    className="w-6 h-6 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                    />
                  </svg>
                </div>
                <h3 className="text-md lg:text-lg font-medium text-gray-900 mb-1" data-testid="empty-title">
                  変換結果がここに表示されます
                </h3>
                <p className="text-xs lg:text-sm text-gray-500" data-testid="empty-description">
                  PDFファイルをアップロードすると、Markdownがここに表示されます。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
