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
    <div className="w-full">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">変換結果</h2>
          <div className="flex space-x-2">
            <button
              onClick={copyToClipboard}
              className={`btn-secondary text-sm ${copied ? 'bg-green-500 hover:bg-green-600' : ''}`}
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
              onClick={onNewUpload}
              className="btn-primary text-sm"
            >
              新しいファイル
            </button>
          </div>
        </div>

        {result.message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{result.message}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
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
              >
                Markdown
              </button>
            </nav>
          </div>
        </div>

        <div className="min-h-96 max-h-96 overflow-y-auto">
          {activeTab === 'preview' ? (
            <div className="prose max-w-none">
              <ReactMarkdown>{result.markdown}</ReactMarkdown>
            </div>
          ) : (
            <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap font-mono">
              {result.markdown}
            </pre>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>ファイルID:</strong> {result.id}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            このIDを使用して、後でファイルを取得、更新、削除することができます。
          </p>
        </div>
      </div>
    </div>
  );
}
