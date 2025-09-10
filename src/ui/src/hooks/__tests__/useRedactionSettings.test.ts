/**
 * useRedactionSettingsフックのテスト
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRedactionSettings } from '../useRedactionSettings';
import { RedactionSettings, RedactionSettingsCreateRequest } from '../../types/redaction';
import * as redactionStorage from '../../utils/redactionStorage';

// モックデータ
const mockSettings: RedactionSettings = {
  id: 'settings-1',
  file_id: 'file-123',
  user_id: 'user-456',
  name: 'Test Settings',
  description: 'Test description',
  show_all: false,
  revealed_items: ['item1', 'item2'],
  level_settings: {
    level1: true,
    level2: false,
    level3: true
  },
  is_shared: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockSettingsRequest: RedactionSettingsCreateRequest = {
  name: 'Test Settings',
  description: 'Test description',
  show_all: false,
  revealed_items: ['item1', 'item2'],
  level_settings: {
    level1: true,
    level2: false,
    level3: true
  }
};

// fetch のモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

// localStorage のモック
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// redactionStorage のモック
jest.mock('../../utils/redactionStorage', () => ({
  saveRedactionSettings: jest.fn(),
  loadRedactionSettings: jest.fn(),
  removeRedactionSettings: jest.fn(),
  exportSettings: jest.fn(),
  importSettings: jest.fn(),
  getStorageUsage: jest.fn()
}));

describe('useRedactionSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();

    // redactionStorage のモックを設定
    (redactionStorage.saveRedactionSettings as jest.Mock).mockResolvedValue(true);
    (redactionStorage.loadRedactionSettings as jest.Mock).mockResolvedValue(mockSettings);
    (redactionStorage.removeRedactionSettings as jest.Mock).mockResolvedValue(true);
    (redactionStorage.getStorageUsage as jest.Mock).mockReturnValue({
      used: 1024,
      available: 5 * 1024 * 1024,
      percentage: 0.02
    });
  });

  describe('初期状態', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      expect(result.current.state.currentSettings).toBeNull();
      expect(result.current.state.settingsList).toEqual([]);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isSaving).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.lastUpdated).toBeNull();
      expect(result.current.state.isDirty).toBe(false);
      expect(result.current.state.validationErrors).toEqual([]);
    });

    it('should initialize with custom options', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({
          fileId: 'test-file',
          userId: 'test-user',
          autoSave: true,
          autoSaveInterval: 1000,
          debug: true,
          apiBaseUrl: '/custom-api'
        })
      );

      expect(result.current.state.currentSettings).toBeNull();
      expect(result.current.utils.isValid).toBe(true);
    });
  });

  describe('設定の読み込み', () => {
    it('should load settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockSettings })
      });

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      await act(async () => {
        await result.current.actions.loadSettings('settings-1');
      });

      await waitFor(() => {
        expect(result.current.state.currentSettings).toEqual(mockSettings);
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.error).toBeNull();
        expect(result.current.state.lastUpdated).toBeGreaterThan(0);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/redaction-settings/settings-1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-ID': 'test-user'
          })
        })
      );
    });

    it('should load settings list successfully', async () => {
      const mockList = [mockSettings];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockList })
      });

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      await act(async () => {
        await result.current.actions.loadSettingsList();
      });

      await waitFor(() => {
        expect(result.current.state.settingsList).toEqual(mockList);
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.error).toBeNull();
      });
    });

    it('should handle load settings error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      await act(async () => {
        await result.current.actions.loadSettings('settings-1');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBe('Network error');
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.currentSettings).toBeNull();
      });
    });
  });

  describe('設定の保存・更新', () => {
    it('should save settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockSettings })
      });

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let savedSettings: RedactionSettings | null = null;
      await act(async () => {
        savedSettings = await result.current.actions.saveSettings(mockSettingsRequest);
      });

      await waitFor(() => {
        expect(savedSettings).toEqual(mockSettings);
        expect(result.current.state.isSaving).toBe(false);
        expect(result.current.state.error).toBeNull();
        expect(result.current.state.isDirty).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/files/test-file/redaction-settings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-User-ID': 'test-user'
          }),
          body: JSON.stringify(mockSettingsRequest)
        })
      );
    });

    it('should update settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockSettings })
      });

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let updatedSettings: RedactionSettings | null = null;
      await act(async () => {
        updatedSettings = await result.current.actions.updateSettings('settings-1', mockSettingsRequest);
      });

      await waitFor(() => {
        expect(updatedSettings).toEqual(mockSettings);
        expect(result.current.state.isSaving).toBe(false);
        expect(result.current.state.error).toBeNull();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/redaction-settings/settings-1',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'X-User-ID': 'test-user'
          }),
          body: JSON.stringify(mockSettingsRequest)
        })
      );
    });

    it('should handle save settings error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let savedSettings: RedactionSettings | null = null;
      await act(async () => {
        savedSettings = await result.current.actions.saveSettings(mockSettingsRequest);
      });

      await waitFor(() => {
        expect(savedSettings).toBeNull();
        expect(result.current.state.error).toBe('Save failed');
        expect(result.current.state.isSaving).toBe(false);
      });
    });
  });

  describe('設定の削除', () => {
    it('should delete settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let deleteResult = false;
      await act(async () => {
        deleteResult = await result.current.actions.deleteSettings('settings-1');
      });

      await waitFor(() => {
        expect(deleteResult).toBe(true);
        expect(result.current.state.isSaving).toBe(false);
        expect(result.current.state.error).toBeNull();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/redaction-settings/settings-1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'X-User-ID': 'test-user'
          })
        })
      );
    });

    it('should handle delete settings error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let deleteResult = false;
      await act(async () => {
        deleteResult = await result.current.actions.deleteSettings('settings-1');
      });

      await waitFor(() => {
        expect(deleteResult).toBe(false);
        expect(result.current.state.error).toBe('Delete failed');
        expect(result.current.state.isSaving).toBe(false);
      });
    });
  });

  describe('設定のインポート・エクスポート', () => {
    it('should export settings successfully', async () => {
      const mockExportData = '{"settings": "exported"}';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings_data: mockExportData })
      });

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let exportData: string | null = null;
      await act(async () => {
        exportData = await result.current.actions.exportSettings('settings-1', 'json');
      });

      await waitFor(() => {
        expect(exportData).toBe(mockExportData);
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.error).toBeNull();
      });
    });

    it('should import settings successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockSettings })
      });

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let importedSettings: RedactionSettings | null = null;
      await act(async () => {
        importedSettings = await result.current.actions.importSettings('{"settings": "data"}', 'json');
      });

      await waitFor(() => {
        expect(importedSettings).toEqual(mockSettings);
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.error).toBeNull();
      });
    });
  });

  describe('バリデーション', () => {
    it('should validate settings correctly', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      act(() => {
        const errors = result.current.actions.validateSettings(mockSettingsRequest);
        expect(errors).toEqual([]);
      });

      expect(result.current.state.validationErrors).toEqual([]);
    });

    it('should detect validation errors', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      const invalidSettings: RedactionSettingsCreateRequest = {
        name: '', // 空の設定名
        description: 'test',
        show_all: 'invalid' as any, // 無効な型
        revealed_items: [123 as any], // 無効な型
        level_settings: {
          invalidLevel: true // 無効なレベル
        }
      };

      act(() => {
        const errors = result.current.actions.validateSettings(invalidSettings);
        expect(errors.length).toBeGreaterThan(0);
      });

      expect(result.current.state.validationErrors.length).toBeGreaterThan(0);
    });

    it('should prevent saving invalid settings', async () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      const invalidSettings: RedactionSettingsCreateRequest = {
        name: '', // 無効な設定名
        description: 'test',
        show_all: false,
        revealed_items: [],
        level_settings: { level1: false, level2: false, level3: false }
      };

      let savedSettings: RedactionSettings | null = null;
      await act(async () => {
        savedSettings = await result.current.actions.saveSettings(invalidSettings);
      });

      await waitFor(() => {
        expect(savedSettings).toBeNull();
        expect(result.current.state.error).toContain('バリデーションエラー');
        expect(result.current.state.validationErrors.length).toBeGreaterThan(0);
      });

      // fetch は呼ばれない
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('ローカルストレージ操作', () => {
    it('should save to localStorage successfully', async () => {
      mockLocalStorage.setItem.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let saveResult = false;
      await act(async () => {
        saveResult = await result.current.actions.saveToLocalStorage(mockSettings);
      });

      expect(saveResult).toBe(true);
    });

    it('should load from localStorage successfully', async () => {
      mockLocalStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockSettings));

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let loadedSettings: RedactionSettings | null = null;
      await act(async () => {
        loadedSettings = await result.current.actions.loadFromLocalStorage();
      });

      expect(loadedSettings).toEqual(mockSettings);
    });

    it('should clear localStorage successfully', async () => {
      mockLocalStorage.removeItem.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      let clearResult = false;
      await act(async () => {
        clearResult = await result.current.actions.clearLocalStorage();
      });

      expect(clearResult).toBe(true);
    });
  });

  describe('状態管理', () => {
    it('should set current settings', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      act(() => {
        result.current.actions.setCurrentSettings(mockSettings);
      });

      expect(result.current.state.currentSettings).toEqual(mockSettings);
      expect(result.current.state.isDirty).toBe(false);
    });

    it('should set dirty state', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      act(() => {
        result.current.actions.setDirty(true);
      });

      expect(result.current.state.isDirty).toBe(true);
    });

    it('should set and clear error', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      act(() => {
        result.current.actions.setError('Test error');
      });

      expect(result.current.state.error).toBe('Test error');

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBeNull();
      expect(result.current.state.validationErrors).toEqual([]);
    });
  });

  describe('ユーティリティ関数', () => {
    it('should check if settings are valid', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      expect(result.current.utils.isValid).toBe(true);

      act(() => {
        result.current.actions.setError('Test error');
      });

      expect(result.current.utils.isValid).toBe(false);
    });

    it('should get storage usage', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      const usage = result.current.utils.getStorageUsage();
      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('available');
      expect(usage).toHaveProperty('percentage');
    });

    it('should reset state', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      // 状態を変更
      act(() => {
        result.current.actions.setCurrentSettings(mockSettings);
        result.current.actions.setDirty(true);
        result.current.actions.setError('Test error');
      });

      // リセット
      act(() => {
        result.current.utils.reset();
      });

      expect(result.current.state.currentSettings).toBeNull();
      expect(result.current.state.isDirty).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should get diff between current and new settings', () => {
      const { result } = renderHook(() =>
        useRedactionSettings({ fileId: 'test-file', userId: 'test-user' })
      );

      // 現在の設定を設定
      act(() => {
        result.current.actions.setCurrentSettings(mockSettings);
      });

      const newSettings: RedactionSettingsCreateRequest = {
        name: 'Updated Settings',
        description: 'Updated description',
        show_all: true, // 変更
        revealed_items: ['item1', 'item2', 'item3'], // 変更
        level_settings: {
          level1: true,
          level2: false,
          level3: true
        }
      };

      const diff = result.current.utils.getDiff(newSettings);
      expect(diff).toHaveProperty('show_all', true);
      expect(diff).toHaveProperty('revealed_items', ['item1', 'item2', 'item3']);
    });
  });

  describe('自動保存', () => {
    it('should auto-save when dirty', async () => {
      jest.useFakeTimers();
      mockLocalStorage.setItem.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useRedactionSettings({
          fileId: 'test-file',
          userId: 'test-user',
          autoSave: true,
          autoSaveInterval: 1000
        })
      );

      // 設定を設定してdirtyにする
      act(() => {
        result.current.actions.setCurrentSettings(mockSettings);
        result.current.actions.setDirty(true);
      });

      // タイマーを進める
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.state.isDirty).toBe(false);
      });

      jest.useRealTimers();
    });
  });
});
