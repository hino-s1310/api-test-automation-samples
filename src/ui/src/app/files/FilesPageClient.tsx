'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileListItem, FileInfo, FileEditHistory } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useFileListPagination } from '@/hooks/useFileListPagination';
import FileListTable from '@/components/FileListTable';
import FileSearchFilter from '@/components/FileSearchFilter';
import Pagination from '@/components/Pagination';
import FileDetailModal from '@/components/FileDetailModal';
import FileEditModal from '@/components/FileEditModal';
import FileHistoryModal from '@/components/FileHistoryModal';
import BatchOperations from '@/components/BatchOperations';
import ToastContainer from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function FilesPageClient() {
  const router = useRouter();
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isEditedFilter, setIsEditedFilter] = useState<boolean | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedFilesForBatch, setSelectedFilesForBatch] = useState<string[]>([]);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileListItem | null>(null);
  const [selectedFileDetail, setSelectedFileDetail] = useState<FileInfo | null>(null);
  const [historyFile, setHistoryFile] = useState<FileListItem | null>(null);

  // トーストフックを使用
  const toastHook = useToast();
  const { toasts, removeToast, success, error: showError } = toastHook;

  // ページネーション設定
  const { itemsPerPage } = useFileListPagination({
    minItemsPerPage: 5,
    maxItemsPerPage: 20,
    itemHeight: 70,
  });

  // ファイル一覧を取得
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.getFileList(currentPage, itemsPerPage);
      setFiles(response.files);
      setTotalCount(response.total_count);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの取得に失敗しました';
      setError(errorMessage);
      showError('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 初期化
  useEffect(() => {
    fetchFiles();
  }, [currentPage, itemsPerPage]);

  // ファイル詳細を表示
  const handleViewFile = async (fileId: string) => {
    try {
      const file = await api.getFile(fileId);
      const fileListItem = files.find(f => f.id === fileId);
      if (!fileListItem) return;

      setSelectedFile(fileListItem);
      setSelectedFileDetail(file); // 詳細情報を別途保存
      setIsDetailModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの取得に失敗しました';
      showError('エラー', errorMessage);
    }
  };

  // ファイル編集を開始
  const handleEditFile = async (fileId: string) => {
    try {
      const file = await api.getFile(fileId);
      const fileListItem = files.find(f => f.id === fileId);
      if (!fileListItem) return;

      setSelectedFile(fileListItem);
      setSelectedFileDetail(file); // 詳細情報を別途保存
      setIsEditModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの取得に失敗しました';
      showError('エラー', errorMessage);
    }
  };

  // ファイル履歴を表示
  const handleShowHistory = async (fileId: string) => {
    try {
      const fileListItem = files.find(f => f.id === fileId);
      if (!fileListItem) return;

      setHistoryFile(fileListItem);
      setIsHistoryModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの取得に失敗しました';
      showError('エラー', errorMessage);
    }
  };

  // ファイルを削除
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('このファイルを削除しますか？')) return;

    try {
      setDeletingFileId(fileId);
      await api.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      success('ファイルを削除しました');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの削除に失敗しました';
      showError('エラー', errorMessage);
    } finally {
      setDeletingFileId(null);
    }
  };

  // バッチ操作を開始
  const handleBatchOperation = (selectedFiles: string[]) => {
    setSelectedFilesForBatch(selectedFiles);
    setIsBatchModalOpen(true);
  };

  // バッチ操作完了
  const handleBatchOperationComplete = () => {
    setIsBatchModalOpen(false);
    fetchFiles(); // ファイル一覧を再取得
  };

  // ファイル編集完了
  const handleEditComplete = async (fileId: string, filename: string, content: string, reason: string) => {
    try {
      await api.editFile(fileId, {
        filename,
        markdown_content: content,
        edit_reason: reason,
      });

      // ファイル一覧を更新
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, filename, updated_at: new Date().toISOString() }
          : f
      ));

      setIsEditModalOpen(false);
      fetchFiles(); // ファイル一覧を再取得
      success('ファイルを更新しました');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ファイルの更新に失敗しました';
      showError('エラー', errorMessage);
    }
  };

  // モーダルを閉じる
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedFile(null);
    setSelectedFileDetail(null);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedFile(null);
    setSelectedFileDetail(null);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setHistoryFile(null);
  };

  // ファイルアップロード完了
  const handleUploadComplete = () => {
    fetchFiles(); // ファイル一覧を再取得
    success('ファイルをアップロードしました');
  };

  // 検索・フィルター
  const handleSearch = async (query: string, status: string, isEdited: boolean | null) => {
    try {
      setLoading(true);
      setSearchQuery(query);
      setStatusFilter(status);
      setIsEditedFilter(isEdited);
      setCurrentPage(1); // 検索時は1ページ目に戻る

      // 検索APIを呼び出し
      const response = await api.searchFiles({
        query,
        status,
        is_edited: isEdited,
        page: 1,
        per_page: itemsPerPage,
      });

      setFiles(response.files);
      setTotalCount(response.total_count);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '検索に失敗しました';
      setError(errorMessage);
      showError('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ページ変更
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 選択されたファイルの管理
  const handleFileSelection = (fileId: string, isSelected: boolean) => {
    setSelectedFiles(prev =>
      isSelected
        ? [...prev, fileId]
        : prev.filter(id => id !== fileId)
    );
  };

  // 全選択・全解除
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedFiles(files.map(f => f.id));
    } else {
      setSelectedFiles([]);
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error && files.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ファイル一覧</h1>
          <p className="text-gray-600">アップロードされたPDFファイルの一覧です</p>
        </div>

        <FileSearchFilter
          onSearch={handleSearch}
          onReset={() => {
            setSearchQuery('');
            setStatusFilter('');
            setIsEditedFilter(null);
            setCurrentPage(1);
          }}
          loading={loading}
        />

        <FileListTable
          files={files}
          onViewFile={handleViewFile}
          onEditFile={handleEditFile}
          onDeleteFile={handleDeleteFile}
          onBatchOperation={handleBatchOperation}
          onShowHistory={handleShowHistory}
          deletingFileId={deletingFileId}
        />

        <Pagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />

        {/* モーダル類 */}
        {isDetailModalOpen && selectedFile && selectedFileDetail && (
          <FileDetailModal
            file={selectedFileDetail}
            isOpen={isDetailModalOpen}
            onClose={closeDetailModal}
            onFileUpdated={(updatedFile) => {
              setSelectedFileDetail(updatedFile);
              fetchFiles();
            }}
          />
        )}

        {isEditModalOpen && selectedFile && selectedFileDetail && (
          <FileEditModal
            isOpen={isEditModalOpen}
            onClose={closeEditModal}
            file={selectedFileDetail}
            onSave={handleEditComplete}
          />
        )}

        {isHistoryModalOpen && historyFile && (
          <FileHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={closeHistoryModal}
            fileId={historyFile.id}
            filename={historyFile.filename}
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
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </ErrorBoundary>
  );
}
