'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RedactionSettings as RedactionSettingsType, RedactionLevel } from '../types/redaction';

export interface RedactionSettingsProps {
  /** 現在の赤セルシート設定 */
  settings: RedactionSettingsType | null;
  /** 設定変更時のコールバック */
  onSettingsChange: (settings: Partial<RedactionSettingsType>) => void;
  /** 設定保存時のコールバック */
  onSave?: () => void;
  /** 設定読み込み時のコールバック */
  onLoad?: () => void;
  /** 設定リセット時のコールバック */
  onReset?: () => void;
  /** プレビューテキスト */
  previewText?: string;
  /** カスタムCSSクラス */
  className?: string;
  /** 読み込み状態 */
  isLoading?: boolean;
  /** 保存状態 */
  isSaving?: boolean;
}

interface LevelSetting {
  level: RedactionLevel;
  label: string;
  description: string;
  enabled: boolean;
}

export default function RedactionSettings({
  settings,
  onSettingsChange,
  onSave,
  onLoad,
  onReset,
  previewText = 'これは機密情報です。',
  className = '',
  isLoading = false,
  isSaving = false
}: RedactionSettingsProps) {
  // ローカル状態
  const [localSettings, setLocalSettings] = useState<Partial<RedactionSettingsType>>({
    show_all: false,
    level_settings: {
      level1: true,
      level2: false,
      level3: true
    },
    revealed_items: []
  });

  // レベル設定の定義
  const levelSettings: LevelSetting[] = [
    {
      level: 'level1',
      label: 'レベル1（最高機密）',
      description: '最重要な機密情報を隠します',
      enabled: localSettings.level_settings?.level1 || false
    },
    {
      level: 'level2',
      label: 'レベル2（機密）',
      description: '一般的な機密情報を隠します',
      enabled: localSettings.level_settings?.level2 || false
    },
    {
      level: 'level3',
      label: 'レベル3（内部）',
      description: '内部情報を隠します',
      enabled: localSettings.level_settings?.level3 || false
    }
  ];

  // 設定の初期化
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        show_all: settings.show_all,
        level_settings: settings.level_settings,
        revealed_items: settings.revealed_items
      });
    }
  }, [settings]);

  // 設定変更のハンドラー
  const handleSettingChange = useCallback((key: keyof RedactionSettingsType, value: any) => {
    const newSettings = {
      ...localSettings,
      [key]: value
    };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  }, [localSettings, onSettingsChange]);

  // レベル設定の変更
  const handleLevelSettingChange = useCallback((level: RedactionLevel, enabled: boolean) => {
    const newLevelSettings = {
      ...localSettings.level_settings,
      [level]: enabled
    };
    handleSettingChange('level_settings', newLevelSettings);
  }, [localSettings.level_settings, handleSettingChange]);

  // 全表示の切り替え
  const handleShowAllToggle = useCallback(() => {
    handleSettingChange('show_all', !localSettings.show_all);
  }, [localSettings.show_all, handleSettingChange]);

  // 設定のリセット
  const handleReset = useCallback(() => {
    const defaultSettings = {
      show_all: false,
      level_settings: {
        level1: true,
        level2: false,
        level3: true
      },
      revealed_items: []
    };
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
    onReset?.();
  }, [onSettingsChange, onReset]);

  // 設定の保存
  const handleSave = useCallback(() => {
    onSave?.();
  }, [onSave]);

  // 設定の読み込み
  const handleLoad = useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  // プレビューテキストの生成
  const generatePreviewText = useCallback(() => {
    if (!previewText) return '';

    let text = previewText;
    if (!localSettings.show_all) {
      // レベル設定に基づいてテキストを隠す
      if (localSettings.level_settings?.level1) {
        text = text.replace(/機密情報/g, '[REDACTED:LEVEL1:機密情報]');
      }
      if (localSettings.level_settings?.level2) {
        text = text.replace(/内部情報/g, '[REDACTED:LEVEL2:内部情報]');
      }
      if (localSettings.level_settings?.level3) {
        text = text.replace(/一般情報/g, '[REDACTED:LEVEL3:一般情報]');
      }
    }
    return text;
  }, [previewText, localSettings]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          赤セルシート設定
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="load-button"
          >
            {isLoading ? '読み込み中...' : '読み込み'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="save-button"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            data-testid="reset-button"
          >
            リセット
          </button>
        </div>
      </div>

      {/* 設定パネル */}
      <div className="space-y-6">
        {/* 全表示設定 */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">全表示設定</h3>
              <p className="text-sm text-gray-500">
                すべての赤セルシートを表示/非表示にします
              </p>
            </div>
            <button
              onClick={handleShowAllToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                localSettings.show_all ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              data-testid="show-all-toggle"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.show_all ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* レベル設定 */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">レベル設定</h3>
          <p className="text-sm text-gray-500">
            各レベルの機密情報の表示/非表示を設定します
          </p>

          <div className="space-y-3">
            {levelSettings.map((levelSetting) => (
              <div
                key={levelSetting.level}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-sm font-medium text-gray-900">
                      {levelSetting.label}
                    </h4>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      levelSetting.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {levelSetting.enabled ? '有効' : '無効'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {levelSetting.description}
                  </p>
                </div>
                <button
                  onClick={() => handleLevelSettingChange(levelSetting.level, !levelSetting.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    levelSetting.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  data-testid={`level-${levelSetting.level}-toggle`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      levelSetting.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* プレビュー */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">プレビュー</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {generatePreviewText()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
