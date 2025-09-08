'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RedactionSettings } from '../types/redaction';

export interface RedactionSaveDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** ダイアログを閉じる関数 */
  onClose: () => void;
  /** 保存処理の関数 */
  onSave: (data: SaveDialogData) => Promise<void>;
  /** 現在の赤セルシート設定 */
  currentSettings?: RedactionSettings;
  /** ファイルID */
  fileId?: string;
  /** カスタムCSSクラス */
  className?: string;
}

export interface SaveDialogData {
  /** 設定名 */
  name: string;
  /** 説明 */
  description: string;
  /** ファイルID */
  fileId: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  general?: string;
}

export default function RedactionSaveDialog({
  isOpen,
  onClose,
  onSave,
  currentSettings,
  fileId = '',
  className = ''
}: RedactionSaveDialogProps) {
  // フォーム状態
  const [formData, setFormData] = useState<SaveDialogData>({
    name: '',
    description: '',
    fileId: fileId
  });

  // フォームエラー
  const [errors, setErrors] = useState<FormErrors>({});

  // 保存状態
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  // ダイアログが開かれたときの初期化
  useEffect(() => {
    if (isOpen) {
      // 現在の設定から初期値を設定
      const initialName = currentSettings?.id ? `設定_${new Date().toLocaleString('ja-JP')}` : '';
      const initialDescription = currentSettings?.id ? '既存設定の更新' : '新しい赤セルシート設定';

      setFormData({
        name: initialName,
        description: initialDescription,
        fileId: fileId
      });
      setErrors({});
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [isOpen, currentSettings, fileId]);

  // フォーム入力のハンドラー
  const handleInputChange = useCallback((field: keyof SaveDialogData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // エラーをクリア
    if (field in errors) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  }, [errors]);

  // バリデーション
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // 設定名のバリデーション
    if (!formData.name.trim()) {
      newErrors.name = '設定名を入力してください';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '設定名は2文字以上で入力してください';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = '設定名は50文字以内で入力してください';
    }

    // 説明のバリデーション
    if (formData.description.trim().length > 200) {
      newErrors.description = '説明は200文字以内で入力してください';
    }

    // ファイルIDのバリデーション
    if (!formData.fileId.trim()) {
      newErrors.general = 'ファイルIDが指定されていません';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 保存処理
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    // 保存状態を設定
    setIsSaving(true);
    isSavingRef.current = true;
    setErrors({});

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : '保存に失敗しました'
      });
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [formData, validateForm, onSave, onClose]);

  // キャンセル処理
  const handleCancel = useCallback(() => {
    if (!isSavingRef.current) {
      onClose();
    }
  }, [onClose]);

  // キーボードイベント
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      // isSaving状態をチェックしてからキャンセル処理を実行
      if (!isSavingRef.current) {
        handleCancel();
      }
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      // isSaving状態をチェックしてから保存処理を実行
      if (!isSavingRef.current) {
        event.preventDefault();
        handleSave();
      }
    }
  }, [handleCancel, handleSave]);

  // ダイアログが閉じている場合は何も表示しない
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      onKeyDown={handleKeyDown}
      data-testid="redaction-save-dialog"
    >
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* ダイアログ */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="dialog-title" className="text-lg font-semibold text-gray-900">
            赤セルシート設定の保存
          </h2>
          <button
            onClick={handleCancel}
            disabled={isSaving}
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
        <div className="p-6">
          <p id="dialog-description" className="text-sm text-gray-600 mb-4">
            現在の赤セルシート設定を保存します。設定名と説明を入力してください。
          </p>

          {/* エラーメッセージ */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-4">
              {/* 設定名 */}
              <div>
                <label htmlFor="setting-name" className="block text-sm font-medium text-gray-700 mb-1">
                  設定名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="setting-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isSaving}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="例: 機密文書用設定"
                  maxLength={50}
                  data-testid="name-input"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {formData.name.length}/50文字
                </p>
              </div>

              {/* 説明 */}
              <div>
                <label htmlFor="setting-description" className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  id="setting-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={isSaving}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="この設定の用途や特徴を説明してください"
                  maxLength={200}
                  data-testid="description-input"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {formData.description.length}/200文字
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="cancel-button"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            data-testid="save-button"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>

        {/* キーボードショートカットの説明 */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd> で保存、
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-1">Esc</kbd> でキャンセル
          </p>
        </div>
      </div>
    </div>
  );
}
