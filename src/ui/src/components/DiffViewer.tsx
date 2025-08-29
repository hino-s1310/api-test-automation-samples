'use client';

import { useState, useEffect } from 'react';
import { DiffResult } from '@/types';

interface DiffViewerProps {
  original: string;
  modified: string;
  onClose?: () => void;
  showHeader?: boolean;
}

export default function DiffViewer({
  original,
  modified,
  onClose,
  showHeader = true
}: DiffViewerProps) {
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (original && modified) {
      generateDiff();
    }
  }, [original, modified]);

  const generateDiff = async () => {
    setIsLoading(true);
    try {
      // テスト用に少し遅延を追加（実際のプロジェクトでは削除可能）
      await new Promise(resolve => setTimeout(resolve, 10));

      // シンプルな差分計算（実際のプロジェクトではより高度な差分アルゴリズムを使用）
      const diff = calculateSimpleDiff(original, modified);
      setDiffResult({
        original,
        modified,
        diff,
        hasChanges: original !== modified
      });
    } catch (error) {
      console.error('差分の生成に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSimpleDiff = (original: string, modified: string): string => {
    if (original === modified) {
      return '変更なし';
    }

    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    let diff = '';

    // 行単位での差分を計算
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const modifiedLine = modifiedLines[i] || '';

      if (originalLine === modifiedLine) {
        diff += `  ${originalLine}\n`;
      } else {
        if (originalLine) {
          diff += `- ${originalLine}\n`;
        }
        if (modifiedLine) {
          diff += `+ ${modifiedLine}\n`;
        }
      }
    }

    return diff;
  };

  const getLineClass = (line: string): string => {
    if (line.startsWith('+ ')) return 'bg-green-50 text-green-800 border-l-4 border-green-400';
    if (line.startsWith('- ')) return 'bg-red-50 text-red-800 border-l-4 border-red-400';
    return 'bg-gray-50 text-gray-800';
  };

  const getLineNumber = (index: number): number => index + 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">差分を生成中...</span>
      </div>
    );
  }

  if (!diffResult) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="diff-viewer" role="region" aria-label="差分表示">
      {showHeader && (
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">差分表示</h3>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2" role="tablist" aria-label="表示モード選択">
                <button
                  onClick={() => setViewMode('unified')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'unified'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  data-testid="unified-view-button"
                  role="tab"
                  aria-selected={viewMode === 'unified'}
                  aria-label="統合表示モード"
                >
                  統合表示
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'split'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  data-testid="split-view-button"
                  role="tab"
                  aria-selected={viewMode === 'split'}
                  aria-label="分割表示モード"
                >
                  分割表示
                </button>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                  data-testid="diff-viewer-close-button"
                  aria-label="差分表示を閉じる"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {diffResult.hasChanges && (
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600" role="status" aria-label="差分の説明">
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-red-400 rounded-full mr-2" aria-hidden="true"></div>
                  削除された行
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2" aria-hidden="true"></div>
                  追加された行
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" aria-hidden="true"></div>
                  変更なし
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        {!diffResult.hasChanges ? (
          <div className="text-center py-8 text-gray-500" role="status" aria-live="polite">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-lg font-medium">変更はありません</p>
            <p className="text-sm">元のファイルと編集後のファイルは同一です</p>
          </div>
        ) : viewMode === 'unified' ? (
          <div className="space-y-1" data-testid="unified-diff-view" role="log" aria-label="統合差分表示">
            {diffResult.diff.split('\n').map((line, index) => (
              <div
                key={index}
                className={`px-3 py-1 font-mono text-sm ${getLineClass(line)}`}
                data-testid={`diff-line-${index}`}
                role="listitem"
                aria-label={`行${getLineNumber(index)}: ${line}`}
              >
                <span className="inline-block w-12 text-right text-gray-500 mr-3" aria-hidden="true">
                  {getLineNumber(index)}
                </span>
                {line}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="split-diff-view" role="log" aria-label="分割差分表示">
            {/* 元のファイル */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 px-3 py-1 bg-gray-100 rounded">
                元のファイル
              </h4>
              <div className="border border-gray-200 rounded-md overflow-hidden" role="log" aria-label="元のファイルの内容">
                {original.split('\n').map((line, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 font-mono text-sm bg-gray-50 text-gray-800 border-b border-gray-100 last:border-b-0"
                    role="listitem"
                    aria-label={`行${index + 1}: ${line}`}
                  >
                    <span className="inline-block w-12 text-right text-gray-500 mr-3" aria-hidden="true">
                      {index + 1}
                    </span>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* 編集後のファイル */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 px-3 py-1 bg-blue-100 rounded">
                編集後のファイル
              </h4>
              <div className="border border-gray-200 rounded-md overflow-hidden" role="log" aria-label="編集後のファイルの内容">
                {modified.split('\n').map((line, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 font-mono text-sm bg-blue-50 text-blue-800 border-b border-gray-100 last:border-b-0"
                    role="listitem"
                    aria-label={`行${index + 1}: ${line}`}
                  >
                    <span className="inline-block w-12 text-right text-gray-500 mr-3" aria-hidden="true">
                      {index + 1}
                    </span>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
