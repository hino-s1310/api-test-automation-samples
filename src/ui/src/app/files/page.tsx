'use client';

import { useState, useEffect } from 'react';
import { FileListItem, FileListResponse, FileInfo } from '@/types';
import { api } from '@/lib/api';
import FileListTable from '@/components/FileListTable';
import FileEditModal from '@/components/FileEditModal';
import FileDetailModal from '@/components/FileDetailModal';
import FileHistoryModal from '@/components/FileHistoryModal';
import BatchOperations from '@/components/BatchOperations';
import FileSearchFilter from '@/components/FileSearchFilter';
import Pagination from '@/components/Pagination';
import ErrorBoundary from '@/components/ErrorBoundary';
import ToastContainer from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

export default function FilesPage() {
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileListItem | null>(null);
  const [selectedFileDetail, setSelectedFileDetail] = useState<FileInfo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyFile, setHistoryFile] = useState<FileListItem | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedFilesForBatch, setSelectedFilesForBatch] = useState<string[]>([]);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isEditedFilter, setIsEditedFilter] = useState<boolean | null>(null);
  const [itemsPerPage] = useState(10);
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみトーストフックを使用
  const toastHook = useToast();
  const { toasts, removeToast, success, error: showError } = toastHook;

  // クライアントサイドの判定
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ファイル一覧を取得
  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.searchFiles({
        query: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        is_edited: isEditedFilter,
        page: currentPage,
        per_page: itemsPerPage,
      });
      setFiles(response.files);
      setTotalPages(Math.ceil(response.total_count / itemsPerPage));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの取得に失敗しました';
      setError(errorMessage);
      if (isClient) {
        showError('エラー', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [currentPage, searchTerm, statusFilter, isEditedFilter]);

  // ファイル表示
  const handleViewFile = async (fileId: string) => {
    try {
      const file = await api.getFile(fileId);
      // FileInfoをFileListItemに変換
      const fileListItem: FileListItem = {
        id: file.id,
        filename: file.filename || '無名ファイル',
        status: 'completed', // 編集可能なファイルは完了済みと仮定
        created_at: file.created_at,
        updated_at: file.updated_at,
        file_size: 0, // サイズ情報がない場合は0
        processing_time: null
      };
      setSelectedFile(fileListItem);
      setSelectedFileDetail(file); // 詳細情報を別途保存
      setIsDetailModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの取得に失敗しました';
      if (isClient) {
        showError('エラー', errorMessage);
      }
    }
  };

  // ファイル編集
  const handleEditFile = async (fileId: string) => {
    try {
      const file = await api.getFile(fileId);
      // FileInfoをFileListItemに変換
      const fileListItem: FileListItem = {
        id: file.id,
        filename: file.filename || '無名ファイル',
        status: 'completed',
        created_at: file.created_at,
        updated_at: file.updated_at,
        file_size: 0,
        processing_time: null
      };
      setSelectedFile(fileListItem);
      setSelectedFileDetail(file); // 詳細情報を別途保存
      setIsEditModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの取得に失敗しました';
      if (isClient) {
        showError('エラー', errorMessage);
      }
    }
  };

  // 編集履歴表示
  const handleShowHistory = async (fileId: string) => {
    try {
      const file = await api.getFile(fileId);
      // FileInfoをFileListItemに変換
      const fileListItem: FileListItem = {
        id: file.id,
        filename: file.filename || '無名ファイル',
        status: 'completed',
        created_at: file.created_at,
        updated_at: file.updated_at,
        file_size: 0,
        processing_time: null
      };
      setHistoryFile(fileListItem);
      setIsHistoryModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの取得に失敗しました';
      if (isClient) {
        showError('エラー', errorMessage);
      }
    }
  };

  // ファイル削除
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('このファイルを削除しますか？')) return;

    try {
      setDeletingFileId(fileId);
      await api.deleteFile(fileId);

      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (isClient) {
        success('ファイルを削除しました');
      }

      // 現在のページのファイルが0件になった場合、前のページに移動
      if (files.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの削除に失敗しました';
      if (isClient) {
        showError('エラー', errorMessage);
      }
    } finally {
      setDeletingFileId(null);
    }
  };

  // 一括操作
  const handleBatchOperation = (selectedFiles: string[]) => {
    setSelectedFilesForBatch(selectedFiles);
    setIsBatchModalOpen(true);
  };

  // 一括操作完了
  const handleBatchOperationComplete = () => {
    setIsBatchModalOpen(false);
    setSelectedFilesForBatch([]);
    fetchFiles(); // ファイル一覧を再取得
  };

  // ファイル編集完了
  const handleEditComplete = async (fileId: string, filename: string, content: string, reason: string) => {
    try {
      await api.editFile(fileId, {
        filename,
        markdown_content: content,
        edit_reason: reason,
        edited_by: 'user',
      });

      setIsEditModalOpen(false);
      setSelectedFile(null);
      setSelectedFileDetail(null);
      fetchFiles(); // ファイル一覧を再取得
      if (isClient) {
        success('ファイルを更新しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの更新に失敗しました';
      if (isClient) {
        showError('エラー', errorMessage);
      }
      throw err; // エラーを再スローしてモーダルを閉じないようにする
    }
  };

  // ファイル詳細モーダルを閉じる
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedFile(null);
    setSelectedFileDetail(null);
  };

  // 編集履歴モーダルを閉じる
  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setHistoryFile(null);
  };

  // ファイルアップロード完了
  const handleUploadComplete = () => {
    fetchFiles(); // ファイル一覧を再取得
    if (isClient) {
      success('ファイルをアップロードしました');
    }
  };

  // 検索・フィルター適用
  const handleSearch = (query: string, status: string, isEdited: boolean | null) => {
    setSearchTerm(query);
    setStatusFilter(status);
    setIsEditedFilter(isEdited); // 編集状態フィルターを更新
    setCurrentPage(1); // 検索時は最初のページに戻る
  };

  // ページ変更
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h1 className="mt-4 text-lg font-medium text-gray-900">エラーが発生しました</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button
            onClick={fetchFiles}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ファイル一覧</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              アップロードされたファイルの管理、編集、履歴確認ができます。
            </p>
          </div>

          {/* 検索・フィルター */}
          <div className="mb-6">
            <FileSearchFilter
              onSearch={handleSearch}
              onReset={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setIsEditedFilter(null);
                setCurrentPage(1);
              }}
              loading={loading}
            />
          </div>

          {/* ファイル一覧 */}
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">ファイルを読み込み中...</p>
              </div>
            ) : (
              <>
                <FileListTable
                  files={files}
                  onViewFile={handleViewFile}
                  onEditFile={handleEditFile}
                  onDeleteFile={handleDeleteFile}
                  onBatchOperation={handleBatchOperation}
                  onShowHistory={handleShowHistory}
                  deletingFileId={deletingFileId}
                />

                {/* ページネーション */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <Pagination
                      currentPage={currentPage}
                      totalItems={files.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* モーダル */}
        {isEditModalOpen && selectedFileDetail && (
          <FileEditModal
            file={selectedFileDetail}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleEditComplete}
          />
        )}

        {isDetailModalOpen && selectedFileDetail && (
          <FileDetailModal
            file={selectedFileDetail}
            isOpen={isDetailModalOpen}
            onClose={closeDetailModal}
          />
        )}

        {isHistoryModalOpen && historyFile && (
          <FileHistoryModal
            fileId={historyFile.id}
            filename={historyFile.filename}
            isOpen={isHistoryModalOpen}
            onClose={closeHistoryModal}
          />
        )}

        {isBatchModalOpen && (
          <BatchOperations
            selectedFiles={selectedFilesForBatch}
            onClose={() => setIsBatchModalOpen(false)}
            onOperationComplete={handleBatchOperationComplete}
          />
        )}

        {/* Toast通知 */}
        {isClient && <ToastContainer toasts={toasts} onClose={removeToast} />}
      </div>
    </ErrorBoundary>
  );
}
