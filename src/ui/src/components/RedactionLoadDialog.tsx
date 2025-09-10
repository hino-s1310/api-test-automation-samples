'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RedactionSettings } from '../types/redaction';

export interface RedactionLoadDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** ダイアログを閉じる関数 */
  onClose: () => void;
  /** 設定読み込み処理の関数 */
  onLoad: (settings: RedactionSettings) => Promise<void>;
  /** 設定削除処理の関数 */
  onDelete?: (settingsId: string) => Promise<void>;
  /** 保存済み設定の一覧 */
  settings: RedactionSettings[];
  /** ファイルID */
  fileId?: string;
  /** カスタムCSSクラス */
  className?: string;
}

interface LoadDialogState {
  /** 検索クエリ */
  searchQuery: string;
  /** 選択中の設定ID */
  selectedSettingsId: string | null;
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** 削除中フラグ */
  isDeleting: boolean;
  /** エラーメッセージ */
  error: string | null;
}

export default function RedactionLoadDialog({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  settings,
  fileId = '',
  className = ''
}: RedactionLoadDialogProps) {
  // ダイアログ状態
  const [state, setState] = useState<LoadDialogState>({
    searchQuery: '',
    selectedSettingsId: null,
    isLoading: false,
    isDeleting: false,
    error: null
  });

  // ダイアログが開かれたときの初期化
  useEffect(() => {
    if (isOpen) {
      setState({
        searchQuery: '',
        selectedSettingsId: null,
        isLoading: false,
        isDeleting: false,
        error: null
      });
    }
  }, [isOpen]);

  // 検索クエリの更新
  const handleSearchChange = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      selectedSettingsId: null,
      error: null
    }));
  }, []);

  // 設定選択
  const handleSettingsSelect = useCallback((settingsId: string) => {
    setState(prev => ({
      ...prev,
      selectedSettingsId: settingsId,
      error: null
    }));
  }, []);

  // 設定読み込み
  const handleLoad = useCallback(async () => {
    if (!state.selectedSettingsId) {
      setState(prev => ({
        ...prev,
        error: '設定を選択してください'
      }));
      return;
    }

    const selectedSettings = settings.find(s => s.id === state.selectedSettingsId);
    if (!selectedSettings) {
      setState(prev => ({
        ...prev,
        error: '選択された設定が見つかりません'
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      await onLoad(selectedSettings);
      onClose();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '読み込みに失敗しました'
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, [state.selectedSettingsId, settings, onLoad, onClose]);

  // 設定削除
  const handleDelete = useCallback(async (settingsId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!onDelete) {
      return;
    }

    if (!confirm('この設定を削除しますか？この操作は元に戻せません。')) {
      return;
    }

    setState(prev => ({
      ...prev,
      isDeleting: true,
      error: null
    }));

    try {
      await onDelete(settingsId);
      // 削除後、選択をクリア
      setState(prev => ({
        ...prev,
        selectedSettingsId: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '削除に失敗しました'
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isDeleting: false
      }));
    }
  }, [onDelete]);

  // キャンセル処理
  const handleCancel = useCallback(() => {
    if (!state.isLoading && !state.isDeleting) {
      onClose();
    }
  }, [state.isLoading, state.isDeleting, onClose]);

  // キーボードイベント
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !state.isLoading && !state.isDeleting) {
      handleCancel();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && state.selectedSettingsId && !state.isLoading) {
      event.preventDefault();
      handleLoad();
    }
  }, [state.isLoading, state.isDeleting, state.selectedSettingsId, handleCancel, handleLoad]);

  // フィルタされた設定一覧
  const filteredSettings = settings.filter(setting => {
    if (!state.searchQuery.trim()) {
      return true;
    }

    const query = state.searchQuery.toLowerCase();
    return (
      setting.id.toLowerCase().includes(query) ||
      (setting.file_id && setting.file_id.toLowerCase().includes(query))
    );
  });

  // ダイアログが閉じている場合は何も表示しない
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      onKeyDown={handleKeyDown}
      data-testid="redaction-load-dialog"
    >
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* ダイアログ */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="dialog-title" className="text-lg font-semibold text-gray-900">
            赤セルシート設定の読み込み
          </h2>
          <button
            onClick={handleCancel}
            disabled={state.isLoading || state.isDeleting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="ダイアログを閉じる"
            data-testid="close-button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6">
            <p id="dialog-description" className="text-sm text-gray-600 mb-4">
              保存済みの赤セルシート設定から選択して読み込みます。
            </p>

            {/* エラーメッセージ */}
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
            )}

            {/* 検索バー */}
            <div className="mb-4">
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                検索
              </label>
              <input
                id="search-input"
                type="text"
                value={state.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={state.isLoading || state.isDeleting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="設定IDまたはファイルIDで検索..."
                data-testid="search-input"
              />
            </div>

            {/* 設定一覧 */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                保存済み設定 ({filteredSettings.length}件)
              </h3>

              {filteredSettings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {state.searchQuery ? '検索条件に一致する設定が見つかりません' : '保存済みの設定がありません'}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredSettings.map((setting) => (
                    <div
                      key={setting.id}
                      onClick={() => handleSettingsSelect(setting.id)}
                      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        state.selectedSettingsId === setting.id ? 'bg-blue-50 border-blue-200' : ''
                      } ${state.isLoading || state.isDeleting ? 'pointer-events-none opacity-50' : ''}`}
                      data-testid={`setting-item-${setting.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {setting.id}
                            </span>
                            {state.selectedSettingsId === setting.id && (
                              <span className="text-xs text-blue-600 font-medium">選択中</span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            <div>ファイルID: {setting.file_id}</div>
                            <div>作成日: {new Date(setting.created_at).toLocaleString('ja-JP')}</div>
                            <div>更新日: {new Date(setting.updated_at).toLocaleString('ja-JP')}</div>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            <span className="inline-block mr-2">
                              全表示: {setting.show_all ? 'ON' : 'OFF'}
                            </span>
                            <span className="inline-block mr-2">
                              表示項目: {setting.revealed_items.length}件
                            </span>
                            <span className="inline-block">
                              レベル設定: {Object.values(setting.level_settings).filter(Boolean).length}/3
                            </span>
                          </div>
                        </div>

                        {/* 削除ボタン */}
                        {onDelete && (
                          <button
                            onClick={(e) => handleDelete(setting.id, e)}
                            disabled={state.isDeleting}
                            className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                            aria-label={`設定 ${setting.id} を削除`}
                            data-testid={`delete-button-${setting.id}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleCancel}
            disabled={state.isLoading || state.isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="cancel-button"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleLoad}
            disabled={state.isLoading || state.isDeleting || !state.selectedSettingsId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            data-testid="load-button"
          >
            {state.isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                読み込み中...
              </>
            ) : (
              '読み込み'
            )}
          </button>
        </div>

        {/* キーボードショートカットの説明 */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd> で読み込み、
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-1">Esc</kbd> でキャンセル
          </p>
        </div>
      </div>
    </div>
  );
}
