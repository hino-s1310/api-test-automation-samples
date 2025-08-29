'use client';

import { useState, useEffect } from 'react';
import { FileInfo } from '@/types';
import DiffViewer from './DiffViewer';

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
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'diff'>('edit');
  const [originalData, setOriginalData] = useState<{ filename: string; content: string }>({ filename: '', content: '' });

  useEffect(() => {
    if (file) {
      const newFilename = file.filename || '';
      const newContent = file.markdown || '';
      setFilename(newFilename);
      setContent(newContent);
      setOriginalData({ filename: newFilename, content: newContent });
      setReason('');
      setErrors({});
      setActiveTab('edit');
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

  const hasChanges = () => {
    return filename !== originalData.filename || content !== originalData.content;
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" data-testid="file-edit-modal">
      <div className="relative top-2 sm:top-4 mx-auto p-3 sm:p-4 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 max-w-6xl shadow-lg rounded-md bg-white h-[90vh] sm:h-[85vh] overflow-hidden">
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate pr-2" data-testid="edit-modal-title">
              ファイル編集: {file.filename}
            </h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-1"
              data-testid="edit-modal-close-button"
              aria-label="編集モーダルを閉じる"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ファイル情報 */}
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-md flex-shrink-0">
            <div className="text-xs sm:text-sm text-gray-600 space-y-1">
              <p className="truncate"><strong>ファイルID:</strong> {file.id}</p>
              <p className="truncate"><strong>作成日時:</strong> {new Date(file.created_at).toLocaleString('ja-JP')}</p>
            </div>
          </div>

          {/* 基本編集フォーム - タブの上に配置 */}
          <div className="mb-3 sm:mb-4 space-y-3 sm:space-y-4 flex-shrink-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* ファイル名 */}
              <div>
                <label htmlFor="edit-filename" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  ファイル名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit-filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className={`w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.filename ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="新しいファイル名を入力"
                  data-testid="edit-filename-input"
                  aria-describedby={errors.filename ? "edit-filename-error" : undefined}
                />
                {errors.filename && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600" data-testid="edit-filename-error" id="edit-filename-error">
                    {errors.filename}
                  </p>
                )}
              </div>

              {/* 編集理由 */}
              <div>
                <label htmlFor="edit-reason" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  編集理由 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.reason ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="編集理由を入力（例：インデント修正、改行調整）"
                  data-testid="edit-reason-input"
                  aria-describedby={errors.reason ? "edit-reason-error" : undefined}
                />
                {errors.reason && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600" data-testid="edit-reason-error" id="edit-reason-error">
                    {errors.reason}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* タブ */}
          <div className="border-b border-gray-200 mb-3 sm:mb-4 flex-shrink-0" data-testid="edit-modal-tabs">
            <nav className="-mb-px flex space-x-6 sm:space-x-8">
              <button
                onClick={() => setActiveTab('edit')}
                className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'edit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid="edit-tab"
              >
                編集
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid="preview-tab"
              >
                プレビュー
              </button>
              {hasChanges() && (
                <button
                  onClick={() => setActiveTab('diff')}
                  className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === 'diff'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid="diff-tab"
                >
                  差分表示
                </button>
              )}
            </nav>
          </div>

          {/* スクロール可能なコンテンツエリア */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* 編集タブ */}
            {activeTab === 'edit' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Markdownエディター */}
                <div>
                  <label htmlFor="edit-content" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Markdown内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="edit-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className={`w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${
                      errors.content ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Markdown内容を入力"
                    data-testid="edit-content-input"
                    aria-describedby={errors.content ? "edit-content-error" : undefined}
                  />
                  {errors.content && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600" data-testid="edit-content-error" id="edit-content-error">
                      {errors.content}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* プレビュータブ */}
            {activeTab === 'preview' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-2 sm:px-3 py-2 border-b border-gray-200">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-700">Markdownプレビュー</h4>
                  </div>
                  <div className="p-2 sm:p-4 prose max-w-none prose-sm">
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  </div>
                </div>
              </div>
            )}

            {/* 差分表示タブ */}
            {activeTab === 'diff' && hasChanges() && (
              <div className="space-y-3 sm:space-y-4" data-testid="diff-section">
                <DiffViewer
                  original={originalData.content}
                  modified={content}
                  showHeader={false}
                />
              </div>
            )}
          </div>

          {/* アクションボタン - 固定位置 */}
          <div className="flex justify-end space-x-2 sm:space-x-3 pt-3 sm:pt-4 border-t border-gray-200 flex-shrink-0 mt-3 sm:mt-4">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="edit-modal-cancel-button"
              aria-label="編集をキャンセル"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges()}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="edit-modal-save-button"
              aria-label="編集内容を保存"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                  <span className="text-xs sm:text-sm">保存中</span>
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
