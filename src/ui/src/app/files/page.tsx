'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FileListResponse, FileListItem, FileInfo } from '@/types';
import { useFileListPagination } from '@/hooks/useFileListPagination';
import FileListTable from '@/components/FileListTable';
import FileDetailModal from '@/components/FileDetailModal';
import Pagination from '@/components/Pagination';

export default function FilesPage() {
  const [files, setFiles] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  // ファイル一覧専用のレスポンシブページネーション
  const { itemsPerPage } = useFileListPagination({
    minItemsPerPage: 5,
    maxItemsPerPage: 30,
    itemHeight: 72, // テーブル行の高さ（tr要素の実際の高さ）
  });

  const fetchFiles = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getFileList(page, itemsPerPage);
      
      // APIレスポンスのページ番号とローカル状態の整合性チェック
      if (response.page !== page) {
        console.warn(`Page mismatch: requested ${page}, got ${response.page}`);
        setCurrentPage(response.page);
      }
      
      setFiles(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'ファイル一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPage);
  }, [currentPage, itemsPerPage]);

  // itemsPerPageが変更された時に現在のページが有効範囲内かチェック
  useEffect(() => {
    if (files && files.total_count > 0) {
      const maxPage = Math.ceil(files.total_count / itemsPerPage);
      if (currentPage > maxPage) {
        setCurrentPage(Math.max(1, maxPage));
      }
    }
  }, [itemsPerPage, files?.total_count, currentPage]);

  const handlePageChange = (page: number) => {
    // ページ番号の有効性チェック
    if (page >= 1 && (!files || page <= Math.ceil(files.total_count / itemsPerPage))) {
      setCurrentPage(page);
    } else {
      console.warn(`Invalid page number: ${page}`);
    }
  };

  const handleViewFile = async (fileId: string) => {
    try {
      const fileDetail = await api.getFile(fileId);
      setSelectedFile(fileDetail);
      setIsModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'ファイル詳細の取得に失敗しました');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('このファイルを削除してもよろしいですか？')) {
      return;
    }

    try {
      setDeletingFileId(fileId);
      await api.deleteFile(fileId);
      
      // 削除後、現在のページが空になる可能性があるかチェック
      const isLastItemOnPage = files && files.files.length === 1;
      const shouldGoToPreviousPage = isLastItemOnPage && currentPage > 1;
      
      if (shouldGoToPreviousPage) {
        // 前のページに移動してからデータを取得
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        await fetchFiles(newPage);
      } else {
        // 現在のページでデータを再取得
        await fetchFiles(currentPage);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'ファイルの削除に失敗しました');
    } finally {
      setDeletingFileId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const refreshFiles = () => {
    fetchFiles(currentPage);
  };

  if (loading && !files) {
    return (
      <div className="space-y-8">
        <div className="text-left">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            ファイル一覧
          </h1>
          <p className="text-sm lg:text-lg text-gray-600">
            変換済みのPDFファイル一覧を表示します。
          </p>
        </div>
        
        <div className="card" data-testid="file-list-table" style={{ minHeight: '400px' }}>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">ファイル一覧を読み込んでいます...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-left">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            ファイル一覧
          </h1>
          <p className="text-sm lg:text-lg text-gray-600">
            変換済みのPDFファイル一覧を表示します。
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={refreshFiles}
            className="btn-secondary text-sm"
            disabled={loading}
          >
            {loading ? '更新中...' : '更新'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {files && (
        <>
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                ファイル一覧（{files.total_count}件）
              </h2>
              <div className="text-sm text-gray-500">
                {itemsPerPage}件/ページ表示
              </div>
            </div>

            {files.files.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ファイルがありません
                </h3>
                <p className="text-gray-500 mb-4">
                  まだファイルがアップロードされていません。
                </p>
                <a href="/" className="btn-primary">
                  ファイルをアップロード
                </a>
              </div>
            ) : (
              <FileListTable
                files={files.files}
                onViewFile={handleViewFile}
                onDeleteFile={handleDeleteFile}
                deletingFileId={deletingFileId}
              />
            )}
          </div>

          {files.total_count > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalItems={files.total_count}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {isModalOpen && selectedFile && (
        <FileDetailModal
          file={selectedFile}
          isOpen={isModalOpen}
          onClose={closeModal}
          onFileUpdated={(updatedFile) => {
            // ファイル一覧を再読み込み
            fetchFiles(currentPage);
            // モーダルの選択ファイルも更新
            setSelectedFile(updatedFile);
          }}
        />
      )}
    </div>
  );
}
