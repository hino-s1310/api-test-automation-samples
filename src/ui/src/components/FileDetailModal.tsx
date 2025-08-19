'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileInfo } from '@/types';
import { api } from '@/lib/api';

interface FileDetailModalProps {
  file: FileInfo;
  isOpen: boolean;
  onClose: () => void;
  onFileUpdated?: (updatedFile: FileInfo) => void;
}

export default function FileDetailModal({ file, isOpen, onClose, onFileUpdated }: FileDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<FileInfo>(file);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentFile(file);
    setUpdateError(null);
  }, [file]);

  if (!isOpen) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentFile.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  const handleUpdateClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpdate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // PDFファイルのチェック
    if (selectedFile.type !== 'application/pdf') {
      setUpdateError('PDFファイルのみアップロード可能です。');
      return;
    }

    // ファイルサイズチェック（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setUpdateError('ファイルサイズは10MB以下である必要があります。');
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);
      
      const updatedFile = await api.updateFile(currentFile.id, selectedFile);
      setCurrentFile(updatedFile);
      
      // 親コンポーネントに更新を通知
      if (onFileUpdated) {
        onFileUpdated(updatedFile);
      }
      
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error: any) {
      let errorMessage = 'ファイルの更新に失敗しました。';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUpdateError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadMarkdown = () => {
    const element = document.createElement('a');
    const fileBlob = new Blob([currentFile.markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${currentFile.id}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* オーバーレイ */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* モーダルコンテンツ */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* ヘッダー */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    ファイル詳細
                  </h3>
                  <p className="text-sm text-gray-500">
                    {file.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleUpdateClick}
                  disabled={isUpdating}
                  className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isUpdating ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      更新中...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      ファイル更新
                    </span>
                  )}
                </button>
                <button
                  onClick={copyToClipboard}
                  className={`btn-secondary text-sm ${copied ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                >
                  {copied ? 'コピー済み!' : 'コピー'}
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="btn-secondary text-sm"
                >
                  ダウンロード
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 隠しファイル入力 */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpdate}
                className="hidden"
              />
            </div>
          </div>

          {/* エラー表示 */}
          {updateError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{updateError}</p>
                </div>
              </div>
            </div>
          )}

          {/* ファイル情報 */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">ファイル名:</span>
                <p className="text-gray-900 truncate">{currentFile.filename || currentFile.id}</p>
              </div>
              <div>
                <span className="font-medium text-gray-500">作成日時:</span>
                <p className="text-gray-900">{formatDateTime(currentFile.created_at)}</p>
              </div>
              {currentFile.updated_at && (
                <div>
                  <span className="font-medium text-gray-500">更新日時:</span>
                  <p className="text-gray-900">{formatDateTime(currentFile.updated_at)}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-500">文字数:</span>
                <p className="text-gray-900">{currentFile.markdown.length.toLocaleString()}文字</p>
              </div>
            </div>
          </div>

          {/* タブ */}
          <div className="border-b border-gray-200 px-4 sm:px-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                プレビュー
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'raw'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Markdown
              </button>
            </nav>
          </div>

          {/* コンテンツ */}
          <div className="px-4 py-5 sm:p-6">
            <div className="max-h-96 overflow-y-auto">
              {activeTab === 'preview' ? (
                <div className="prose max-w-none">
                  <ReactMarkdown>{currentFile.markdown}</ReactMarkdown>
                </div>
              ) : (
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap font-mono border">
                  {currentFile.markdown}
                </pre>
              )}
            </div>
          </div>

          {/* フッター */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="btn-primary text-sm sm:ml-3"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
