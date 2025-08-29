'use client';

import { useState } from 'react';

interface FileSearchFilterProps {
  onSearch: (query: string, status: string, isEdited: boolean | null) => void;
  onReset: () => void;
  loading?: boolean;
}

export default function FileSearchFilter({ onSearch, onReset, loading = false }: FileSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editStateFilter, setEditStateFilter] = useState<string>('all');

  const handleSearch = () => {
    const isEditedValue = editStateFilter === 'all' ? null : editStateFilter === 'true';
    onSearch(searchQuery, statusFilter, isEditedValue);
  };

  const handleReset = () => {
    setSearchQuery('');
    setStatusFilter('');
    setEditStateFilter('all');
    onReset();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4" data-testid="file-search-filter">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 検索クエリ */}
        <div>
          <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">
            検索
          </label>
          <input
            type="text"
            id="search-query"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="ファイル名で検索..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        {/* ステータスフィルター */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
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
          <label htmlFor="edited-filter" className="block text-sm font-medium text-gray-700 mb-1">
            編集状態
          </label>
          <select
            id="edited-filter"
            value={editStateFilter}
            onChange={(e) => setEditStateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            data-testid="edited-filter-select"
          >
            <option value="all">すべて</option>
            <option value="true">編集済み</option>
            <option value="false">未編集</option>
          </select>
        </div>

        {/* ボタン */}
        <div className="flex items-end space-x-2">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '検索中...' : '検索'}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  );
}
