/**
 * 赤セルシート機能の型定義
 * バックエンドAPIとの整合性を保つためのTypeScript型定義
 */

// ===========================
// 基本型定義
// ===========================

/**
 * 赤セルシートレベル
 * バックエンドのRedactionLevelと対応
 */
export type RedactionLevel = 'level1' | 'level2' | 'level3';

/**
 * 赤セルシートレベルの詳細情報
 */
export interface RedactionLevelInfo {
  level: RedactionLevel;
  label: string;
  description: string;
  color: string;
  icon: string;
}

// ===========================
// 設定関連の型定義
// ===========================

/**
 * 赤セルシート設定
 * バックエンドのRedactionSettingsResponseと対応
 */
export interface RedactionSettings {
  id: string;
  file_id: string;
  user_id?: string;
  name: string;
  description?: string;
  show_all: boolean;
  level_settings: Record<string, boolean>;
  revealed_items: string[];
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 赤セルシート設定作成リクエスト
 * バックエンドのRedactionSettingsCreateRequestと対応
 */
export interface RedactionSettingsCreateRequest {
  name: string;
  description?: string;
  show_all?: boolean;
  level_settings?: Record<string, boolean>;
  revealed_items?: string[];
  is_shared?: boolean;
}

/**
 * 赤セルシート設定更新リクエスト
 * バックエンドのRedactionSettingsUpdateRequestと対応
 */
export interface RedactionSettingsUpdateRequest {
  name?: string;
  description?: string;
  show_all?: boolean;
  level_settings?: Record<string, boolean>;
  revealed_items?: string[];
  is_shared?: boolean;
}

/**
 * 赤セルシート設定一覧レスポンス
 * バックエンドのRedactionSettingsListResponseと対応
 */
export interface RedactionSettingsListResponse {
  settings: RedactionSettings[];
  total_count: number;
  limit: number;
  offset: number;
}

/**
 * 赤セルシート設定エクスポートレスポンス
 * バックエンドのRedactionSettingsExportResponseと対応
 */
export interface RedactionSettingsExportResponse {
  settings_data: string;
  export_format: string;
}

/**
 * 赤セルシート設定インポートリクエスト
 * バックエンドのRedactionSettingsImportRequestと対応
 */
export interface RedactionSettingsImportRequest {
  settings_data: string;
}

// ===========================
// 状態管理関連の型定義
// ===========================

/**
 * 赤セルシートの状態
 * フロントエンドでの状態管理用
 */
export interface RedactionState {
  // 基本設定
  settings: RedactionSettings | null;
  isLoading: boolean;
  error: string | null;

  // 表示状態
  showAll: boolean;
  revealedItems: Set<string>;
  levelSettings: Record<string, boolean>;

  // UI状態
  isDirty: boolean;
  isEditing: boolean;
  isSaving: boolean;

  // モーダル状態
  isSettingsModalOpen: boolean;
  isExportModalOpen: boolean;
  isImportModalOpen: boolean;
}

/**
 * 赤セルシートのアクション
 * 状態更新用のアクション型定義
 */
export interface RedactionActions {
  // 設定管理
  loadSettings: (fileId: string, settingsId?: string) => Promise<void>;
  createSettings: (fileId: string, settings: RedactionSettingsCreateRequest) => Promise<void>;
  updateSettings: (fileId: string, settingsId: string, settings: RedactionSettingsUpdateRequest) => Promise<void>;
  deleteSettings: (fileId: string, settingsId: string) => Promise<void>;

  // 表示制御
  toggleShowAll: () => void;
  toggleRevealedItem: (item: string) => void;
  setRevealedItems: (items: string[]) => void;
  updateLevelSettings: (levelSettings: Record<string, boolean>) => void;

  // インポート/エクスポート
  exportSettings: (fileId: string, settingsId: string) => Promise<void>;
  importSettings: (fileId: string, settingsData: string) => Promise<void>;

  // UI制御
  setEditing: (editing: boolean) => void;
  setSaving: (saving: boolean) => void;
  setDirty: (dirty: boolean) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;

  // エラー処理
  setError: (error: string | null) => void;
  clearError: () => void;
}

// ===========================
// Markdown解析関連の型定義
// ===========================

/**
 * 赤セルシート要素
 * Markdown内の赤セルシート構文を解析した結果
 */
export interface RedactionElement {
  id: string;
  type: 'redacted' | 'revealed';
  level: RedactionLevel;
  content: string;
  originalText: string;
  position: {
    start: number;
    end: number;
  };
  isVisible: boolean;
}

/**
 * 赤セルシート解析結果
 * Markdown全体の解析結果
 */
export interface RedactionParseResult {
  elements: RedactionElement[];
  hasRedactedContent: boolean;
  totalRedactedCount: number;
  totalRevealedCount: number;
  levels: {
    [K in RedactionLevel]: number;
  };
}

// ===========================
// API関連の型定義
// ===========================

/**
 * APIエラーレスポンス
 */
export interface RedactionApiError {
  detail: string;
  message?: string;
  code?: string;
}

/**
 * APIレスポンスの基本型
 */
export interface RedactionApiResponse<T = any> {
  data?: T;
  error?: RedactionApiError;
  success: boolean;
}

// ===========================
// ユーティリティ型定義
// ===========================

/**
 * 赤セルシート設定の検証結果
 */
export interface RedactionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 赤セルシート設定の統計情報
 */
export interface RedactionStats {
  totalSettings: number;
  sharedSettings: number;
  privateSettings: number;
  mostUsedLevel: RedactionLevel;
  averageRevealedItems: number;
}

/**
 * 赤セルシート設定の検索フィルター
 */
export interface RedactionSettingsFilter {
  name?: string;
  level?: RedactionLevel;
  isShared?: boolean;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ===========================
// 定数定義
// ===========================

/**
 * 赤セルシートレベルの詳細情報
 */
export const REDACTION_LEVELS: Record<RedactionLevel, RedactionLevelInfo> = {
  level1: {
    level: 'level1',
    label: '最高機密',
    description: '最高レベルの機密情報',
    color: '#dc2626', // red-600
    icon: '🔴'
  },
  level2: {
    level: 'level2',
    label: '一般機密',
    description: '一般的な機密情報',
    color: '#ea580c', // orange-600
    icon: '🟠'
  },
  level3: {
    level: 'level3',
    label: '内部限定',
    description: '内部限定の情報',
    color: '#d97706', // amber-600
    icon: '🟡'
  }
};

/**
 * デフォルトの赤セルシート設定
 */
export const DEFAULT_REDACTION_SETTINGS: Partial<RedactionSettings> = {
  show_all: false,
  level_settings: {
    level1: false,
    level2: false,
    level3: false
  },
  revealed_items: [],
  is_shared: false
};

/**
 * 赤セルシート構文の正規表現
 */
export const REDACTION_REGEX = {
  // [REDACTED:level1:機密情報] 形式
  full: /\[REDACTED:(\w+):([^\]]+)\]/g,
  // [REDACTED:機密情報] 形式（デフォルトレベル）
  simple: /\[REDACTED:([^\]]+)\]/g,
  // レベル部分の抽出
  level: /\[REDACTED:(\w+):/,
  // 内容部分の抽出
  content: /\[REDACTED:\w+:([^\]]+)\]/
};
