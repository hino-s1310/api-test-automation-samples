'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { TestGenerationOptions, GeneratedTestResponse, GeneratedTestSummary } from '@/types';

interface TestGenerationPanelProps {
  fileId: string;
  markdownContent: string;
}

const DEFAULT_OPTIONS: TestGenerationOptions = {
  test_framework: 'pytest',
  language: 'python',
  test_type: 'unit',
  max_tests: 10,
  include_edge_cases: true,
};

export default function TestGenerationPanel({ fileId, markdownContent }: TestGenerationPanelProps) {
  const [options, setOptions] = useState<TestGenerationOptions>(DEFAULT_OPTIONS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GeneratedTestSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedResult(null);

    try {
      const result = await api.generateTests(fileId, options);
      setGeneratedResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'テスト生成に失敗しました';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedResult) return;
    try {
      await navigator.clipboard.writeText(generatedResult.generated_tests);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  const handleDownload = () => {
    if (!generatedResult) return;

    const extension = options.language === 'python' ? 'py' : 'ts';
    const filename = `generated_test_${fileId.slice(0, 8)}.${extension}`;

    const element = document.createElement('a');
    const file = new Blob([generatedResult.generated_tests], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleLoadHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }

    setHistoryLoading(true);
    try {
      const result = await api.getGeneratedTests(fileId);
      setHistory(result.tests);
      setShowHistory(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '履歴の取得に失敗しました';
      setError(errorMessage);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadHistoryItem = async (testId: number) => {
    try {
      const result = await api.getGeneratedTest(fileId, testId);
      setGeneratedResult(result);
      setShowHistory(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '履歴の読み込みに失敗しました';
      setError(errorMessage);
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="test-generation-panel">
      {/* 設定パネル */}
      <div className="flex-shrink-0 bg-gray-50 p-4 border-b border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">AIテスト生成設定</h4>
          <div className="flex space-x-2">
            <button
              onClick={handleLoadHistory}
              disabled={historyLoading}
              className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              data-testid="history-button"
            >
              {historyLoading ? '読込中...' : showHistory ? '履歴を閉じる' : '生成履歴'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* フレームワーク選択 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">フレームワーク</label>
            <select
              value={options.test_framework}
              onChange={(e) => setOptions({ ...options, test_framework: e.target.value as TestGenerationOptions['test_framework'] })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              data-testid="framework-select"
            >
              <option value="pytest">pytest</option>
              <option value="jest">Jest</option>
              <option value="playwright">Playwright</option>
            </select>
          </div>

          {/* 言語選択 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">言語</label>
            <select
              value={options.language}
              onChange={(e) => setOptions({ ...options, language: e.target.value as TestGenerationOptions['language'] })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              data-testid="language-select"
            >
              <option value="python">Python</option>
              <option value="typescript">TypeScript</option>
            </select>
          </div>

          {/* テスト種類 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">テスト種類</label>
            <select
              value={options.test_type}
              onChange={(e) => setOptions({ ...options, test_type: e.target.value as TestGenerationOptions['test_type'] })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              data-testid="test-type-select"
            >
              <option value="unit">Unit</option>
              <option value="integration">Integration</option>
              <option value="e2e">E2E</option>
            </select>
          </div>

          {/* 最大テスト数 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">最大テスト数</label>
            <input
              type="number"
              min={1}
              max={50}
              value={options.max_tests}
              onChange={(e) => setOptions({ ...options, max_tests: parseInt(e.target.value) || 10 })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              data-testid="max-tests-input"
            />
          </div>

          {/* エッジケース */}
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.include_edge_cases}
                onChange={(e) => setOptions({ ...options, include_edge_cases: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                data-testid="edge-cases-checkbox"
              />
              <span className="text-xs text-gray-600">エッジケース</span>
            </label>
          </div>
        </div>

        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !markdownContent}
          className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          data-testid="generate-button"
        >
          {isGenerating ? 'テスト生成中...' : 'テストを生成'}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="flex-shrink-0 p-3 bg-red-50 border-b border-red-200" data-testid="error-message">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 履歴表示 */}
      {showHistory && (
        <div className="flex-shrink-0 max-h-48 overflow-y-auto border-b border-gray-200" data-testid="history-list">
          {history.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">生成履歴がありません</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleLoadHistoryItem(item.id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                  data-testid={`history-item-${item.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{item.test_framework}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span className="text-gray-600">{item.language}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span className="text-gray-600">{item.test_type}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.test_count}件 | {new Date(item.created_at).toLocaleString('ja-JP')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 結果表示エリア */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isGenerating ? (
          <div className="flex items-center justify-center h-full" data-testid="loading-indicator">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">AIがテストを生成中...</p>
            </div>
          </div>
        ) : generatedResult ? (
          <div className="h-full flex flex-col">
            {/* 結果ヘッダー */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-green-50 border-b border-green-200">
              <div className="text-sm text-green-800">
                <span className="font-medium">{generatedResult.test_count}件</span>のテストが生成されました
                <span className="text-xs text-green-600 ml-2">
                  (モデル: {generatedResult.metadata.model} | 生成時間: {generatedResult.metadata.generation_time.toFixed(1)}秒)
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopy}
                  className={`text-xs px-3 py-1 rounded ${copied ? 'bg-green-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                  data-testid="copy-code-button"
                >
                  {copied ? 'コピー済み!' : 'コピー'}
                </button>
                <button
                  onClick={handleDownload}
                  className="text-xs px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                  data-testid="download-code-button"
                >
                  ダウンロード
                </button>
              </div>
            </div>

            {/* コード表示 */}
            <div className="flex-1 overflow-auto" data-testid="generated-code">
              <pre className="p-4 text-sm font-mono bg-gray-900 text-green-400 h-full overflow-auto whitespace-pre-wrap">
                {generatedResult.generated_tests}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400" data-testid="empty-state">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm">上の設定を選択して「テストを生成」をクリックしてください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
