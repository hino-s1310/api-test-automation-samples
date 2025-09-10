/**
 * 赤セルシート型定義のテスト
 * 型の整合性とバリデーションをテスト
 */

import {
  RedactionLevel,
  RedactionLevelInfo,
  RedactionSettings,
  RedactionSettingsCreateRequest,
  RedactionSettingsUpdateRequest,
  RedactionState,
  RedactionActions,
  RedactionElement,
  RedactionParseResult,
  REDACTION_LEVELS,
  DEFAULT_REDACTION_SETTINGS,
  REDACTION_REGEX
} from '../redaction';

describe('Redaction Types', () => {
  describe('RedactionLevel', () => {
    it('should have correct level values', () => {
      const levels: RedactionLevel[] = ['level1', 'level2', 'level3'];
      expect(levels).toHaveLength(3);
      expect(levels).toContain('level1');
      expect(levels).toContain('level2');
      expect(levels).toContain('level3');
    });
  });

  describe('REDACTION_LEVELS', () => {
    it('should have all required levels', () => {
      expect(REDACTION_LEVELS).toHaveProperty('level1');
      expect(REDACTION_LEVELS).toHaveProperty('level2');
      expect(REDACTION_LEVELS).toHaveProperty('level3');
    });

    it('should have correct level info structure', () => {
      const level1 = REDACTION_LEVELS.level1;
      expect(level1).toHaveProperty('level', 'level1');
      expect(level1).toHaveProperty('label');
      expect(level1).toHaveProperty('description');
      expect(level1).toHaveProperty('color');
      expect(level1).toHaveProperty('icon');
    });

    it('should have unique colors for each level', () => {
      const colors = Object.values(REDACTION_LEVELS).map(level => level.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('RedactionSettings', () => {
    const mockSettings: RedactionSettings = {
      id: '1',
      file_id: 'file_123',
      user_id: 'user_456',
      name: 'Test Settings',
      description: 'Test description',
      show_all: false,
      level_settings: { level1: false, level2: true, level3: false },
      revealed_items: ['item1', 'item2'],
      is_shared: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should have all required properties', () => {
      expect(mockSettings).toHaveProperty('id');
      expect(mockSettings).toHaveProperty('file_id');
      expect(mockSettings).toHaveProperty('name');
      expect(mockSettings).toHaveProperty('show_all');
      expect(mockSettings).toHaveProperty('level_settings');
      expect(mockSettings).toHaveProperty('revealed_items');
      expect(mockSettings).toHaveProperty('is_shared');
      expect(mockSettings).toHaveProperty('created_at');
      expect(mockSettings).toHaveProperty('updated_at');
    });

    it('should have correct types', () => {
      expect(typeof mockSettings.id).toBe('string');
      expect(typeof mockSettings.file_id).toBe('string');
      expect(typeof mockSettings.name).toBe('string');
      expect(typeof mockSettings.show_all).toBe('boolean');
      expect(typeof mockSettings.level_settings).toBe('object');
      expect(Array.isArray(mockSettings.revealed_items)).toBe(true);
      expect(typeof mockSettings.is_shared).toBe('boolean');
    });
  });

  describe('RedactionSettingsCreateRequest', () => {
    const mockCreateRequest: RedactionSettingsCreateRequest = {
      name: 'New Settings',
      description: 'New description',
      show_all: true,
      level_settings: { level1: true, level2: false, level3: true },
      revealed_items: ['new_item'],
      is_shared: true
    };

    it('should have optional properties', () => {
      expect(mockCreateRequest.name).toBeDefined();
      expect(mockCreateRequest.description).toBeDefined();
      expect(mockCreateRequest.show_all).toBeDefined();
      expect(mockCreateRequest.level_settings).toBeDefined();
      expect(mockCreateRequest.revealed_items).toBeDefined();
      expect(mockCreateRequest.is_shared).toBeDefined();
    });
  });

  describe('RedactionState', () => {
    const mockState: RedactionState = {
      settings: null,
      isLoading: false,
      error: null,
      showAll: false,
      revealedItems: new Set(['item1']),
      levelSettings: { level1: false, level2: true },
      isDirty: false,
      isEditing: false,
      isSaving: false,
      isSettingsModalOpen: false,
      isExportModalOpen: false,
      isImportModalOpen: false
    };

    it('should have all required state properties', () => {
      expect(mockState).toHaveProperty('settings');
      expect(mockState).toHaveProperty('isLoading');
      expect(mockState).toHaveProperty('error');
      expect(mockState).toHaveProperty('showAll');
      expect(mockState).toHaveProperty('revealedItems');
      expect(mockState).toHaveProperty('levelSettings');
      expect(mockState).toHaveProperty('isDirty');
      expect(mockState).toHaveProperty('isEditing');
      expect(mockState).toHaveProperty('isSaving');
      expect(mockState).toHaveProperty('isSettingsModalOpen');
      expect(mockState).toHaveProperty('isExportModalOpen');
      expect(mockState).toHaveProperty('isImportModalOpen');
    });

    it('should have correct types for state properties', () => {
      expect(typeof mockState.isLoading).toBe('boolean');
      expect(typeof mockState.error).toBe('object'); // null
      expect(typeof mockState.showAll).toBe('boolean');
      expect(mockState.revealedItems).toBeInstanceOf(Set);
      expect(typeof mockState.levelSettings).toBe('object');
      expect(typeof mockState.isDirty).toBe('boolean');
      expect(typeof mockState.isEditing).toBe('boolean');
      expect(typeof mockState.isSaving).toBe('boolean');
    });
  });

  describe('RedactionElement', () => {
    const mockElement: RedactionElement = {
      id: 'elem_1',
      type: 'redacted',
      level: 'level1',
      content: '機密情報',
      originalText: '[REDACTED:level1:機密情報]',
      position: { start: 0, end: 25 },
      isVisible: false
    };

    it('should have all required element properties', () => {
      expect(mockElement).toHaveProperty('id');
      expect(mockElement).toHaveProperty('type');
      expect(mockElement).toHaveProperty('level');
      expect(mockElement).toHaveProperty('content');
      expect(mockElement).toHaveProperty('originalText');
      expect(mockElement).toHaveProperty('position');
      expect(mockElement).toHaveProperty('isVisible');
    });

    it('should have correct position structure', () => {
      expect(mockElement.position).toHaveProperty('start');
      expect(mockElement.position).toHaveProperty('end');
      expect(typeof mockElement.position.start).toBe('number');
      expect(typeof mockElement.position.end).toBe('number');
    });
  });

  describe('DEFAULT_REDACTION_SETTINGS', () => {
    it('should have default values', () => {
      expect(DEFAULT_REDACTION_SETTINGS.show_all).toBe(false);
      expect(DEFAULT_REDACTION_SETTINGS.level_settings).toBeDefined();
      expect(DEFAULT_REDACTION_SETTINGS.revealed_items).toEqual([]);
      expect(DEFAULT_REDACTION_SETTINGS.is_shared).toBe(false);
    });

    it('should have default level settings for all levels', () => {
      const levelSettings = DEFAULT_REDACTION_SETTINGS.level_settings;
      expect(levelSettings).toHaveProperty('level1', false);
      expect(levelSettings).toHaveProperty('level2', false);
      expect(levelSettings).toHaveProperty('level3', false);
    });
  });

  describe('REDACTION_REGEX', () => {
    it('should match full redaction syntax', () => {
      const text = '[REDACTED:level1:機密情報]';
      const matches = text.match(REDACTION_REGEX.full);
      expect(matches).toBeTruthy();
      expect(matches![0]).toBe('[REDACTED:level1:機密情報]');
    });

    it('should match simple redaction syntax', () => {
      const text = '[REDACTED:機密情報]';
      const matches = text.match(REDACTION_REGEX.simple);
      expect(matches).toBeTruthy();
      expect(matches![0]).toBe('[REDACTED:機密情報]');
    });

    it('should extract level from redaction syntax', () => {
      const text = '[REDACTED:level2:一般機密]';
      const match = text.match(REDACTION_REGEX.level);
      expect(match).toBeTruthy();
      expect(match![1]).toBe('level2');
    });

    it('should extract content from redaction syntax', () => {
      const text = '[REDACTED:level3:内部限定]';
      const match = text.match(REDACTION_REGEX.content);
      expect(match).toBeTruthy();
      expect(match![1]).toBe('内部限定');
    });
  });

  describe('Type compatibility', () => {
    it('should be compatible with backend API types', () => {
      // バックエンドの型と互換性があることを確認
      const backendResponse = {
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

      // TypeScriptの型チェックで互換性を確認
      const frontendSettings: RedactionSettings = backendResponse;
      expect(frontendSettings).toBeDefined();
    });
  });
});
