/**
 * 赤セルシート永続化フック
 * 設定の永続化、インポート・エクスポート、履歴管理を担当
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
  getStorageUsage,
  getRedactionHistory,
  saveRedactionHistory,
  clearRedactionHistory
} from '../utils/redactionStorage';

/**
 * useRedactionPersistenceフックのオプション
 */
export interface UseRedactionPersistenceOptions {
  /** ファイルID */
  fileId: string;
  /** ユーザーID */
  userId: string;
  /** 自動保存の有効/無効 */
  autoSave?: boolean;
  /** 自動保存の間隔（ミリ秒） */
  autoSaveInterval?: number;
  /** 履歴保持数 */
  maxHistoryCount?: number;
  /** デバッグモード */
  debug?: boolean;
  /** APIベースURL */
  apiBaseUrl?: string;
}

/**
 * 永続化の状態
 */
export interface RedactionPersistenceState {
  /** 現在の設定 */
  currentSettings: RedactionSettings | null;
  /** 設定リスト */
  settingsList: RedactionSettings[];
  /** 設定履歴 */
  settingsHistory: RedactionSettings[];
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** 保存中フラグ */
  isSaving: boolean;
  /** エクスポート中フラグ */
  isExporting: boolean;
  /** インポート中フラグ */
  isImporting: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 最後に更新された時刻 */
  lastUpdated: number | null;
  /** 設定が変更されているか */
  isDirty: boolean;
  /** ストレージ使用量 */
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}

/**
 * 永続化のアクション
 */
export interface RedactionPersistenceActions {
  // 設定の永続化
  saveSettings: (settings: RedactionSettingsCreateRequest) => Promise<RedactionSettings | null>;
  loadSettings: (settingsId?: string) => Promise<RedactionSettings | null>;
  deleteSettings: (settingsId: string) => Promise<boolean>;

  // 設定の一覧取得
  listSettings: (limit?: number, offset?: number) => Promise<RedactionSettings[]>;

  // 設定のインポート・エクスポート
  exportSettings: (settingsId: string, format?: 'json' | 'csv') => Promise<string | null>;
  importSettings: (data: string, format?: 'json' | 'csv') => Promise<RedactionSettings | null>;

  // 履歴管理
  loadHistory: () => Promise<RedactionSettings[]>;
  saveToHistory: (settings: RedactionSettings) => Promise<boolean>;
  clearHistory: () => Promise<boolean>;
  restoreFromHistory: (historyIndex: number) => Promise<RedactionSettings | null>;

  // ストレージ管理
  getStorageUsage: () => { used: number; available: number; percentage: number };
  clearStorage: () => Promise<boolean>;

  // 状態管理
  setCurrentSettings: (settings: RedactionSettings | null) => void;
  setDirty: (dirty: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * useRedactionPersistenceフックの戻り値
 */
export interface UseRedactionPersistenceReturn {
  state: RedactionPersistenceState;
  actions: RedactionPersistenceActions;
  utils: {
    /** 設定が有効かチェック */
    isValid: boolean;
    /** 設定をリセット */
    reset: () => void;
    /** 設定の差分を取得 */
    getDiff: (newSettings: RedactionSettingsCreateRequest | RedactionSettingsUpdateRequest) => Record<string, any>;
    /** 履歴の統計情報 */
    getHistoryStats: () => { total: number; oldest: Date | null; newest: Date | null };
  };
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
    console.log(`[useRedactionPersistence] API Call: ${url}`, options);
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
 * 赤セルシート永続化フック
 * @param options オプション
 * @returns 永続化の状態とアクション
 */
export function useRedactionPersistence(options: UseRedactionPersistenceOptions): UseRedactionPersistenceReturn {
  const {
    fileId,
    userId,
    autoSave = false,
    autoSaveInterval = 5000,
    maxHistoryCount = 10,
    debug = false,
    apiBaseUrl = '/api'
  } = options;

  // 初期状態
  const initialState: RedactionPersistenceState = {
    currentSettings: null,
    settingsList: [],
    settingsHistory: [],
    isLoading: false,
    isSaving: false,
    isExporting: false,
    isImporting: false,
    error: null,
    lastUpdated: null,
    isDirty: false,
    storageUsage: { used: 0, available: 0, percentage: 0 }
  };

  const [state, setState] = useState<RedactionPersistenceState>(initialState);

  // デバッグログ
  const debugLog = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[useRedactionPersistence] ${message}`, data);
    }
  }, [debug]);

  // 状態更新ヘルパー
  const updateState = useCallback((updates: Partial<RedactionPersistenceState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      debugLog('State updated', { updates, newState });
      return newState;
    });
  }, [debugLog]);

  // ストレージ使用量の更新
  const updateStorageUsage = useCallback(() => {
    try {
      const usage = getStorageUsage();
      updateState({ storageUsage: usage });
    } catch (error) {
      debugLog('Failed to get storage usage', error);
    }
  }, [updateState, debugLog]);

  // アクション関数の実装
  const actions: RedactionPersistenceActions = {
    // 設定の永続化
    saveSettings: useCallback(async (settings: RedactionSettingsCreateRequest) => {
      updateState({ isSaving: true, error: null });

      try {
        const response = await callApi<{ settings: RedactionSettings }>(
          `${apiBaseUrl}/files/${fileId}/redaction-settings`,
          {
            method: 'POST',
            headers: { 'X-User-ID': userId },
            body: JSON.stringify(settings)
          },
          debug
        );

        const savedSettings = response.settings;

        // ローカルストレージにも保存
        await saveRedactionSettings(fileId, savedSettings);

        // 履歴に追加
        await saveRedactionHistory(fileId, savedSettings, maxHistoryCount);

        updateState({
          isSaving: false,
          currentSettings: savedSettings,
          lastUpdated: Date.now(),
          isDirty: false
        });

        updateStorageUsage();
        debugLog('Settings saved', savedSettings);
        return savedSettings;
      } catch (error) {
        updateState({
          isSaving: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to save settings', error);
        return null;
      }
    }, [fileId, userId, apiBaseUrl, debug, updateState, updateStorageUsage]),

    loadSettings: useCallback(async (settingsId?: string) => {
      updateState({ isLoading: true, error: null });

      try {
        let settings: RedactionSettings | null = null;

        if (settingsId) {
          // 特定の設定を読み込み
          const response = await callApi<{ settings: RedactionSettings }>(
            `${apiBaseUrl}/redaction-settings/${settingsId}`,
            { headers: { 'X-User-ID': userId } },
            debug
          );
          settings = response.settings;
        } else {
          // ローカルストレージから読み込み
          settings = await loadRedactionSettings(fileId);
        }

        updateState({
          isLoading: false,
          currentSettings: settings,
          lastUpdated: Date.now(),
          isDirty: false
        });

        debugLog('Settings loaded', settings);
        return settings;
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to load settings', error);
        return null;
      }
    }, [fileId, userId, apiBaseUrl, debug, updateState]),

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

        // ローカルストレージからも削除
        await removeRedactionSettings(fileId);

        updateState({
          isSaving: false,
          currentSettings: null,
          lastUpdated: Date.now(),
          isDirty: false
        });

        updateStorageUsage();
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
    }, [fileId, userId, apiBaseUrl, debug, updateState, updateStorageUsage]),

    // 設定の一覧取得
    listSettings: useCallback(async (limit: number = 20, offset: number = 0) => {
      updateState({ isLoading: true, error: null });

      try {
        const response = await callApi<RedactionSettingsListResponse>(
          `${apiBaseUrl}/files/${fileId}/redaction-settings?limit=${limit}&offset=${offset}`,
          { headers: { 'X-User-ID': userId } },
          debug
        );

        updateState({
          isLoading: false,
          settingsList: response.settings,
          lastUpdated: Date.now()
        });

        debugLog('Settings list loaded', response);
        return response.settings;
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to load settings list', error);
        return [];
      }
    }, [fileId, userId, apiBaseUrl, debug, updateState]),

    // 設定のインポート・エクスポート
    exportSettings: useCallback(async (settingsId: string, format: 'json' | 'csv' = 'json') => {
      updateState({ isExporting: true, error: null });

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

        updateState({ isExporting: false });
        debugLog('Settings exported', { settingsId, format });
        return response.settings_data;
      } catch (error) {
        updateState({
          isExporting: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to export settings', error);
        return null;
      }
    }, [userId, apiBaseUrl, debug, updateState]),

    importSettings: useCallback(async (data: string, format: 'json' | 'csv' = 'json') => {
      updateState({ isImporting: true, error: null });

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

        const importedSettings = response.settings;

        // ローカルストレージにも保存
        await saveRedactionSettings(fileId, importedSettings);

        // 履歴に追加
        await saveRedactionHistory(fileId, importedSettings, maxHistoryCount);

        updateState({
          isImporting: false,
          currentSettings: importedSettings,
          lastUpdated: Date.now(),
          isDirty: false
        });

        updateStorageUsage();
        debugLog('Settings imported', importedSettings);
        return importedSettings;
      } catch (error) {
        updateState({
          isImporting: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        debugLog('Failed to import settings', error);
        return null;
      }
    }, [fileId, userId, apiBaseUrl, debug, updateState, updateStorageUsage]),

    // 履歴管理
    loadHistory: useCallback(async () => {
      try {
        const history = await getRedactionHistory(fileId);
        updateState({ settingsHistory: history });
        debugLog('History loaded', { count: history.length });
        return history;
      } catch (error) {
        debugLog('Failed to load history', error);
        return [];
      }
    }, [fileId, updateState, debugLog]),

    saveToHistory: useCallback(async (settings: RedactionSettings) => {
      try {
        await saveRedactionHistory(fileId, settings, maxHistoryCount);
        debugLog('Settings saved to history', { settingsId: settings.id });
        return true;
      } catch (error) {
        debugLog('Failed to save to history', error);
        return false;
      }
    }, [fileId, maxHistoryCount, debugLog]),

    clearHistory: useCallback(async () => {
      try {
        await clearRedactionHistory(fileId);
        updateState({ settingsHistory: [] });
        debugLog('History cleared');
        return true;
      } catch (error) {
        debugLog('Failed to clear history', error);
        return false;
      }
    }, [fileId, updateState, debugLog]),

    restoreFromHistory: useCallback(async (historyIndex: number) => {
      try {
        const history = await getRedactionHistory(fileId);
        if (historyIndex >= 0 && historyIndex < history.length) {
          const restoredSettings = history[historyIndex];

          // 現在の設定として復元
          updateState({
            currentSettings: restoredSettings,
            lastUpdated: Date.now(),
            isDirty: false
          });

          debugLog('Settings restored from history', { historyIndex, settingsId: restoredSettings.id });
          return restoredSettings;
        }
        return null;
      } catch (error) {
        debugLog('Failed to restore from history', error);
        return null;
      }
    }, [fileId, updateState, debugLog]),

    // ストレージ管理
    getStorageUsage: useCallback(() => {
      return getStorageUsage();
    }, []),

    clearStorage: useCallback(async () => {
      try {
        await removeRedactionSettings(fileId);
        await clearRedactionHistory(fileId);
        updateState({
          currentSettings: null,
          settingsHistory: [],
          isDirty: false
        });
        updateStorageUsage();
        debugLog('Storage cleared');
        return true;
      } catch (error) {
        debugLog('Failed to clear storage', error);
        return false;
      }
    }, [fileId, updateState, updateStorageUsage, debugLog]),

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
      updateState({ error: null });
      debugLog('Error cleared');
    }, [updateState, debugLog])
  };

  // ユーティリティ関数
  const utils = useMemo(() => ({
    isValid: state.error === null,

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
    },

    getHistoryStats: () => {
      const history = state.settingsHistory;
      if (history.length === 0) {
        return { total: 0, oldest: null, newest: null };
      }

      const dates = history.map(h => new Date(h.created_at)).sort();
      return {
        total: history.length,
        oldest: dates[0],
        newest: dates[dates.length - 1]
      };
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
        await saveRedactionSettings(fileId, state.currentSettings!);
        updateState({ isDirty: false });
      } catch (error) {
        debugLog('Auto-save failed', error);
      }
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [autoSave, state.isDirty, state.currentSettings, fileId, autoSaveInterval, updateState, debugLog]);

  // 初期化時にストレージ使用量を更新
  useEffect(() => {
    updateStorageUsage();
  }, [updateStorageUsage]);

  return {
    state,
    actions,
    utils
  };
}
