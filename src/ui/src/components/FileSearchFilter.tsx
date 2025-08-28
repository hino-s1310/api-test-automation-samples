'use client';

import { useState } from 'react';

interface FileSearchFilterProps {
  onSearch: (query: string, status: string, isEdited: boolean | null) => void;
  onReset: () => void;
  loading?: boolean;
}

export default function FileSearchFilter({ onSearch, onReset, loading = false }: FileSearchFilterProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [isEdited, setIsEdited] = useState<string>('all');

  const handleSearch = () => {
    const isEditedValue = isEdited === 'all' ? null : isEdited === 'true';
    onSearch(query, status, isEditedValue);
  };

  const handleReset = () => {
    setQuery('');
    setStatus('');
    setIsEdited('all');
    onReset();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6" data-testid="file-search-filter">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 検索クエリ */}
        <div>
          <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">
            検索
          </label>
          <input
            type="text"
            id="search-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="ファイル名で検索..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="search-query-input"
          />
        </div>

        {/* ステータスフィルター */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
            ステータス
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="status-filter-select"
          >
            <option value="">すべて</option>
            <option value="completed">完了</option>
            <option value="processing">処理中</option>
            <option value="failed">失敗</option>
          </select>
        </div>

        {/* 編集状態フィルター */}
        <div>
          <label htmlFor="edited-filter" className="block text-sm font-medium text-gray-700 mb-2">
            編集状態
          </label>
          <select
            id="edited-filter"
            value={isEdited}
            onChange={(e) => setIsEdited(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="edited-filter-select"
          >
            <option value="all">すべて</option>
            <option value="true">編集済み</option>
            <option value="false">未編集</option>
          </select>
        </div>

        {/* アクションボタン */}
        <div className="flex items-end space-x-2">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="search-button"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                検索中
              </div>
            ) : (
              '検索'
            )}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="reset-button"
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  );
}
