'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RedactionSettings } from '../types/redaction';

export interface RedactionExportDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** ダイアログを閉じる関数 */
  onClose: () => void;
  /** エクスポート処理の関数 */
  onExport: (settings: RedactionSettings[], options: ExportOptions) => Promise<void>;
  /** インポート処理の関数 */
  onImport: (file: File) => Promise<RedactionSettings[]>;
  /** 現在の設定一覧 */
  settings: RedactionSettings[];
  /** カスタムCSSクラス */
  className?: string;
}

export interface ExportOptions {
  /** エクスポート形式 */
  format: 'json' | 'csv';
  /** ファイル名 */
  filename?: string;
  /** メタデータを含めるか */
  includeMetadata: boolean;
  /** 圧縮するか */
  compress: boolean;
}

interface ExportDialogState {
  /** アクティブなタブ */
  activeTab: 'export' | 'import';
  /** エクスポート設定 */
  exportOptions: ExportOptions;
  /** 選択された設定ID */
  selectedSettingsIds: string[];
  /** エクスポート中フラグ */
  isExporting: boolean;
  /** インポート中フラグ */
  isImporting: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 成功メッセージ */
  successMessage: string | null;
}

export default function RedactionExportDialog({
  isOpen,
  onClose,
  onExport,
  onImport,
  settings,
  className = ''
}: RedactionExportDialogProps) {
  // ファイル入力の参照
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ダイアログ状態
  const [state, setState] = useState<ExportDialogState>({
    activeTab: 'export',
    exportOptions: {
      format: 'json',
      filename: '',
      includeMetadata: true,
      compress: false
    },
    selectedSettingsIds: [],
    isExporting: false,
    isImporting: false,
    error: null,
    successMessage: null
  });

  // ダイアログが開かれたときの初期化
  useEffect(() => {
    if (isOpen) {
      setState({
        activeTab: 'export',
        exportOptions: {
          format: 'json',
          filename: `redaction-settings-${new Date().toISOString().split('T')[0]}`,
          includeMetadata: true,
          compress: false
        },
        selectedSettingsIds: [],
        isExporting: false,
        isImporting: false,
        error: null,
        successMessage: null
      });
    }
  }, [isOpen]);

  // タブ切り替え
  const handleTabChange = useCallback((tab: 'export' | 'import') => {
    setState(prev => ({
      ...prev,
      activeTab: tab,
      error: null,
      successMessage: null
    }));
  }, []);

  // エクスポート設定の更新
  const handleExportOptionChange = useCallback((option: keyof ExportOptions, value: any) => {
    setState(prev => ({
      ...prev,
      exportOptions: {
        ...prev.exportOptions,
        [option]: value
      },
      error: null
    }));
  }, []);

  // 設定選択の切り替え
  const handleSettingsToggle = useCallback((settingsId: string) => {
    setState(prev => ({
      ...prev,
      selectedSettingsIds: prev.selectedSettingsIds.includes(settingsId)
        ? prev.selectedSettingsIds.filter(id => id !== settingsId)
        : [...prev.selectedSettingsIds, settingsId],
      error: null
    }));
  }, []);

  // 全選択/全解除
  const handleSelectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedSettingsIds: prev.selectedSettingsIds.length === settings.length
        ? []
        : settings.map(s => s.id),
      error: null
    }));
  }, [settings]);

  // エクスポート処理
  const handleExport = useCallback(async () => {
    if (state.selectedSettingsIds.length === 0) {
      setState(prev => ({
        ...prev,
        error: 'エクスポートする設定を選択してください'
      }));
      return;
    }

    const selectedSettings = settings.filter(s => state.selectedSettingsIds.includes(s.id));

    setState(prev => ({
      ...prev,
      isExporting: true,
      error: null
    }));

    try {
      await onExport(selectedSettings, state.exportOptions);
      setState(prev => ({
        ...prev,
        successMessage: `${selectedSettings.length}件の設定をエクスポートしました`
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'エクスポートに失敗しました'
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isExporting: false
      }));
    }
  }, [state.selectedSettingsIds, state.exportOptions, settings, onExport]);

  // ファイル選択
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイル形式の検証
    const allowedTypes = ['application/json', 'text/json', 'text/csv'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      setState(prev => ({
        ...prev,
        error: 'JSONまたはCSVファイルを選択してください'
      }));
      return;
    }

    // ファイルサイズの検証（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      setState(prev => ({
        ...prev,
        error: 'ファイルサイズが大きすぎます（10MB以下）'
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // インポート処理
  const handleImport = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setState(prev => ({
        ...prev,
        error: 'ファイルを選択してください'
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isImporting: true,
      error: null
    }));

    try {
      const importedSettings = await onImport(file);
      setState(prev => ({
        ...prev,
        successMessage: `${importedSettings.length}件の設定をインポートしました`
      }));
      // ファイル入力をクリア
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'インポートに失敗しました'
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isImporting: false
      }));
    }
  }, [onImport]);

  // キャンセル処理
  const handleCancel = useCallback(() => {
    if (!state.isExporting && !state.isImporting) {
      onClose();
    }
  }, [state.isExporting, state.isImporting, onClose]);

  // キーボードイベント
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !state.isExporting && !state.isImporting) {
      handleCancel();
    }
  }, [state.isExporting, state.isImporting, handleCancel]);

  // ダイアログが閉じている場合は何も表示しない
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      onKeyDown={handleKeyDown}
      data-testid="redaction-export-dialog"
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
            赤セルシート設定のエクスポート・インポート
          </h2>
          <button
            onClick={handleCancel}
            disabled={state.isExporting || state.isImporting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="ダイアログを閉じる"
            data-testid="close-button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleTabChange('export')}
            disabled={state.isExporting || state.isImporting}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              state.activeTab === 'export'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="export-tab"
          >
            エクスポート
          </button>
          <button
            onClick={() => handleTabChange('import')}
            disabled={state.isExporting || state.isImporting}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              state.activeTab === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="import-tab"
          >
            インポート
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6">
            <p id="dialog-description" className="text-sm text-gray-600 mb-4">
              {state.activeTab === 'export'
                ? '赤セルシート設定をファイルにエクスポートします。'
                : 'ファイルから赤セルシート設定をインポートします。'
              }
            </p>

            {/* メッセージ表示 */}
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
            )}

            {state.successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{state.successMessage}</p>
              </div>
            )}

            {/* エクスポートタブ */}
            {state.activeTab === 'export' && (
              <div className="space-y-6">
                {/* 設定選択 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">
                      エクスポートする設定 ({state.selectedSettingsIds.length}/{settings.length})
                    </h3>
                    <button
                      onClick={handleSelectAll}
                      disabled={state.isExporting || settings.length === 0}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="select-all-button"
                    >
                      {state.selectedSettingsIds.length === settings.length ? '全解除' : '全選択'}
                    </button>
                  </div>

                  {settings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      エクスポート可能な設定がありません
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                      {settings.map((setting) => (
                        <label
                          key={setting.id}
                          className={`flex items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            state.isExporting ? 'pointer-events-none opacity-50' : ''
                          }`}
                          data-testid={`export-setting-${setting.id}`}
                        >
                          <input
                            type="checkbox"
                            checked={state.selectedSettingsIds.includes(setting.id)}
                            onChange={() => handleSettingsToggle(setting.id)}
                            disabled={state.isExporting}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            data-testid={`export-checkbox-${setting.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {setting.id}
                            </div>
                            <div className="text-xs text-gray-500">
                              ファイルID: {setting.file_id}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* エクスポート設定 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">エクスポート設定</h3>

                  {/* 形式選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      形式
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="json"
                          checked={state.exportOptions.format === 'json'}
                          onChange={(e) => handleExportOptionChange('format', e.target.value)}
                          disabled={state.isExporting}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          data-testid="format-json"
                        />
                        <span className="text-sm text-gray-700">JSON</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="csv"
                          checked={state.exportOptions.format === 'csv'}
                          onChange={(e) => handleExportOptionChange('format', e.target.value)}
                          disabled={state.isExporting}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          data-testid="format-csv"
                        />
                        <span className="text-sm text-gray-700">CSV</span>
                      </label>
                    </div>
                  </div>

                  {/* ファイル名 */}
                  <div>
                    <label htmlFor="export-filename" className="block text-sm font-medium text-gray-700 mb-1">
                      ファイル名
                    </label>
                    <input
                      id="export-filename"
                      type="text"
                      value={state.exportOptions.filename || ''}
                      onChange={(e) => handleExportOptionChange('filename', e.target.value)}
                      disabled={state.isExporting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="ファイル名を入力..."
                      data-testid="export-filename"
                    />
                  </div>

                  {/* オプション */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={state.exportOptions.includeMetadata}
                        onChange={(e) => handleExportOptionChange('includeMetadata', e.target.checked)}
                        disabled={state.isExporting}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        data-testid="include-metadata"
                      />
                      <span className="text-sm text-gray-700">メタデータを含める</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={state.exportOptions.compress}
                        onChange={(e) => handleExportOptionChange('compress', e.target.checked)}
                        disabled={state.isExporting}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        data-testid="compress-file"
                      />
                      <span className="text-sm text-gray-700">ファイルを圧縮する</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* インポートタブ */}
            {state.activeTab === 'import' && (
              <div className="space-y-6">
                {/* ファイル選択 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">インポートするファイル</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.csv"
                      onChange={handleFileSelect}
                      disabled={state.isImporting}
                      className="hidden"
                      data-testid="import-file-input"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={state.isImporting}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="import-file-button"
                    >
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        ファイルを選択するか、ここにドラッグ&ドロップ
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JSON、CSV形式（最大10MB）
                      </p>
                    </button>
                  </div>
                </div>

                {/* インポート情報 */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">インポートについて</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• 既存の設定と重複する場合は上書きされます</li>
                    <li>• ファイル形式は自動的に検出されます</li>
                    <li>• インポート前にデータの整合性をチェックします</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleCancel}
            disabled={state.isExporting || state.isImporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="cancel-button"
          >
            キャンセル
          </button>

          {state.activeTab === 'export' ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={state.isExporting || state.selectedSettingsIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              data-testid="export-button"
            >
              {state.isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  エクスポート中...
                </>
              ) : (
                'エクスポート'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              disabled={state.isImporting || !fileInputRef.current?.files?.[0]}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              data-testid="import-button"
            >
              {state.isImporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  インポート中...
                </>
              ) : (
                'インポート'
              )}
            </button>
          )}
        </div>

        {/* キーボードショートカットの説明 */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> でキャンセル
          </p>
        </div>
      </div>
    </div>
  );
}
