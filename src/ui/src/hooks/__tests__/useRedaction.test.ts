/**
 * useRedactionフックのテスト
 */

import { renderHook, act } from '@testing-library/react';
import { useRedaction, useRedactionElements } from '../useRedaction';
import { RedactionElement, RedactionLevel } from '../../types/redaction';

// モック要素データ
const mockElements: RedactionElement[] = [
  {
    id: 'element1',
    type: 'redacted',
    level: 'level1',
    content: '機密情報1',
    originalText: '[REDACTED:level1:機密情報1]',
    position: { start: 0, end: 25 },
    isVisible: false
  },
  {
    id: 'element2',
    type: 'redacted',
    level: 'level2',
    content: '機密情報2',
    originalText: '[REDACTED:level2:機密情報2]',
    position: { start: 25, end: 50 },
    isVisible: false
  },
  {
    id: 'element3',
    type: 'redacted',
    level: 'level3',
    content: '機密情報3',
    originalText: '[REDACTED:level3:機密情報3]',
    position: { start: 50, end: 75 },
    isVisible: false
  }
];

describe('useRedaction', () => {
  describe('初期状態', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useRedaction());

      expect(result.current.state.showAll).toBe(false);
      expect(result.current.state.revealedItems).toEqual(new Set());
      expect(result.current.state.levelSettings).toEqual({
        level1: false,
        level2: false,
        level3: false
      });
      expect(result.current.state.isDirty).toBe(false);
      expect(result.current.state.isEditing).toBe(false);
      expect(result.current.state.isSaving).toBe(false);
    });

    it('should initialize with custom initial settings', () => {
      const initialSettings = {
        showAll: true,
        revealedItems: ['item1', 'item2'], // 配列でも受け入れる
        levelSettings: { level1: true, level2: false, level3: true },
        isDirty: true
      };

      const { result } = renderHook(() => useRedaction({ initialSettings }));

      expect(result.current.state.showAll).toBe(true);
      expect(result.current.state.revealedItems).toEqual(new Set(['item1', 'item2']));
      expect(result.current.state.levelSettings).toEqual({
        level1: true,
        level2: false,
        level3: true
      });
      expect(result.current.state.isDirty).toBe(true);
    });
  });

  describe('アクション関数', () => {
    it('should toggle show all flag', () => {
      const { result } = renderHook(() => useRedaction());

      act(() => {
        result.current.actions.toggleShowAll();
      });

      expect(result.current.state.showAll).toBe(true);
      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.actions.toggleShowAll();
      });

      expect(result.current.state.showAll).toBe(false);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('should toggle revealed item', () => {
      const { result } = renderHook(() => useRedaction());

      act(() => {
        result.current.actions.toggleRevealedItem('item1');
      });

      expect(result.current.state.revealedItems.has('item1')).toBe(true);
      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.actions.toggleRevealedItem('item1');
      });

      expect(result.current.state.revealedItems.has('item1')).toBe(false);
    });

    it('should set revealed items', () => {
      const { result } = renderHook(() => useRedaction());

      act(() => {
        result.current.actions.setRevealedItems(['item1', 'item2', 'item3']);
      });

      expect(result.current.state.revealedItems).toEqual(new Set(['item1', 'item2', 'item3']));
      expect(result.current.state.isDirty).toBe(true);
    });

    it('should update level settings', () => {
      const { result } = renderHook(() => useRedaction());

      act(() => {
        result.current.actions.updateLevelSettings({ level1: true, level2: true });
      });

      expect(result.current.state.levelSettings).toEqual({
        level1: true,
        level2: true,
        level3: false
      });
      expect(result.current.state.isDirty).toBe(true);
    });

    it('should set editing state', () => {
      const { result } = renderHook(() => useRedaction());

      act(() => {
        result.current.actions.setEditing(true);
      });

      expect(result.current.state.isEditing).toBe(true);

      act(() => {
        result.current.actions.setEditing(false);
      });

      expect(result.current.state.isEditing).toBe(false);
    });

    it('should set saving state', () => {
      const { result } = renderHook(() => useRedaction());

      act(() => {
        result.current.actions.setSaving(true);
      });

      expect(result.current.state.isSaving).toBe(true);

      act(() => {
        result.current.actions.setSaving(false);
      });

      expect(result.current.state.isSaving).toBe(false);
    });

    it('should set dirty state', () => {
      const { result } = renderHook(() => useRedaction());

      act(() => {
        result.current.actions.setDirty(true);
      });

      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.actions.setDirty(false);
      });

      expect(result.current.state.isDirty).toBe(false);
    });

    it('should control modal states', () => {
      const { result } = renderHook(() => useRedaction());

      // Settings modal
      act(() => {
        result.current.actions.openSettingsModal();
      });
      expect(result.current.state.isSettingsModalOpen).toBe(true);

      act(() => {
        result.current.actions.closeSettingsModal();
      });
      expect(result.current.state.isSettingsModalOpen).toBe(false);

      // Export modal
      act(() => {
        result.current.actions.openExportModal();
      });
      expect(result.current.state.isExportModalOpen).toBe(true);

      act(() => {
        result.current.actions.closeExportModal();
      });
      expect(result.current.state.isExportModalOpen).toBe(false);

      // Import modal
      act(() => {
        result.current.actions.openImportModal();
      });
      expect(result.current.state.isImportModalOpen).toBe(true);

      act(() => {
        result.current.actions.closeImportModal();
      });
      expect(result.current.state.isImportModalOpen).toBe(false);
    });

    it('should handle errors', () => {
      const { result } = renderHook(() => useRedaction());

      act(() => {
        result.current.actions.setError('Test error');
      });

      expect(result.current.state.error).toBe('Test error');

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });
  });

  describe('ユーティリティ関数', () => {
    it('should check element visibility', () => {
      const { result } = renderHook(() => useRedaction());

      // 初期状態では非表示
      expect(result.current.utils.isElementVisible('item1')).toBe(false);

      // 個別に表示設定
      act(() => {
        result.current.actions.toggleRevealedItem('item1');
      });
      expect(result.current.utils.isElementVisible('item1')).toBe(true);

      // 全表示フラグ
      act(() => {
        result.current.actions.toggleShowAll();
      });
      expect(result.current.utils.isElementVisible('item1')).toBe(true);
      expect(result.current.utils.isElementVisible('item2')).toBe(true);
    });

    it('should check level visibility', () => {
      const { result } = renderHook(() => useRedaction());

      // 初期状態では非表示
      expect(result.current.utils.isLevelVisible('level1')).toBe(false);

      // レベル設定で表示
      act(() => {
        result.current.actions.updateLevelSettings({ level1: true });
      });
      expect(result.current.utils.isLevelVisible('level1')).toBe(true);
      expect(result.current.utils.isLevelVisible('level2')).toBe(false);

      // 全表示フラグ
      act(() => {
        result.current.actions.toggleShowAll();
      });
      expect(result.current.utils.isLevelVisible('level1')).toBe(true);
      expect(result.current.utils.isLevelVisible('level2')).toBe(true);
      expect(result.current.utils.isLevelVisible('level3')).toBe(true);
    });

    it('should get stats', () => {
      const { result } = renderHook(() => useRedaction());

      const stats = result.current.utils.getStats();

      expect(stats).toHaveProperty('totalElements');
      expect(stats).toHaveProperty('visibleElements');
      expect(stats).toHaveProperty('hiddenElements');
      expect(stats).toHaveProperty('levelCounts');
      expect(stats.levelCounts).toHaveProperty('level1');
      expect(stats.levelCounts).toHaveProperty('level2');
      expect(stats.levelCounts).toHaveProperty('level3');
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useRedaction());

      // 状態を変更
      act(() => {
        result.current.actions.toggleShowAll();
        result.current.actions.toggleRevealedItem('item1');
        result.current.actions.updateLevelSettings({ level1: true });
        result.current.actions.setDirty(true);
      });

      // リセット
      act(() => {
        result.current.utils.reset();
      });

      expect(result.current.state.showAll).toBe(false);
      expect(result.current.state.revealedItems).toEqual(new Set());
      expect(result.current.state.levelSettings).toEqual({
        level1: false,
        level2: false,
        level3: false
      });
      expect(result.current.state.isDirty).toBe(false);
    });

    it('should export and import state', () => {
      const { result } = renderHook(() => useRedaction());

      // 状態を変更
      act(() => {
        result.current.actions.toggleShowAll();
        result.current.actions.toggleRevealedItem('item1');
        result.current.actions.updateLevelSettings({ level1: true });
      });

      // エクスポート
      const exportedState = result.current.utils.exportState();
      expect(typeof exportedState).toBe('string');

      // 状態をリセット
      act(() => {
        result.current.utils.reset();
      });

      // インポート
      let importSuccess: boolean;
      act(() => {
        importSuccess = result.current.utils.importState(exportedState);
      });
      expect(importSuccess!).toBe(true);

      expect(result.current.state.showAll).toBe(true);
      expect(result.current.state.revealedItems.has('item1')).toBe(true);
      expect(result.current.state.levelSettings.level1).toBe(true);
    });

    it('should handle invalid import data', () => {
      const { result } = renderHook(() => useRedaction());

      const importSuccess = result.current.utils.importState('invalid json');
      expect(importSuccess).toBe(false);

      const importSuccess2 = result.current.utils.importState('{"version": "2.0"}');
      expect(importSuccess2).toBe(false);
    });
  });

  describe('オプション', () => {
    it('should handle debug mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() => useRedaction({ debug: true }));

      act(() => {
        result.current.actions.toggleShowAll();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[useRedaction] Toggled show all'),
        undefined
      );

      consoleSpy.mockRestore();
    });

    it('should handle auto save', () => {
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        useRedaction({
          autoSave: true,
          fileId: 'test-file',
          autoSaveInterval: 1000
        })
      );

      // 状態を変更してdirtyにする
      act(() => {
        result.current.actions.toggleShowAll();
      });

      expect(result.current.state.isDirty).toBe(true);

      // タイマーを進める
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // TODO: 自動保存の実装後にテストを追加

      jest.useRealTimers();
    });
  });
});

describe('useRedactionElements', () => {
  it('should manage element visibility', () => {
    const { result } = renderHook(() => useRedactionElements(mockElements));

    expect(result.current.elements.all).toEqual(mockElements);
    expect(result.current.elements.visible).toHaveLength(0);
    expect(result.current.elements.hidden).toHaveLength(3);

    // 個別要素を表示
    act(() => {
      result.current.actions.toggleRevealedItem('element1');
    });

    expect(result.current.elements.visible).toHaveLength(1);
    expect(result.current.elements.hidden).toHaveLength(2);

    // レベルで表示
    act(() => {
      result.current.actions.updateLevelSettings({ level2: true });
    });

    expect(result.current.elements.visible).toHaveLength(2);
    expect(result.current.elements.hidden).toHaveLength(1);

    // 全表示
    act(() => {
      result.current.actions.toggleShowAll();
    });

    expect(result.current.elements.visible).toHaveLength(3);
    expect(result.current.elements.hidden).toHaveLength(0);
  });

  it('should calculate stats correctly', () => {
    const { result } = renderHook(() => useRedactionElements(mockElements));

    const stats = result.current.stats;

    expect(stats.totalElements).toBe(3);
    expect(stats.visibleElements).toBe(0);
    expect(stats.hiddenElements).toBe(3);
    expect(stats.levelCounts.level1).toBe(1);
    expect(stats.levelCounts.level2).toBe(1);
    expect(stats.levelCounts.level3).toBe(1);

    // 要素を表示
    act(() => {
      result.current.actions.toggleRevealedItem('element1');
    });

    const newStats = result.current.stats;
    expect(newStats.visibleElements).toBe(1);
    expect(newStats.hiddenElements).toBe(2);
  });
});
