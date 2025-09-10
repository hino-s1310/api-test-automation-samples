/**
 * 赤セルシート機能の状態管理フック
 * 赤セルシート要素の表示/非表示状態を管理し、アクションを提供
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  RedactionLevel,
  RedactionElement,
  RedactionState,
  RedactionActions,
  DEFAULT_REDACTION_SETTINGS
} from '../types/redaction';

/**
 * useRedactionフックのオプション
 */
export interface UseRedactionOptions {
  /** 初期設定 */
  initialSettings?: Partial<Omit<RedactionState, 'revealedItems'> & {
    revealedItems?: Set<string> | string[];
  }>;
  /** 自動保存の有効/無効 */
  autoSave?: boolean;
  /** 自動保存の間隔（ミリ秒） */
  autoSaveInterval?: number;
  /** ファイルID（自動保存用） */
  fileId?: string;
  /** デバッグモード */
  debug?: boolean;
}

/**
 * useRedactionフックの戻り値
 */
export interface UseRedactionReturn {
  // 状態
  state: RedactionState;

  // アクション
  actions: RedactionActions;

  // ユーティリティ
  utils: {
    /** 要素が表示されているかチェック */
    isElementVisible: (elementId: string) => boolean;
    /** レベルが表示されているかチェック */
    isLevelVisible: (level: RedactionLevel) => boolean;
    /** 統計情報を取得 */
    getStats: () => {
      totalElements: number;
      visibleElements: number;
      hiddenElements: number;
      levelCounts: Record<RedactionLevel, number>;
    };
    /** 状態をリセット */
    reset: () => void;
    /** 状態をエクスポート */
    exportState: () => string;
    /** 状態をインポート */
    importState: (stateData: string) => boolean;
  };
}

/**
 * 赤セルシート機能の状態管理フック
 * @param options オプション
 * @returns 状態とアクション
 */
export function useRedaction(options: UseRedactionOptions = {}): UseRedactionReturn {
  const {
    initialSettings = {},
    autoSave = false,
    autoSaveInterval = 5000,
    fileId,
    debug = false
  } = options;

  // 初期状態の設定
  const initialState: RedactionState = {
    settings: null,
    isLoading: false,
    error: null,
    showAll: initialSettings.showAll ?? DEFAULT_REDACTION_SETTINGS.show_all ?? false,
    revealedItems: initialSettings.revealedItems
      ? (Array.isArray(initialSettings.revealedItems)
          ? new Set(initialSettings.revealedItems)
          : initialSettings.revealedItems)
      : new Set(),
    levelSettings: initialSettings.levelSettings ?? DEFAULT_REDACTION_SETTINGS.level_settings ?? {
      level1: false,
      level2: false,
      level3: false
    },
    isDirty: initialSettings.isDirty ?? false,
    isEditing: initialSettings.isEditing ?? false,
    isSaving: initialSettings.isSaving ?? false,
    isSettingsModalOpen: initialSettings.isSettingsModalOpen ?? false,
    isExportModalOpen: initialSettings.isExportModalOpen ?? false,
    isImportModalOpen: initialSettings.isImportModalOpen ?? false
  };

  // 状態管理
  const [state, setState] = useState<RedactionState>(initialState);

  // デバッグログ
  const debugLog = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[useRedaction] ${message}`, data);
    }
  }, [debug]);

  // 状態更新ヘルパー
  const updateState = useCallback((updates: Partial<RedactionState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      debugLog('State updated', { updates, newState });
      return newState;
    });
  }, [debugLog]);

  // アクション関数の実装
  const actions: RedactionActions = {
    // 設定管理
    loadSettings: useCallback(async (fileId: string, settingsId?: string) => {
      updateState({ isLoading: true, error: null });
      try {
        // TODO: API呼び出しを実装
        debugLog('Loading settings', { fileId, settingsId });
        // 仮の実装
        updateState({
          isLoading: false,
          settings: null // 実際のAPIレスポンスに置き換え
        });
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, [updateState, debugLog]),

    createSettings: useCallback(async (fileId: string, settings: any) => {
      updateState({ isSaving: true, error: null });
      try {
        // TODO: API呼び出しを実装
        debugLog('Creating settings', { fileId, settings });
        updateState({ isSaving: false, isDirty: false });
      } catch (error) {
        updateState({
          isSaving: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, [updateState, debugLog]),

    updateSettings: useCallback(async (fileId: string, settingsId: string, settings: any) => {
      updateState({ isSaving: true, error: null });
      try {
        // TODO: API呼び出しを実装
        debugLog('Updating settings', { fileId, settingsId, settings });
        updateState({ isSaving: false, isDirty: false });
      } catch (error) {
        updateState({
          isSaving: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, [updateState, debugLog]),

    deleteSettings: useCallback(async (fileId: string, settingsId: string) => {
      updateState({ isSaving: true, error: null });
      try {
        // TODO: API呼び出しを実装
        debugLog('Deleting settings', { fileId, settingsId });
        updateState({ isSaving: false });
      } catch (error) {
        updateState({
          isSaving: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, [updateState, debugLog]),

    // 表示制御
    toggleShowAll: useCallback(() => {
      setState(prev => ({
        ...prev,
        showAll: !prev.showAll,
        isDirty: true
      }));
      debugLog('Toggled show all');
    }, [debugLog]),

    toggleRevealedItem: useCallback((item: string) => {
      setState(prev => {
        const newRevealedItems = new Set(prev.revealedItems);
        if (newRevealedItems.has(item)) {
          newRevealedItems.delete(item);
        } else {
          newRevealedItems.add(item);
        }
        return {
          ...prev,
          revealedItems: newRevealedItems,
          isDirty: true
        };
      });
      debugLog('Toggled revealed item', { item });
    }, [debugLog]),

    setRevealedItems: useCallback((items: string[]) => {
      setState(prev => ({
        ...prev,
        revealedItems: new Set(items),
        isDirty: true
      }));
      debugLog('Set revealed items', { items });
    }, [debugLog]),

    updateLevelSettings: useCallback((levelSettings: Record<string, boolean>) => {
      setState(prev => ({
        ...prev,
        levelSettings: { ...prev.levelSettings, ...levelSettings },
        isDirty: true
      }));
      debugLog('Updated level settings', { levelSettings });
    }, [debugLog]),

    // インポート/エクスポート
    exportSettings: useCallback(async (fileId: string, settingsId: string) => {
      updateState({ isLoading: true, error: null });
      try {
        // TODO: API呼び出しを実装
        debugLog('Exporting settings', { fileId, settingsId });
        updateState({ isLoading: false });
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, [updateState, debugLog]),

    importSettings: useCallback(async (fileId: string, settingsData: string) => {
      updateState({ isLoading: true, error: null });
      try {
        // TODO: API呼び出しを実装
        debugLog('Importing settings', { fileId, settingsData });
        updateState({ isLoading: false, isDirty: true });
      } catch (error) {
        updateState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, [updateState, debugLog]),

    // UI制御
    setEditing: useCallback((editing: boolean) => {
      setState(prev => ({ ...prev, isEditing: editing }));
      debugLog('Set editing', { editing });
    }, [debugLog]),

    setSaving: useCallback((saving: boolean) => {
      setState(prev => ({ ...prev, isSaving: saving }));
      debugLog('Set saving', { saving });
    }, [debugLog]),

    setDirty: useCallback((dirty: boolean) => {
      setState(prev => ({ ...prev, isDirty: dirty }));
      debugLog('Set dirty', { dirty });
    }, [debugLog]),

    openSettingsModal: useCallback(() => {
      setState(prev => ({ ...prev, isSettingsModalOpen: true }));
      debugLog('Opened settings modal');
    }, [debugLog]),

    closeSettingsModal: useCallback(() => {
      setState(prev => ({ ...prev, isSettingsModalOpen: false }));
      debugLog('Closed settings modal');
    }, [debugLog]),

    openExportModal: useCallback(() => {
      setState(prev => ({ ...prev, isExportModalOpen: true }));
      debugLog('Opened export modal');
    }, [debugLog]),

    closeExportModal: useCallback(() => {
      setState(prev => ({ ...prev, isExportModalOpen: false }));
      debugLog('Closed export modal');
    }, [debugLog]),

    openImportModal: useCallback(() => {
      setState(prev => ({ ...prev, isImportModalOpen: true }));
      debugLog('Opened import modal');
    }, [debugLog]),

    closeImportModal: useCallback(() => {
      setState(prev => ({ ...prev, isImportModalOpen: false }));
      debugLog('Closed import modal');
    }, [debugLog]),

    // エラー処理
    setError: useCallback((error: string | null) => {
      setState(prev => ({ ...prev, error }));
      debugLog('Set error', { error });
    }, [debugLog]),

    clearError: useCallback(() => {
      setState(prev => ({ ...prev, error: null }));
      debugLog('Cleared error');
    }, [debugLog])
  };

  // ユーティリティ関数
  const utils = useMemo(() => ({
    isElementVisible: (elementId: string): boolean => {
      return state.showAll || state.revealedItems.has(elementId);
    },

    isLevelVisible: (level: RedactionLevel): boolean => {
      return state.showAll || state.levelSettings[level] === true;
    },

    getStats: () => {
      // TODO: 実際の要素データから統計を計算
      return {
        totalElements: 0,
        visibleElements: 0,
        hiddenElements: 0,
        levelCounts: {
          level1: 0,
          level2: 0,
          level3: 0
        }
      };
    },

    reset: () => {
      setState(initialState);
      debugLog('State reset');
    },

    exportState: (): string => {
      const exportData = {
        version: '1.0',
        timestamp: Date.now(),
        state: {
          showAll: state.showAll,
          revealedItems: Array.from(state.revealedItems),
          levelSettings: state.levelSettings
        }
      };
      debugLog('State exported', exportData);
      return JSON.stringify(exportData, null, 2);
    },

    importState: (stateData: string): boolean => {
      try {
        const data = JSON.parse(stateData);
        if (data.version !== '1.0') {
          throw new Error('Unsupported state format version');
        }

        setState(prev => ({
          ...prev,
          showAll: data.state.showAll ?? false,
          revealedItems: new Set(data.state.revealedItems ?? []),
          levelSettings: data.state.levelSettings ?? DEFAULT_REDACTION_SETTINGS.level_settings
        }));

        debugLog('State imported', data);
        return true;
      } catch (error) {
        debugLog('Failed to import state', error);
        return false;
      }
    }
  }), [state, initialState, updateState, debugLog]);

  // 自動保存の実装
  useEffect(() => {
    if (!autoSave || !fileId || !state.isDirty) {
      return;
    }

    const timer = setTimeout(() => {
      debugLog('Auto-saving state', { fileId });
      // TODO: 自動保存の実装
      setState(prev => ({ ...prev, isDirty: false }));
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [autoSave, fileId, state.isDirty, autoSaveInterval, debugLog]);

  return {
    state,
    actions,
    utils
  };
}

/**
 * 赤セルシート要素の表示状態を管理するフック
 * @param elements 赤セルシート要素の配列
 * @param options オプション
 * @returns 表示状態とアクション
 */
export function useRedactionElements(
  elements: RedactionElement[],
  options: UseRedactionOptions = {}
) {
  const redaction = useRedaction(options);

  // 要素の表示状態を計算
  const visibleElements = useMemo(() => {
    return elements.filter(element =>
      redaction.utils.isElementVisible(element.id) ||
      redaction.utils.isLevelVisible(element.level)
    );
  }, [elements, redaction.utils]);

  const hiddenElements = useMemo(() => {
    return elements.filter(element =>
      !redaction.utils.isElementVisible(element.id) &&
      !redaction.utils.isLevelVisible(element.level)
    );
  }, [elements, redaction.utils]);

  // 統計情報を更新
  const stats = useMemo(() => {
    const levelCounts = elements.reduce((acc, element) => {
      acc[element.level] = (acc[element.level] || 0) + 1;
      return acc;
    }, {} as Record<RedactionLevel, number>);

    return {
      totalElements: elements.length,
      visibleElements: visibleElements.length,
      hiddenElements: hiddenElements.length,
      levelCounts: {
        level1: levelCounts.level1 || 0,
        level2: levelCounts.level2 || 0,
        level3: levelCounts.level3 || 0
      }
    };
  }, [elements, visibleElements, hiddenElements]);

  return {
    ...redaction,
    elements: {
      all: elements,
      visible: visibleElements,
      hidden: hiddenElements
    },
    stats
  };
}
