'use client';

import { useState, useEffect } from 'react';
import { FileInfo } from '@/types';

interface FileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileInfo | null;
  onSave: (fileId: string, filename: string, content: string, reason: string) => Promise<void>;
  loading?: boolean;
}

export default function FileEditModal({ isOpen, onClose, file, onSave, loading = false }: FileEditModalProps) {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ filename?: string; content?: string; reason?: string }>({});

  useEffect(() => {
    if (file) {
      setFilename(file.filename);
      setContent(file.markdown || '');
      setReason('');
      setErrors({});
    }
  }, [file]);

  const handleSave = async () => {
    if (!file) return;

    // バリデーション
    const newErrors: { filename?: string; content?: string; reason?: string } = {};

    if (!filename.trim()) {
      newErrors.filename = 'ファイル名は必須です';
    }

    if (!content.trim()) {
      newErrors.content = '内容は必須です';
    }

    if (!reason.trim()) {
      newErrors.reason = '編集理由は必須です';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSave(file.id, filename.trim(), content.trim(), reason.trim());
      onClose();
    } catch (error) {
      // エラーハンドリングは親コンポーネントで行う
      console.error('File edit failed:', error);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" data-testid="file-edit-modal">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900" data-testid="edit-modal-title">
              ファイル編集: {file.filename}
            </h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              data-testid="edit-modal-close-button"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ファイル情報 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-600">
              <p><strong>ファイルID:</strong> {file.id}</p>
              <p><strong>現在のステータス:</strong> {file.status}</p>
              <p><strong>作成日時:</strong> {new Date(file.created_at).toLocaleString('ja-JP')}</p>
            </div>
          </div>

          {/* 編集フォーム */}
          <div className="space-y-4">
            {/* ファイル名 */}
            <div>
              <label htmlFor="edit-filename" className="block text-sm font-medium text-gray-700 mb-2">
                ファイル名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="edit-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.filename ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="新しいファイル名を入力"
                data-testid="edit-filename-input"
              />
              {errors.filename && (
                <p className="mt-1 text-sm text-red-600" data-testid="edit-filename-error">
                  {errors.filename}
                </p>
              )}
            </div>

            {/* Markdown内容 */}
            <div>
              <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700 mb-2">
                Markdown内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                  errors.content ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Markdown内容を入力"
                data-testid="edit-content-input"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600" data-testid="edit-content-error">
                  {errors.content}
                </p>
              )}
            </div>

            {/* 編集理由 */}
            <div>
              <label htmlFor="edit-reason" className="block text-sm font-medium text-gray-700 mb-2">
                編集理由 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="edit-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.reason ? 'border-red-300' : 'border-red-300'
                }`}
                placeholder="編集理由を入力（例：インデント修正、改行調整）"
                data-testid="edit-reason-input"
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600" data-testid="edit-reason-error">
                  {errors.reason}
                </p>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="edit-modal-cancel-button"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="edit-modal-save-button"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中
                </div>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
