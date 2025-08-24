'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { UploadResponse } from '@/types';

interface MarkdownDisplayProps {
  result: UploadResponse;
  onNewUpload: () => void;
}

export default function MarkdownDisplay({ result, onNewUpload }: MarkdownDisplayProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  const downloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([result.markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `converted-${result.id}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full h-full flex flex-col" data-testid="markdown-display-container">
      <div className="card h-full flex flex-col">
        {/* ヘッダー部分 - 固定サイズ */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0" data-testid="result-header">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900" data-testid="result-title">変換結果</h2>
          <div className="flex space-x-2">
            <button
              onClick={copyToClipboard}
              className={`btn-secondary text-sm ${copied ? 'bg-green-500 hover:bg-green-600' : ''}`}
              data-testid="copy-button"
            >
              {copied ? 'コピー済み!' : 'コピー'}
            </button>
            <button
              onClick={downloadMarkdown}
              className="btn-secondary text-sm"
              data-testid="download-button"
            >
              ダウンロード
            </button>
            <button
              onClick={onNewUpload}
              className="btn-primary text-sm"
              data-testid="new-file-button"
            >
              新しいファイル
            </button>
          </div>
        </div>

        {/* 成功メッセージ - 固定サイズ */}
        {result.message && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md flex-shrink-0" data-testid="success-message">
            <p className="text-xs lg:text-sm text-green-800">{result.message}</p>
          </div>
        )}

        {/* タブ部分 - 固定サイズ */}
        <div className="mb-3 flex-shrink-0" data-testid="tabs-section">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid="preview-tab"
              >
                プレビュー
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'raw'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid="markdown-tab"
              >
                Markdown
              </button>
            </nav>
          </div>
        </div>

        {/* コンテンツ部分 - 残りの高さを使用、スクロールなし */}
        <div className="flex-1 min-h-0" data-testid="content-section">
          {activeTab === 'preview' ? (
            <div className="prose max-w-none prose-sm lg:prose-base h-full overflow-hidden" data-testid="preview-content">
              <div className="h-full overflow-y-auto">
                <ReactMarkdown>{result.markdown}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden" data-testid="raw-content-container">
              <pre className="bg-gray-50 p-3 rounded-md text-xs lg:text-sm overflow-auto whitespace-pre-wrap font-mono h-full">
                {result.markdown}
              </pre>
            </div>
          )}
        </div>

        {/* ファイル情報 - 固定サイズ */}
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md flex-shrink-0" data-testid="file-info">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-xs lg:text-sm text-blue-800">
                <strong>ファイルID:</strong> <span data-testid="file-id">{result.id}</span>
              </p>
              <p className="text-xs text-blue-600">
                文字数: {result.markdown.length.toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-blue-600">
              このIDで後からファイルの取得・更新・削除が可能
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
