'use client';

import React, { useState, useCallback } from 'react';
import { RedactionSettings } from '../types/redaction';

export interface RedactionControlsProps {
  /** 現在のファイルID */
  fileId: string;
  /** 現在の設定 */
  settings: RedactionSettings | null;
  /** 保存時のコールバック */
  onSave?: (settings: Partial<RedactionSettings>) => Promise<void>;
  /** 読み込み時のコールバック */
  onLoad?: (fileId: string) => Promise<void>;
  /** エクスポート時のコールバック */
  onExport?: (fileId: string, settingsId: string) => Promise<void>;
  /** インポート時のコールバック */
  onImport?: (fileId: string, settingsData: string) => Promise<void>;
  /** 設定変更時のコールバック */
  onSettingsChange?: (settings: Partial<RedactionSettings>) => void;
  /** カスタムCSSクラス */
  className?: string;
  /** 読み込み状態 */
  isLoading?: boolean;
  /** 保存状態 */
  isSaving?: boolean;
  /** エクスポート状態 */
  isExporting?: boolean;
  /** インポート状態 */
  isImporting?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** 成功メッセージ */
  successMessage?: string | null;
  /** ボタンの無効化状態 */
  disabled?: boolean;
}

interface ControlButtonProps {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  loadingText: string;
  normalText: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  testId: string;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  disabled,
  loading,
  loadingText,
  normalText,
  icon,
  variant,
  testId
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white border-transparent';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white border-transparent';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-transparent';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white border-transparent';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`redaction-btn inline-flex items-center px-4 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${getVariantClasses()}`}
      data-testid={testId}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText}
        </>
      ) : (
        <>
          <span className="mr-2" aria-hidden="true">
            {icon}
          </span>
          {normalText}
        </>
      )}
    </button>
  );
};

export default function RedactionControls({
  fileId,
  settings,
  onSave,
  onLoad,
  onExport,
  onImport,
  onSettingsChange,
  className = '',
  isLoading = false,
  isSaving = false,
  isExporting = false,
  isImporting = false,
  error = null,
  successMessage = null,
  disabled = false
}: RedactionControlsProps) {
  // ローカル状態
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // エラーメッセージの表示
  const displayError = localError || error;
  const displaySuccess = localSuccess || successMessage;

  // エラーメッセージのクリア
  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  // 成功メッセージのクリア
  const clearSuccess = useCallback(() => {
    setLocalSuccess(null);
  }, []);

  // 保存処理
  const handleSave = useCallback(async () => {
    if (!onSave || !settings) return;

    try {
      setLocalError(null);
      await onSave(settings);
      setLocalSuccess('設定を保存しました');
      setTimeout(clearSuccess, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存に失敗しました';
      setLocalError(errorMessage);
      setTimeout(clearError, 5000);
    }
  }, [onSave, settings, clearSuccess, clearError]);

  // 読み込み処理
  const handleLoad = useCallback(async () => {
    if (!onLoad) return;

    try {
      setLocalError(null);
      await onLoad(fileId);
      setLocalSuccess('設定を読み込みました');
      setTimeout(clearSuccess, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '読み込みに失敗しました';
      setLocalError(errorMessage);
      setTimeout(clearError, 5000);
    }
  }, [onLoad, fileId, clearSuccess, clearError]);

  // エクスポート処理
  const handleExport = useCallback(async () => {
    if (!onExport || !settings?.id) return;

    try {
      setLocalError(null);
      await onExport(fileId, settings.id);
      setLocalSuccess('設定をエクスポートしました');
      setTimeout(clearSuccess, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エクスポートに失敗しました';
      setLocalError(errorMessage);
      setTimeout(clearError, 5000);
    }
  }, [onExport, fileId, settings?.id, clearSuccess, clearError]);

  // インポート処理
  const handleImport = useCallback(async () => {
    if (!onImport) return;

    // ファイル選択ダイアログを開く
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        setLocalError(null);
        await onImport(fileId, text);
        setLocalSuccess('設定をインポートしました');
        setTimeout(clearSuccess, 3000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'インポートに失敗しました';
        setLocalError(errorMessage);
        setTimeout(clearError, 5000);
      }
    };
    input.click();
  }, [onImport, fileId, clearSuccess, clearError]);

  // ボタンの無効化状態
  const isAnyLoading = isLoading || isSaving || isExporting || isImporting;
  const isDisabled = disabled || isAnyLoading;

  return (
    <div className={`redaction-controls ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h5>赤セルシートコントロール</h5>
        <div className="text-sm text-gray-500">
          {settings ? `設定: ${settings.name}` : '設定なし'}
        </div>
      </div>

      {/* コントロールボタン */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ControlButton
          onClick={handleSave}
          disabled={isDisabled || !settings}
          loading={isSaving}
          loadingText="保存中..."
          normalText="保存"
          icon="💾"
          variant="primary"
          testId="save-button"
        />
        <ControlButton
          onClick={handleLoad}
          disabled={isDisabled}
          loading={isLoading}
          loadingText="読み込み中..."
          normalText="読み込み"
          icon="📁"
          variant="secondary"
          testId="load-button"
        />
        <ControlButton
          onClick={handleExport}
          disabled={isDisabled || !settings?.id}
          loading={isExporting}
          loadingText="エクスポート中..."
          normalText="エクスポート"
          icon="📤"
          variant="success"
          testId="export-button"
        />
        <ControlButton
          onClick={handleImport}
          disabled={isDisabled}
          loading={isImporting}
          loadingText="インポート中..."
          normalText="インポート"
          icon="📥"
          variant="warning"
          testId="import-button"
        />
      </div>

      {/* 状態表示 */}
      <div className="space-y-3">
        {/* エラー状態 */}
        {displayError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4" data-testid="error-message">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  エラーが発生しました
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {displayError}
                </div>
                <div className="mt-3">
                  <button
                    onClick={clearError}
                    className="text-sm font-medium text-red-800 hover:text-red-600 focus:outline-none focus:underline"
                    data-testid="clear-error-button"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 成功状態 */}
        {displaySuccess && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4" data-testid="success-message">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  操作が完了しました
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  {displaySuccess}
                </div>
                <div className="mt-3">
                  <button
                    onClick={clearSuccess}
                    className="text-sm font-medium text-green-800 hover:text-green-600 focus:outline-none focus:underline"
                    data-testid="clear-success-button"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ローディング状態 */}
        {isAnyLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4" data-testid="loading-message">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  処理中...
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  {isSaving && '設定を保存しています...'}
                  {isLoading && '設定を読み込んでいます...'}
                  {isExporting && '設定をエクスポートしています...'}
                  {isImporting && '設定をインポートしています...'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 設定情報 */}
      {settings && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">設定情報</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">名前:</span>
              <span className="ml-2 text-gray-900">{settings.name}</span>
            </div>
            <div>
              <span className="text-gray-500">共有:</span>
              <span className="ml-2 text-gray-900">
                {settings.is_shared ? 'はい' : 'いいえ'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">作成日:</span>
              <span className="ml-2 text-gray-900">
                {new Date(settings.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <div>
              <span className="text-gray-500">更新日:</span>
              <span className="ml-2 text-gray-900">
                {new Date(settings.updated_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
