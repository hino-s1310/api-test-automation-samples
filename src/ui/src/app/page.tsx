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
      className="flex flex-col h-full"
      style={{ 
        maxHeight: `${availableHeight}px`,
        minHeight: `${Math.min(600, availableHeight)}px`
      }}
    >
      {/* ヘッダー部分 */}
      <div className="text-left mb-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          アップロード
        </h1>
        <p className="text-lg text-gray-600">
          PDFファイルをアップロードしてMarkdown形式に変換します。
        </p>
      </div>
      
      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 flex-1 overflow-hidden">
        <div className="flex flex-col space-y-3 lg:space-y-4 h-full overflow-y-auto">
          <div className="card flex-shrink-0">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3">
              ファイルアップロード
            </h2>
            <FileUpload onUpload={handleUpload} uploadState={uploadState} />
          </div>

          {/* 使用方法の説明 - コンパクト化 */}
          <div className="card flex-shrink-0">
            <h3 className="text-md lg:text-lg font-semibold text-gray-900 mb-2">使用方法</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs lg:text-sm text-gray-600">
              <li>PDFファイルをドラッグ&ドロップまたはクリック</li>
              <li>自動的にアップロード・変換開始</li>
              <li>右側にプレビューが表示</li>
              <li>コピー・ダウンロード可能</li>
            </ol>
            
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>注意:</strong> 10MB以下のPDFファイルのみ対応
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col h-full overflow-hidden">
          {uploadState.result ? (
            <MarkdownDisplay 
              result={uploadState.result} 
              onNewUpload={handleNewUpload}
            />
          ) : (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
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
                <h3 className="text-md lg:text-lg font-medium text-gray-900 mb-1">
                  変換結果がここに表示されます
                </h3>
                <p className="text-xs lg:text-sm text-gray-500">
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
