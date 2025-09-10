/**
 * 赤セルシート設定のローカルストレージ管理ユーティリティ
 * 設定の一時保存、復元、エクスポート/インポート機能を提供
 */

import {
  RedactionSettings,
  RedactionSettingsCreateRequest,
  RedactionSettingsUpdateRequest,
  RedactionState
} from '../types/redaction';

/**
 * ストレージキーの定数
 */
const STORAGE_KEYS = {
  REDACTION_SETTINGS: 'redaction_settings',
  REDACTION_STATE: 'redaction_state',
  REDACTION_DRAFT: 'redaction_draft',
  REDACTION_HISTORY: 'redaction_history',
  REDACTION_PREFERENCES: 'redaction_preferences'
} as const;

/**
 * ストレージの設定オプション
 */
export interface StorageOptions {
  prefix?: string;
  expiration?: number; // ミリ秒
  compression?: boolean;
}

/**
 * 赤セルシート設定をローカルストレージに保存
 * @param fileId ファイルID
 * @param settings 設定
 * @param options ストレージオプション
 * @returns 保存成功フラグ
 */
export function saveRedactionSettings(
  fileId: string,
  settings: RedactionSettings,
  options: StorageOptions = {}
): boolean {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_SETTINGS, fileId, options.prefix);
    const data = {
      settings,
      timestamp: Date.now(),
      expiration: options.expiration ? Date.now() + options.expiration : null
    };

    const serializedData = options.compression
      ? compressData(data)
      : JSON.stringify(data);

    localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.error('Failed to save redaction settings:', error);
    return false;
  }
}

/**
 * 赤セルシート設定をローカルストレージから読み込み
 * @param fileId ファイルID
 * @param options ストレージオプション
 * @returns 設定またはnull
 */
export function loadRedactionSettings(
  fileId: string,
  options: StorageOptions = {}
): RedactionSettings | null {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_SETTINGS, fileId, options.prefix);
    const serializedData = localStorage.getItem(key);

    if (!serializedData) {
      return null;
    }

    const data = options.compression
      ? decompressData(serializedData)
      : JSON.parse(serializedData);

    // 有効期限チェック
    if (data.expiration && Date.now() > data.expiration) {
      localStorage.removeItem(key);
      return null;
    }

    return data.settings;
  } catch (error) {
    console.error('Failed to load redaction settings:', error);
    return null;
  }
}

/**
 * 赤セルシート設定をローカルストレージから削除
 * @param fileId ファイルID
 * @param options ストレージオプション
 * @returns 削除成功フラグ
 */
export function removeRedactionSettings(
  fileId: string,
  options: StorageOptions = {}
): boolean {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_SETTINGS, fileId, options.prefix);
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove redaction settings:', error);
    return false;
  }
}

/**
 * 赤セルシート状態をローカルストレージに保存
 * @param fileId ファイルID
 * @param state 状態
 * @param options ストレージオプション
 * @returns 保存成功フラグ
 */
export function saveRedactionState(
  fileId: string,
  state: Partial<RedactionState>,
  options: StorageOptions = {}
): boolean {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_STATE, fileId, options.prefix);
    const data = {
      state,
      timestamp: Date.now(),
      expiration: options.expiration ? Date.now() + options.expiration : null
    };

    const serializedData = options.compression
      ? compressData(data)
      : JSON.stringify(data);

    localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.error('Failed to save redaction state:', error);
    return false;
  }
}

/**
 * 赤セルシート状態をローカルストレージから読み込み
 * @param fileId ファイルID
 * @param options ストレージオプション
 * @returns 状態またはnull
 */
export function loadRedactionState(
  fileId: string,
  options: StorageOptions = {}
): Partial<RedactionState> | null {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_STATE, fileId, options.prefix);
    const serializedData = localStorage.getItem(key);

    if (!serializedData) {
      return null;
    }

    const data = options.compression
      ? decompressData(serializedData)
      : JSON.parse(serializedData);

    // 有効期限チェック
    if (data.expiration && Date.now() > data.expiration) {
      localStorage.removeItem(key);
      return null;
    }

    return data.state;
  } catch (error) {
    console.error('Failed to load redaction state:', error);
    return null;
  }
}

/**
 * 下書き設定を保存
 * @param fileId ファイルID
 * @param draft 下書きデータ
 * @param options ストレージオプション
 * @returns 保存成功フラグ
 */
export function saveDraftSettings(
  fileId: string,
  draft: RedactionSettingsCreateRequest | RedactionSettingsUpdateRequest,
  options: StorageOptions = {}
): boolean {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_DRAFT, fileId, options.prefix);
    const data = {
      draft,
      timestamp: Date.now(),
      expiration: options.expiration ? Date.now() + options.expiration : null
    };

    const serializedData = options.compression
      ? compressData(data)
      : JSON.stringify(data);

    localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.error('Failed to save draft settings:', error);
    return false;
  }
}

/**
 * 下書き設定を読み込み
 * @param fileId ファイルID
 * @param options ストレージオプション
 * @returns 下書きデータまたはnull
 */
export function loadDraftSettings(
  fileId: string,
  options: StorageOptions = {}
): RedactionSettingsCreateRequest | RedactionSettingsUpdateRequest | null {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_DRAFT, fileId, options.prefix);
    const serializedData = localStorage.getItem(key);

    if (!serializedData) {
      return null;
    }

    const data = options.compression
      ? decompressData(serializedData)
      : JSON.parse(serializedData);

    // 有効期限チェック
    if (data.expiration && Date.now() > data.expiration) {
      localStorage.removeItem(key);
      return null;
    }

    return data.draft;
  } catch (error) {
    console.error('Failed to load draft settings:', error);
    return null;
  }
}

/**
 * 設定履歴を保存
 * @param fileId ファイルID
 * @param settings 設定
 * @param options ストレージオプション
 * @returns 保存成功フラグ
 */
export function saveSettingsHistory(
  fileId: string,
  settings: RedactionSettings,
  options: StorageOptions = {}
): boolean {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_HISTORY, fileId, options.prefix);
    const existingHistory = loadSettingsHistory(fileId, options) || [];

    const historyEntry = {
      settings,
      timestamp: Date.now(),
      id: generateHistoryId()
    };

    // 最新の履歴を先頭に追加（最大50件まで保持）
    const newHistory = [historyEntry, ...existingHistory].slice(0, 50);

    const data = {
      history: newHistory,
      timestamp: Date.now()
    };

    const serializedData = options.compression
      ? compressData(data)
      : JSON.stringify(data);

    localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.error('Failed to save settings history:', error);
    return false;
  }
}

/**
 * 設定履歴を読み込み
 * @param fileId ファイルID
 * @param options ストレージオプション
 * @returns 履歴配列またはnull
 */
export function loadSettingsHistory(
  fileId: string,
  options: StorageOptions = {}
): Array<{ settings: RedactionSettings; timestamp: number; id: string }> | null {
  try {
    const key = getStorageKey(STORAGE_KEYS.REDACTION_HISTORY, fileId, options.prefix);
    const serializedData = localStorage.getItem(key);

    if (!serializedData) {
      return null;
    }

    const data = options.compression
      ? decompressData(serializedData)
      : JSON.parse(serializedData);

    return data.history || [];
  } catch (error) {
    console.error('Failed to load settings history:', error);
    return null;
  }
}

/**
 * 設定をエクスポート
 * @param settings 設定
 * @returns エクスポートデータ
 */
export function exportSettings(settings: RedactionSettings): string {
  const exportData = {
    version: '1.0',
    timestamp: Date.now(),
    settings,
    metadata: {
      exportedBy: 'redaction-ui',
      format: 'json'
    }
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 設定をインポート
 * @param exportData エクスポートデータ
 * @returns 設定またはnull
 */
export function importSettings(exportData: string): RedactionSettings | null {
  try {
    const data = JSON.parse(exportData);

    // バージョンチェック
    if (data.version !== '1.0') {
      throw new Error('Unsupported export format version');
    }

    // 設定データの検証
    if (!data.settings || typeof data.settings !== 'object') {
      throw new Error('Invalid settings data');
    }

    return data.settings;
  } catch (error) {
    console.error('Failed to import settings:', error);
    return null;
  }
}

/**
 * ストレージの使用状況を取得
 * @returns 使用状況情報
 */
export function getStorageUsage(): {
  used: number;
  available: number;
  percentage: number;
} {
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      }
    }

    // ブラウザの制限（通常5MB）
    const available = 5 * 1024 * 1024; // 5MB
    const percentage = (used / available) * 100;

    return {
      used,
      available,
      percentage
    };
  } catch (error) {
    console.error('Failed to get storage usage:', error);
    return {
      used: 0,
      available: 0,
      percentage: 0
    };
  }
}

/**
 * ストレージをクリーンアップ
 * @param options クリーンアップオプション
 * @returns クリーンアップされた項目数
 */
export function cleanupStorage(options: {
  removeExpired?: boolean;
  removeDrafts?: boolean;
  removeHistory?: boolean;
  olderThan?: number; // ミリ秒
} = {}): number {
  const {
    removeExpired = true,
    removeDrafts = false,
    removeHistory = false,
    olderThan = 7 * 24 * 60 * 60 * 1000 // 7日
  } = options;

  let cleanedCount = 0;
  const now = Date.now();

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 赤セルシート関連のキーのみ処理
      if (!key.includes('redaction')) continue;

      const value = localStorage.getItem(key);
      if (!value) continue;

      try {
        const data = JSON.parse(value);

        // 有効期限チェック
        if (removeExpired && data.expiration && now > data.expiration) {
          localStorage.removeItem(key);
          cleanedCount++;
          continue;
        }

        // 古いデータのチェック
        if (data.timestamp && (now - data.timestamp) > olderThan) {
          localStorage.removeItem(key);
          cleanedCount++;
          continue;
        }

        // 下書きの削除
        if (removeDrafts && key.includes('draft')) {
          localStorage.removeItem(key);
          cleanedCount++;
          continue;
        }

        // 履歴の削除
        if (removeHistory && key.includes('history')) {
          localStorage.removeItem(key);
          cleanedCount++;
          continue;
        }
      } catch (parseError) {
        // パースできないデータは削除
        localStorage.removeItem(key);
        cleanedCount++;
      }
    }
  } catch (error) {
    console.error('Failed to cleanup storage:', error);
  }

  return cleanedCount;
}

/**
 * ストレージキーを生成
 * @param baseKey ベースキー
 * @param fileId ファイルID
 * @param prefix プレフィックス
 * @returns ストレージキー
 */
function getStorageKey(baseKey: string, fileId: string, prefix?: string): string {
  const parts = [prefix, baseKey, fileId].filter(Boolean);
  return parts.join('_');
}

/**
 * データを圧縮（簡易版）
 * @param data データ
 * @returns 圧縮されたデータ
 */
function compressData(data: any): string {
  // 簡易圧縮（実際の実装ではLZ-string等を使用）
  return JSON.stringify(data);
}

/**
 * データを展開（簡易版）
 * @param compressedData 圧縮されたデータ
 * @returns 展開されたデータ
 */
function decompressData(compressedData: string): any {
  // 簡易展開（実際の実装ではLZ-string等を使用）
  return JSON.parse(compressedData);
}

/**
 * 履歴IDを生成
 * @returns 履歴ID
 */
function generateHistoryId(): string {
  return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 赤セルシート設定の履歴を取得
 * @param fileId ファイルID
 * @returns 履歴配列
 */
export async function getRedactionHistory(fileId: string): Promise<RedactionSettings[]> {
  try {
    const key = `${STORAGE_KEYS.REDACTION_HISTORY}${fileId}`;
    const data = localStorage.getItem(key);

    if (!data) {
      return [];
    }

    const history = JSON.parse(data);
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Failed to get redaction history:', error);
    return [];
  }
}

/**
 * 赤セルシート設定の履歴を保存
 * @param fileId ファイルID
 * @param settings 設定データ
 * @param maxCount 最大保持数
 * @returns 保存成功フラグ
 */
export async function saveRedactionHistory(
  fileId: string,
  settings: RedactionSettings,
  maxCount: number = 10
): Promise<boolean> {
  try {
    const key = `${STORAGE_KEYS.REDACTION_HISTORY}${fileId}`;
    const existingHistory = await getRedactionHistory(fileId);

    // 新しい履歴エントリを作成
    const historyEntry = {
      ...settings,
      id: generateHistoryId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 履歴に追加（先頭に挿入）
    const newHistory = [historyEntry, ...existingHistory];

    // 最大保持数を超える場合は古いものを削除
    if (newHistory.length > maxCount) {
      newHistory.splice(maxCount);
    }

    localStorage.setItem(key, JSON.stringify(newHistory));
    return true;
  } catch (error) {
    console.error('Failed to save redaction history:', error);
    return false;
  }
}

/**
 * 赤セルシート設定の履歴をクリア
 * @param fileId ファイルID
 * @returns クリア成功フラグ
 */
export async function clearRedactionHistory(fileId: string): Promise<boolean> {
  try {
    const key = `${STORAGE_KEYS.REDACTION_HISTORY}${fileId}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to clear redaction history:', error);
    return false;
  }
}
