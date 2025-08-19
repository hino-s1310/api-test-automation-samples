'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import MarkdownDisplay from '@/components/MarkdownDisplay';
import { api } from '@/lib/api';
import { UploadState, UploadResponse } from '@/types';

export default function Home() {
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
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          PDF to Markdown Converter
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          PDFファイルをアップロードして、AIを使用してMarkdown形式に変換します。
          変換されたMarkdownは即座にプレビューできます。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ファイルアップロード
            </h2>
            <FileUpload onUpload={handleUpload} uploadState={uploadState} />
          </div>

          {/* 使用方法の説明 */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">使用方法</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>PDFファイルをドラッグ&ドロップまたはクリックして選択</li>
              <li>ファイルが自動的にアップロードされ、変換が開始されます</li>
              <li>変換完了後、右側にプレビューが表示されます</li>
              <li>Markdownをコピーまたはダウンロードできます</li>
            </ol>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>注意:</strong> ファイルサイズは10MB以下、PDFファイルのみ対応しています。
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {uploadState.result ? (
            <MarkdownDisplay 
              result={uploadState.result} 
              onNewUpload={handleNewUpload}
            />
          ) : (
            <div className="card">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg 
                    className="w-8 h-8 text-gray-400" 
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  変換結果がここに表示されます
                </h3>
                <p className="text-gray-500">
                  PDFファイルをアップロードすると、変換されたMarkdownがここに表示されます。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 機能説明 */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">主な機能</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">簡単アップロード</h4>
            <p className="text-sm text-gray-600">ドラッグ&ドロップで簡単にファイルをアップロード</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">高速変換</h4>
            <p className="text-sm text-gray-600">AIを使用した高精度で高速な変換</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">リアルタイムプレビュー</h4>
            <p className="text-sm text-gray-600">変換結果を即座にプレビュー</p>
          </div>
        </div>
      </div>
    </div>
  );
}
