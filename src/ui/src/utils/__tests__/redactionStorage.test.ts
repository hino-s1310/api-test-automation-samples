/**
 * 赤セルシートストレージユーティリティのテスト
 */

import {
  saveRedactionSettings,
  loadRedactionSettings,
  removeRedactionSettings,
  saveRedactionState,
  loadRedactionState,
  saveDraftSettings,
  loadDraftSettings,
  saveSettingsHistory,
  loadSettingsHistory,
  exportSettings,
  importSettings,
  getStorageUsage,
  cleanupStorage
} from '../redactionStorage';
import { RedactionSettings, RedactionSettingsCreateRequest } from '../../types/redaction';

// localStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('RedactionStorage', () => {
  const mockSettings: RedactionSettings = {
    id: '1',
    file_id: 'file_123',
    user_id: 'user_456',
    name: 'Test Settings',
    description: 'Test description',
    show_all: false,
    level_settings: { level1: false, level2: true },
    revealed_items: ['item1', 'item2'],
    is_shared: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveRedactionSettings', () => {
    it('should save settings to localStorage', () => {
      const result = saveRedactionSettings('file_123', mockSettings);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'redaction_settings_file_123',
        expect.stringContaining('"settings"')
      );
    });

    it('should handle save errors', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = saveRedactionSettings('file_123', mockSettings);
      expect(result).toBe(false);
    });
  });

  describe('loadRedactionSettings', () => {
    it('should load settings from localStorage', () => {
      const mockData = {
        settings: mockSettings,
        timestamp: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      const result = loadRedactionSettings('file_123');

      expect(result).toEqual(mockSettings);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('redaction_settings_file_123');
    });

    it('should return null when no data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = loadRedactionSettings('file_123');
      expect(result).toBeNull();
    });

    it('should handle expired data', () => {
      const mockData = {
        settings: mockSettings,
        timestamp: Date.now(),
        expiration: Date.now() - 1000 // 1秒前
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      const result = loadRedactionSettings('file_123');

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('removeRedactionSettings', () => {
    it('should remove settings from localStorage', () => {
      const result = removeRedactionSettings('file_123');

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('redaction_settings_file_123');
    });
  });

  describe('saveRedactionState', () => {
    it('should save state to localStorage', () => {
      const state = { showAll: true, revealedItems: new Set(['item1']) };
      const result = saveRedactionState('file_123', state);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'redaction_state_file_123',
        expect.stringContaining('"state"')
      );
    });
  });

  describe('loadRedactionState', () => {
    it('should load state from localStorage', () => {
      const mockData = {
        state: { showAll: true },
        timestamp: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      const result = loadRedactionState('file_123');

      expect(result).toEqual({ showAll: true });
    });
  });

  describe('saveDraftSettings', () => {
    it('should save draft settings', () => {
      const draft: RedactionSettingsCreateRequest = {
        name: 'Draft Settings',
        description: 'Draft description'
      };
      const result = saveDraftSettings('file_123', draft);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'redaction_draft_file_123',
        expect.stringContaining('"draft"')
      );
    });
  });

  describe('loadDraftSettings', () => {
    it('should load draft settings', () => {
      const mockData = {
        draft: { name: 'Draft Settings' },
        timestamp: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      const result = loadDraftSettings('file_123');

      expect(result).toEqual({ name: 'Draft Settings' });
    });
  });

  describe('saveSettingsHistory', () => {
    it('should save settings history', () => {
      const result = saveSettingsHistory('file_123', mockSettings);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'redaction_history_file_123',
        expect.stringContaining('"history"')
      );
    });
  });

  describe('loadSettingsHistory', () => {
    it('should load settings history', () => {
      const mockData = {
        history: [
          { settings: mockSettings, timestamp: Date.now(), id: 'history_1' }
        ],
        timestamp: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      const result = loadSettingsHistory('file_123');

      expect(result).toHaveLength(1);
      expect(result![0].settings).toEqual(mockSettings);
    });
  });

  describe('exportSettings', () => {
    it('should export settings as JSON', () => {
      const result = exportSettings(mockSettings);
      const parsed = JSON.parse(result);

      expect(parsed.version).toBe('1.0');
      expect(parsed.settings).toEqual(mockSettings);
      expect(parsed.metadata.format).toBe('json');
    });
  });

  describe('importSettings', () => {
    it('should import settings from JSON', () => {
      const exportData = exportSettings(mockSettings);
      const result = importSettings(exportData);

      expect(result).toEqual(mockSettings);
    });

    it('should handle invalid import data', () => {
      const result = importSettings('invalid json');
      expect(result).toBeNull();
    });

    it('should handle unsupported version', () => {
      const invalidData = {
        version: '2.0',
        settings: mockSettings
      };
      const result = importSettings(JSON.stringify(invalidData));
      expect(result).toBeNull();
    });
  });

  describe('getStorageUsage', () => {
    it('should calculate storage usage', () => {
      localStorageMock.length = 10;
      localStorageMock.key.mockImplementation((index) => `key${index}`);
      localStorageMock.getItem.mockImplementation((key) => 'x'.repeat(100));

      const result = getStorageUsage();

      expect(result.used).toBeGreaterThan(0);
      expect(result.available).toBe(5 * 1024 * 1024); // 5MB
      expect(result.percentage).toBeGreaterThan(0);
    });
  });

  describe('cleanupStorage', () => {
    it('should cleanup expired data', () => {
      localStorageMock.length = 3;
      localStorageMock.key.mockImplementation((index) => `redaction_key${index}`);
      localStorageMock.getItem.mockImplementation((key) => {
        const mockData = {
          timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8日前
          expiration: Date.now() - 1000 // 1秒前
        };
        return JSON.stringify(mockData);
      });

      const result = cleanupStorage({ removeExpired: true });

      expect(result).toBeGreaterThan(0);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should cleanup old data', () => {
      localStorageMock.length = 2;
      localStorageMock.key.mockImplementation((index) => `redaction_key${index}`);
      localStorageMock.getItem.mockImplementation((key) => {
        const mockData = {
          timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000 // 8日前
        };
        return JSON.stringify(mockData);
      });

      const result = cleanupStorage({ olderThan: 7 * 24 * 60 * 60 * 1000 });

      expect(result).toBeGreaterThan(0);
    });
  });
});
