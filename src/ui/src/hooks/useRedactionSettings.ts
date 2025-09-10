/**
 * 赤セルシート設定管理フック
 * 設定の永続化、API連携、バリデーションを担当
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RedactionSettings,
  RedactionSettingsCreateRequest,
  RedactionSettingsUpdateRequest,
  RedactionSettingsListResponse,
  RedactionSettingsImportRequest,
  RedactionSettingsExportResponse
} from '../types/redaction';
import {
  saveRedactionSettings,
  loadRedactionSettings,
  removeRedactionSettings,
  exportSettings,
  importSettings,
  getStorageUsage
} from '../utils/redactionStorage';

/**
 * useRedactionSettingsフックのオプション
 */
export interface UseRedactionSettingsOptions {
  /** ファイルID */
  fileId: string;
  /** ユーザーID */
  userId: string;
  /** 自動保存の有効/無効 */
  autoSave?: boolean;
  /** 自動保存の間隔（ミリ秒） */
  autoSaveInterval?: number;
  /** デバッグモード */
  debug?: boolean;
  /** APIベースURL */
  apiBaseUrl?: string;
}

/**
 * 設定管理の状態
 */
export interface RedactionSettingsState {
  /** 現在の設定 */
  currentSettings: RedactionSettings | null;
  /** 設定リスト */
  settingsList: RedactionSettings[];
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** 保存中フラグ */
  isSaving: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 最後に更新された時刻 */
  lastUpdated: number | null;
  /** 設定が変更されているか */
  isDirty: boolean;
  /** 設定の検証エラー */
  validationErrors: string[];
}

/**
 * 設定管理のアクション
 */
export interface RedactionSettingsActions {
  // 設定の読み込み
  loadSettings: (settingsId?: string) => Promise<void>;
  loadSettingsList: () => Promise<void>;

  // 設定の保存・更新
  saveSettings: (settings: RedactionSettingsCreateRequest) => Promise<RedactionSettings | null>;
  updateSettings: (settingsId: string, settings: RedactionSettingsUpdateRequest) => Promise<RedactionSettings | null>;

  // 設定の削除
  deleteSettings: (settingsId: string) => Promise<boolean>;

  // 設定のインポート・エクスポート
  exportSettings: (settingsId: string, format?: 'json' | 'csv') => Promise<string | null>;
  importSettings: (data: string, format?: 'json' | 'csv') => Promise<RedactionSettings | null>;

  // 設定の共有（将来実装予定）
  // shareSettings: (settingsId: string, shareRequest: any) => Promise<any>;

  // ローカルストレージ操作
  saveToLocalStorage: (settings: RedactionSettings) => Promise<boolean>;
  loadFromLocalStorage: () => Promise<RedactionSettings | null>;
  clearLocalStorage: () => Promise<boolean>;

  // 状態管理
  setCurrentSettings: (settings: RedactionSettings | null) => void;
  setDirty: (dirty: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // バリデーション
  validateSettings: (settings: RedactionSettingsCreateRequest | RedactionSettingsUpdateRequest) => string[];
}

/**
 * useRedactionSettingsフックの戻り値
 */
export interface UseRedactionSettingsReturn {
  state: RedactionSettingsState;
  actions: RedactionSettingsActions;
  utils: {
    /** 設定が有効かチェック */
    isValid: boolean;
    /** ストレージ使用量を取得 */
    getStorageUsage: () => { used: number; available: number; percentage: number };
    /** 設定をリセット */
    reset: () => void;
    /** 設定の差分を取得 */
    getDiff: (newSettings: RedactionSettingsCreateRequest | RedactionSettingsUpdateRequest) => Record<string, any>;
  };
}

/**
 * 設定のバリデーション関数
 */
function validateRedactionSettings(settings: RedactionSettingsCreateRequest | RedactionSettingsUpdateRequest): string[] {
  const errors: string[] = [];

  // 必須フィールドのチェック
  if (!settings.name) {
    errors.push('設定名は必須です');
  }

  // 設定値のチェック
  if (settings.show_all !== undefined && typeof settings.show_all !== 'boolean') {
    errors.push('show_allは真偽値である必要があります');
  }

  if (settings.revealed_items !== undefined) {
    if (!Array.isArray(settings.revealed_items)) {
      errors.push('revealed_itemsは配列である必要があります');
    } else {
      const invalidItems = settings.revealed_items.filter(item => typeof item !== 'string');
      if (invalidItems.length > 0) {
        errors.push('revealed_itemsの要素は文字列である必要があります');
      }
    }
  }

  if (settings.level_settings !== undefined) {
    if (typeof settings.level_settings !== 'object' || settings.level_settings === null) {
      errors.push('level_settingsはオブジェクトである必要があります');
    } else {
      const validLevels = ['level1', 'level2', 'level3'];
      const invalidLevels = Object.keys(settings.level_settings).filter(
        level => !validLevels.includes(level)
      );
      if (invalidLevels.length > 0) {
        errors.push(`無効なレベル設定: ${invalidLevels.join(', ')}`);
      }

      const invalidValues = Object.values(settings.level_settings).filter(
        value => typeof value !== 'boolean'
      );
      if (invalidValues.length > 0) {
        errors.push('level_settingsの値は真偽値である必要があります');
      }
    }
  }

  // メタデータのチェック（必要に応じて追加）

  return errors;
}

/**
 * API呼び出し関数
 */
async function callApi<T>(
  url: string,
  options: RequestInit = {},
  debug: boolean = false
): Promise<T> {
  if (debug) {
    console.log(`[useRedactionSettings] API Call: ${url}`, options);
  }

  const defaultHeaders: Record<string, string> = {};

  // POST, PUT, PATCH リクエストの場合のみContent-Typeを設定
  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * 赤セルシート設定管理フック
 * @param options オプション
 * @returns 設定管理の状態とアクション
 */
export function useRedactionSettings(options: UseRedactionSettingsOptions): UseRedactionSettingsReturn {
  const {
    fileId,
    userId,
    autoSave = false,
    autoSaveInterval = 5000,
    debug = false,
    apiBaseUrl = '/api'
  } = options;

  // 初期状態
  const initialState: RedactionSettingsState = {
    currentSettings: null,
    settingsList: [],
    isLoading: false,
    isSaving: false,
    error: null,
    lastUpdated: null,
    isDirty: false,
    validationErrors: []
  };

  const [state, setState] = useState<RedactionSettingsState>(initialState);

  // デバッグログ
  const debugLog = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[useRedactionSettings] ${message}`, data);
    }
  }, [debug]);

  // 状態更新ヘルパー
  const updateState = useCallback((updates: Partial<RedactionSettingsState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      debugLog('State updated', { updates, newState });
      return newState;
    });
  }, [debugLog]);

  // アクション関数の実装
  const actions: RedactionSettingsActions = {
    // 設定の読み込み
    loadSettings: useCallback(async (settingsId?: string) => {
      updateState({ isLoading: true, error: null });

      try {
        const url = settingsId
          ? `${apiBaseUrl}/redaction-settings/${settingsId}`
          : `${apiBaseUrl}/files/${fileId}/redaction-settings`;

        const response = await callApi<{ settings: RedactionSettings }>(url, {
          headers: { 'X-User-ID': userId }
        }, debug);

        updateState({
          isLoading: false,
          currentSettings: response.settings,
          lastUpdated: Date.now(),
          isDirty: false
        });

        debugLog('Settings loaded', response);
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to load settings', error);
      }
    }, [fileId, userId, apiBaseUrl, debug, updateState]),

    loadSettingsList: useCallback(async () => {
      updateState({ isLoading: true, error: null });

      try {
        const response = await callApi<RedactionSettingsListResponse>(
          `${apiBaseUrl}/files/${fileId}/redaction-settings`,
          { headers: { 'X-User-ID': userId } },
          debug
        );

        updateState({
          isLoading: false,
          settingsList: response.settings,
          lastUpdated: Date.now()
        });

        debugLog('Settings list loaded', response);
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to load settings list', error);
      }
    }, [fileId, userId, apiBaseUrl, debug, updateState]),

    // 設定の保存・更新
    saveSettings: useCallback(async (settings: RedactionSettingsCreateRequest) => {
      updateState({ isSaving: true, error: null });

      try {
        const validationErrors = validateRedactionSettings(settings);
        if (validationErrors.length > 0) {
          updateState({
            isSaving: false,
            validationErrors,
            error: `バリデーションエラー: ${validationErrors.join(', ')}`
          });
          return null;
        }

        const response = await callApi<{ settings: RedactionSettings }>(
          `${apiBaseUrl}/files/${fileId}/redaction-settings`,
          {
            method: 'POST',
            headers: { 'X-User-ID': userId },
            body: JSON.stringify(settings)
          },
          debug
        );

        updateState({
          isSaving: false,
          currentSettings: response.settings,
          lastUpdated: Date.now(),
          isDirty: false,
          validationErrors: []
        });

        debugLog('Settings saved', response);
        return response.settings;
      } catch (error) {
        updateState({
          isSaving: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to save settings', error);
        return null;
      }
    }, [fileId, userId, apiBaseUrl, debug, updateState]),

    updateSettings: useCallback(async (settingsId: string, settings: RedactionSettingsUpdateRequest) => {
      updateState({ isSaving: true, error: null });

      try {
        const validationErrors = validateRedactionSettings(settings);
        if (validationErrors.length > 0) {
          updateState({
            isSaving: false,
            validationErrors,
            error: `バリデーションエラー: ${validationErrors.join(', ')}`
          });
          return null;
        }

        const response = await callApi<{ settings: RedactionSettings }>(
          `${apiBaseUrl}/redaction-settings/${settingsId}`,
          {
            method: 'PUT',
            headers: { 'X-User-ID': userId },
            body: JSON.stringify(settings)
          },
          debug
        );

        updateState({
          isSaving: false,
          currentSettings: response.settings,
          lastUpdated: Date.now(),
          isDirty: false,
          validationErrors: []
        });

        debugLog('Settings updated', response);
        return response.settings;
      } catch (error) {
        updateState({
          isSaving: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to update settings', error);
        return null;
      }
    }, [userId, apiBaseUrl, debug, updateState]),

    // 設定の削除
    deleteSettings: useCallback(async (settingsId: string) => {
      updateState({ isSaving: true, error: null });

      try {
        await callApi(
          `${apiBaseUrl}/redaction-settings/${settingsId}`,
          {
            method: 'DELETE',
            headers: { 'X-User-ID': userId }
          },
          debug
        );

        updateState({
          isSaving: false,
          currentSettings: null,
          lastUpdated: Date.now(),
          isDirty: false
        });

        debugLog('Settings deleted', { settingsId });
        return true;
      } catch (error) {
        updateState({
          isSaving: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to delete settings', error);
        return false;
      }
    }, [userId, apiBaseUrl, debug, updateState]),

    // 設定のインポート・エクスポート
    exportSettings: useCallback(async (settingsId: string, format: 'json' | 'csv' = 'json') => {
      updateState({ isLoading: true, error: null });

      try {
        const response = await callApi<RedactionSettingsExportResponse>(
          `${apiBaseUrl}/redaction-settings/${settingsId}/export`,
          {
            method: 'POST',
            headers: { 'X-User-ID': userId },
            body: JSON.stringify({ format })
          },
          debug
        );

        updateState({ isLoading: false });
        debugLog('Settings exported', { settingsId, format });
        return response.settings_data;
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to export settings', error);
        return null;
      }
    }, [userId, apiBaseUrl, debug, updateState]),

    importSettings: useCallback(async (data: string, format: 'json' | 'csv' = 'json') => {
      updateState({ isLoading: true, error: null });

      try {
        const response = await callApi<{ settings: RedactionSettings }>(
          `${apiBaseUrl}/files/${fileId}/redaction-settings/import`,
          {
            method: 'POST',
            headers: { 'X-User-ID': userId },
            body: JSON.stringify({ data, format })
          },
          debug
        );

        updateState({
          isLoading: false,
          currentSettings: response.settings,
          lastUpdated: Date.now(),
          isDirty: false
        });

        debugLog('Settings imported', response);
        return response.settings;
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to import settings', error);
        return null;
      }
    }, [fileId, userId, apiBaseUrl, debug, updateState]),

    // 設定の共有（将来実装予定）
    // shareSettings: useCallback(async (settingsId: string, shareRequest: any) => {
    //   // 実装予定
    //   return null;
    // }, [userId, apiBaseUrl, debug, updateState]),

    // ローカルストレージ操作
    saveToLocalStorage: useCallback(async (settings: RedactionSettings) => {
      try {
        const success = await saveRedactionSettings(fileId, settings);
        debugLog('Settings saved to localStorage', { fileId, success });
        return success;
      } catch (error) {
        debugLog('Failed to save to localStorage', error);
        return false;
      }
    }, [fileId, debugLog]),

    loadFromLocalStorage: useCallback(async () => {
      try {
        const settings = await loadRedactionSettings(fileId);
        debugLog('Settings loaded from localStorage', { fileId, settings });
        return settings;
      } catch (error) {
        debugLog('Failed to load from localStorage', error);
        return null;
      }
    }, [fileId, debugLog]),

    clearLocalStorage: useCallback(async () => {
      try {
        const success = await removeRedactionSettings(fileId);
        debugLog('LocalStorage cleared', { fileId, success });
        return success;
      } catch (error) {
        debugLog('Failed to clear localStorage', error);
        return false;
      }
    }, [fileId, debugLog]),

    // 状態管理
    setCurrentSettings: useCallback((settings: RedactionSettings | null) => {
      updateState({ currentSettings: settings, isDirty: false });
      debugLog('Current settings set', settings);
    }, [updateState, debugLog]),

    setDirty: useCallback((dirty: boolean) => {
      updateState({ isDirty: dirty });
      debugLog('Dirty state set', { dirty });
    }, [updateState, debugLog]),

    setError: useCallback((error: string | null) => {
      updateState({ error });
      debugLog('Error set', { error });
    }, [updateState, debugLog]),

    clearError: useCallback(() => {
      updateState({ error: null, validationErrors: [] });
      debugLog('Error cleared');
    }, [updateState, debugLog]),

    // バリデーション
    validateSettings: useCallback((settings: RedactionSettingsCreateRequest | RedactionSettingsUpdateRequest) => {
      const errors = validateRedactionSettings(settings);
      updateState({ validationErrors: errors });
      debugLog('Settings validated', { settings, errors });
      return errors;
    }, [updateState, debugLog])
  };

  // ユーティリティ関数
  const utils = useMemo(() => ({
    isValid: state.validationErrors.length === 0 && state.error === null,

    getStorageUsage: () => {
      try {
        return getStorageUsage();
      } catch (error) {
        debugLog('Failed to get storage usage', error);
        return { used: 0, available: 0, percentage: 0 };
      }
    },

    reset: () => {
      setState(initialState);
      debugLog('State reset');
    },

    getDiff: (newSettings: RedactionSettingsCreateRequest | RedactionSettingsUpdateRequest) => {
      if (!state.currentSettings) {
        return newSettings;
      }

      const diff: Record<string, any> = {};
      const current = state.currentSettings;

      if (newSettings.show_all !== undefined && newSettings.show_all !== current.show_all) {
        diff.show_all = newSettings.show_all;
      }

      if (newSettings.revealed_items !== undefined) {
        const currentItems = Array.from(current.revealed_items || []);
        if (JSON.stringify(newSettings.revealed_items) !== JSON.stringify(currentItems)) {
          diff.revealed_items = newSettings.revealed_items;
        }
      }

      if (newSettings.level_settings !== undefined) {
        if (JSON.stringify(newSettings.level_settings) !== JSON.stringify(current.level_settings)) {
          diff.level_settings = newSettings.level_settings;
        }
      }

      return diff;
    }
  }), [state, initialState, debugLog]);

  // 自動保存の実装
  useEffect(() => {
    if (!autoSave || !state.isDirty || !state.currentSettings) {
      return;
    }

    const timer = setTimeout(async () => {
      debugLog('Auto-saving settings', { fileId });
      try {
        await actions.saveToLocalStorage(state.currentSettings!);
        updateState({ isDirty: false });
      } catch (error) {
        debugLog('Auto-save failed', error);
      }
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [autoSave, state.isDirty, state.currentSettings, fileId, autoSaveInterval, actions, updateState, debugLog]);

  return {
    state,
    actions,
    utils
  };
}
