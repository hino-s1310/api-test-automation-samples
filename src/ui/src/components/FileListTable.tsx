'use client';

import { FileListItem } from '@/types';

interface FileListTableProps {
  files: FileListItem[];
  onViewFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  deletingFileId: string | null;
}

export default function FileListTable({ files, onViewFile, onDeleteFile, deletingFileId }: FileListTableProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    
    switch (status) {
      case 'completed':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`} data-testid={`status-${status}`}>
            完了
          </span>
        );
      case 'processing':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`} data-testid={`status-${status}`}>
            処理中
          </span>
        );
      case 'failed':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`} data-testid={`status-${status}`}>
            失敗
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`} data-testid={`status-${status}`}>
            不明
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto" data-testid="file-list-table">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-filename">
              ファイル名
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-status">
              ステータス
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-filesize">
              ファイルサイズ
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-processing-time">
              処理時間
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-created-at">
              作成日時
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-actions">
              削除
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {files.map((file) => (
            <tr 
              key={file.id} 
              onClick={() => file.status === 'completed' && onViewFile(file.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && file.status === 'completed') {
                  onViewFile(file.id);
                }
              }}
              tabIndex={file.status === 'completed' ? 0 : -1}
              role={file.status === 'completed' ? 'button' : undefined}
              aria-label={file.status === 'completed' ? `${file.filename}の詳細を表示` : undefined}
              data-testid={`file-row-${file.id}`}
              className={`
                transition-colors duration-150
                ${file.status === 'completed' 
                  ? 'hover:bg-blue-50 cursor-pointer focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset' 
                  : 'hover:bg-gray-50'
                }
              `}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8">
                    <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs" data-testid={`filename-${file.id}`}>
                      {file.filename}
                    </div>
                    <div className="text-sm text-gray-500" data-testid={`file-id-${file.id}`}>
                      ID: {file.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap" data-testid={`status-cell-${file.id}`}>
                {getStatusBadge(file.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`filesize-${file.id}`}>
                {formatFileSize(file.file_size)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`processing-time-${file.id}`}>
                {file.processing_time ? `${file.processing_time.toFixed(2)}秒` : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`created-at-${file.id}`}>
                {formatDateTime(file.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 行クリックイベントの伝播を防ぐ
                    onDeleteFile(file.id);
                  }}
                  disabled={deletingFileId === file.id}
                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  title="ファイルを削除"
                  aria-label={`${file.filename}を削除`}
                  data-testid={`delete-button-${file.id}`}
                >
                  {deletingFileId === file.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" data-testid={`delete-spinner-${file.id}`}></div>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
