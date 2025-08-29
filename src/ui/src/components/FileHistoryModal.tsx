'use client';

import { useState, useEffect } from 'react';
import { FileEditHistory, FileEditHistoryResponse } from '@/types';
import { api } from '@/lib/api';
import DiffViewer from './DiffViewer';

interface FileHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  filename: string;
  onRevert?: (historyId: number) => Promise<void>;
}

export default function FileHistoryModal({
  isOpen,
  onClose,
  fileId,
  filename,
  onRevert
}: FileHistoryModalProps) {
  const [history, setHistory] = useState<FileEditHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<FileEditHistory | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [reverting, setReverting] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && fileId) {
      fetchHistory();
    }
  }, [isOpen, fileId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getFileEditHistory(fileId);
      setHistory(data.history);
    } catch (error) {
      console.error('履歴の取得中にエラーが発生しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (historyId: number) => {
    if (!onRevert) return;

    setReverting(historyId);
    try {
      await onRevert(historyId);
      // 復元後に履歴を再取得
      await fetchHistory();
    } catch (error) {
      console.error('復元に失敗しました:', error);
    } finally {
      setReverting(null);
    }
  };

  const handleShowDiff = (historyItem: FileEditHistory) => {
    setSelectedHistory(historyItem);
    setShowDiff(true);
  };

  const handleCloseDiff = () => {
    setShowDiff(false);
    setSelectedHistory(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeType = (historyItem: FileEditHistory) => {
    const filenameChanged = historyItem.original_filename !== historyItem.edited_filename;
    const contentChanged = historyItem.original_content !== historyItem.edited_content;

    if (filenameChanged && contentChanged) return 'ファイル名・内容変更';
    if (filenameChanged) return 'ファイル名変更';
    if (contentChanged) return '内容変更';
    return 'その他の変更';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" data-testid="file-history-modal">
        <div className="relative top-2 sm:top-4 mx-auto p-3 sm:p-4 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 max-w-6xl shadow-lg rounded-md bg-white h-[90vh] sm:h-[85vh] flex flex-col">
          {/* ヘッダー - 固定 */}
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate pr-2" data-testid="history-modal-title">
              編集履歴: {filename}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
              data-testid="history-modal-close-button"
              aria-label="モーダルを閉じる"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ファイル情報 - 固定 */}
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-md flex-shrink-0">
            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
              <p className="truncate"><strong>ファイルID:</strong> {fileId}</p>
              <p className="truncate"><strong>現在のファイル名:</strong> {filename}</p>
              <p><strong>履歴件数:</strong> {history.length}件</p>
            </div>
          </div>

          {/* スクロール可能な履歴一覧エリア - 可変サイズ */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm sm:text-base text-gray-600">履歴を読み込み中...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 px-4">
                  <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-base sm:text-lg font-medium">編集履歴がありません</p>
                  <p className="text-xs sm:text-sm">このファイルはまだ編集されていません</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 pr-2">
                {history.map((historyItem, index) => (
                  <div
                    key={historyItem.id}
                    className="border border-gray-200 rounded-md p-3 sm:p-4 hover:bg-gray-50"
                    data-testid={`history-item-${index}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getChangeType(historyItem)}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {formatDate(historyItem.created_at)}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            編集者: {historyItem.edited_by}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs sm:text-sm">
                          {historyItem.original_filename !== historyItem.edited_filename && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-gray-600">ファイル名:</span>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="text-red-600 line-through truncate">{historyItem.original_filename}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600 truncate">{historyItem.edited_filename}</span>
                              </div>
                            </div>
                          )}

                          <div className="text-gray-600">
                            <span>編集理由: </span>
                            <span className="text-gray-800 break-words">{historyItem.edit_reason}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:gap-2 sm:ml-4 sm:flex-shrink-0">
                        <button
                          onClick={() => handleShowDiff(historyItem)}
                          className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                          data-testid={`show-diff-button-${index}`}
                          aria-label={`${historyItem.edited_filename}の差分を表示`}
                        >
                          差分表示
                        </button>
                        {onRevert && (
                          <button
                            onClick={() => handleRevert(historyItem.id)}
                            disabled={reverting === historyItem.id}
                            className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            data-testid={`revert-button-${index}`}
                            aria-label={`${historyItem.edited_filename}をこの版に復元`}
                          >
                            {reverting === historyItem.id ? '復元中...' : 'この版に復元'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* アクションボタン - 完全固定位置 */}
          <div className="flex justify-end pt-3 sm:pt-4 border-t border-gray-200 flex-shrink-0 mt-3 sm:mt-4">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              data-testid="history-modal-close-button-bottom"
              aria-label="モーダルを閉じる"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>

      {/* 差分表示モーダル */}
      {showDiff && selectedHistory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[70]">
          <div className="relative top-2 sm:top-4 mx-auto p-3 sm:p-4 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 max-w-6xl shadow-lg rounded-md bg-white h-[90vh] sm:h-[85vh] overflow-hidden">
            <div className="h-full flex flex-col">
              {/* ヘッダー */}
              <div className="mb-3 sm:mb-4 flex items-center justify-between flex-shrink-0">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 truncate pr-2">
                  差分表示: {selectedHistory.edited_filename}
                </h4>
                <button
                  onClick={handleCloseDiff}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  data-testid="diff-modal-close-button"
                  aria-label="差分表示モーダルを閉じる"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* スクロール可能な差分表示エリア */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="h-full">
                  <DiffViewer
                    original={selectedHistory.original_content}
                    modified={selectedHistory.edited_content}
                    onClose={handleCloseDiff}
                    showHeader={false}
                  />
                </div>
              </div>

              {/* アクションボタン - 固定位置 */}
              <div className="flex justify-end pt-3 sm:pt-4 border-t border-gray-200 flex-shrink-0 mt-3 sm:mt-4">
                <button
                  onClick={handleCloseDiff}
                  className="px-3 sm:px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  aria-label="差分表示モーダルを閉じる"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
