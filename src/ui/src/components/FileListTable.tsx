'use client';

import { useState, useMemo, useCallback } from 'react';
import { FileListItem } from '@/types';

interface FileListTableProps {
  files: FileListItem[];
  onViewFile: (fileId: string) => void;
  onEditFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onBatchOperation: (selectedFiles: string[]) => void;
  onShowHistory: (fileId: string) => void;
  deletingFileId: string | null;
}

export default function FileListTable({
  files,
  onViewFile,
  onEditFile,
  onDeleteFile,
  onBatchOperation,
  onShowHistory,
  deletingFileId
}: FileListTableProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'filename' | 'created_at' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // パフォーマンス最適化: ソートされたファイルリストをメモ化
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // 日付フィールドの場合はDateオブジェクトに変換
      if (sortField === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // 文字列フィールドの場合は小文字に変換して比較
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [files, sortField, sortDirection]);

  // パフォーマンス最適化: コールバック関数をメモ化
  const handleSort = useCallback((field: 'filename' | 'created_at' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleSelectAll = useCallback(() => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  }, [selectedFiles.size, files]);

  const handleSelectFile = useCallback((fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  }, [selectedFiles]);

  const handleBatchOperation = useCallback(() => {
    onBatchOperation(Array.from(selectedFiles));
  }, [selectedFiles, onBatchOperation]);

  const getStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      processing: { color: 'bg-yellow-100 text-yellow-800', text: '処理中' },
      completed: { color: 'bg-green-100 text-green-800', text: '完了' },
      failed: { color: 'bg-red-100 text-red-800', text: '失敗' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* 一括操作バー */}
      {selectedFiles.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedFiles.size}件のファイルが選択されています
            </span>
            <button
              onClick={handleBatchOperation}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label={`選択された${selectedFiles.size}件のファイルで一括操作を実行`}
            >
              一括操作
            </button>
          </div>
        </div>
      )}

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  aria-label="すべてのファイルを選択"
                />
              </th>
              <th className="px-3 sm:px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('filename')}
                  className="group inline-flex items-center text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label="ファイル名でソート"
                >
                  ファイル名
                  <span className="ml-2 flex-none rounded">
                    {sortField === 'filename' && (
                      <svg className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                </button>
              </th>
              <th className="px-3 sm:px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="group inline-flex items-center text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label="ステータスでソート"
                >
                  ステータス
                  <span className="ml-2 flex-none rounded">
                    {sortField === 'status' && (
                      <svg className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                </button>
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">
                ファイルサイズ
              </th>
              <th className="px-3 sm:px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('created_at')}
                  className="group inline-flex items-center text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label="作成日時でソート"
                >
                  作成日時
                  <span className="ml-2 flex-none rounded">
                    {sortField === 'created_at' && (
                      <svg className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                </button>
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedFiles.map((file) => (
              <tr
                key={file.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onViewFile(file.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewFile(file.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${file.filename}の詳細を表示`}
              >
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => handleSelectFile(file.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    aria-label={`${file.filename}を選択`}
                  />
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {file.filename}
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(file.status)}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                  {formatFileSize(file.file_size)}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                  {formatDate(file.created_at)}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <button
                      onClick={() => onEditFile(file.id)}
                      className="text-gray-700 hover:text-gray-900 p-2 rounded hover:bg-gray-100 transition-colors"
                      aria-label={`${file.filename}を編集`}
                      title="編集"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onShowHistory(file.id)}
                      className="text-gray-700 hover:text-gray-900 p-2 rounded hover:bg-gray-100 transition-colors"
                      aria-label={`${file.filename}の編集履歴を表示`}
                      title="編集履歴"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      disabled={deletingFileId === file.id}
                      className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`${file.filename}を削除`}
                      title="削除"
                    >
                      {deletingFileId === file.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 空の状態 */}
      {files.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">ファイルがありません</h3>
          <p className="mt-1 text-sm text-gray-500">ファイルをアップロードしてください。</p>
        </div>
      )}
    </div>
  );
}
