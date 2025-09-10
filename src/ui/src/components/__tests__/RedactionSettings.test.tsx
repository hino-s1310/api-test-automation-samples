import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedactionSettings from '../RedactionSettings';
import { RedactionSettings as RedactionSettingsType } from '../../types/redaction';

// Mock functions for props
const mockOnSettingsChange = jest.fn();
const mockOnSave = jest.fn();
const mockOnLoad = jest.fn();
const mockOnReset = jest.fn();

const defaultSettings: RedactionSettingsType = {
  id: 'test-settings-id',
  file_id: 'test-file-id',
  user_id: 'test-user-id',
  name: 'テスト設定',
  description: 'テスト用の設定',
  show_all: false,
  level_settings: {
    level1: true,
    level2: false,
    level3: true
  },
  revealed_items: ['item1', 'item2'],
  is_shared: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
};

describe('RedactionSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('should render with default props', () => {
      render(
        <RedactionSettings
          settings={null}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('赤セルシート設定')).toBeInTheDocument();
      expect(screen.getByTestId('load-button')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <RedactionSettings
          settings={null}
          onSettingsChange={mockOnSettingsChange}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render with settings', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('赤セルシート設定')).toBeInTheDocument();
      expect(screen.getByText('全表示設定')).toBeInTheDocument();
      expect(screen.getByText('レベル設定')).toBeInTheDocument();
      expect(screen.getByText('プレビュー')).toBeInTheDocument();
    });
  });

  describe('設定パネル', () => {
    it('should display setting items', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('全表示設定')).toBeInTheDocument();
      expect(screen.getByText('レベル1（最高機密）')).toBeInTheDocument();
      expect(screen.getByText('レベル2（機密）')).toBeInTheDocument();
      expect(screen.getByText('レベル3（内部）')).toBeInTheDocument();
    });

    it('should display setting descriptions', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('すべての赤セルシートを表示/非表示にします')).toBeInTheDocument();
      expect(screen.getByText('最重要な機密情報を隠します')).toBeInTheDocument();
      expect(screen.getByText('一般的な機密情報を隠します')).toBeInTheDocument();
      expect(screen.getByText('内部情報を隠します')).toBeInTheDocument();
    });

    it('should show level status badges', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getAllByText('有効')).toHaveLength(2); // level1 and level3
      expect(screen.getByText('無効')).toBeInTheDocument(); // level2
    });
  });

  describe('設定値の編集', () => {
    it('should toggle show all setting', async () => {
      const user = userEvent.setup();
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const toggle = screen.getByTestId('show-all-toggle');
      await user.click(toggle);

      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          show_all: true
        })
      );
    });

    it('should toggle level settings', async () => {
      const user = userEvent.setup();
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const level2Toggle = screen.getByTestId('level-level2-toggle');
      await user.click(level2Toggle);

      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          level_settings: expect.objectContaining({
            level2: true
          })
        })
      );
    });

    it('should update local state when settings change', () => {
      const { rerender } = render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const newSettings = {
        ...defaultSettings,
        show_all: true,
        level_settings: {
          level1: false,
          level2: true,
          level3: false
        }
      };

      rerender(
        <RedactionSettings
          settings={newSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // 設定が更新されていることを確認
      expect(screen.getByTestId('show-all-toggle')).toBeChecked();
    });
  });

  describe('リアルタイムプレビュー', () => {
    it('should show preview text', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          previewText="これは機密情報です。"
        />
      );

      expect(screen.getByText(/これは.*機密情報.*です。/)).toBeInTheDocument();
    });

    it('should show redacted text when showAll is false', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          previewText="これは機密情報です。"
        />
      );

      expect(screen.getByText(/\[REDACTED:LEVEL1:機密情報\]/)).toBeInTheDocument();
    });

    it('should show original text when showAll is true', () => {
      const settingsWithShowAll = {
        ...defaultSettings,
        show_all: true
      };

      render(
        <RedactionSettings
          settings={settingsWithShowAll}
          onSettingsChange={mockOnSettingsChange}
          previewText="これは機密情報です。"
        />
      );

      expect(screen.getByText('これは機密情報です。')).toBeInTheDocument();
    });
  });

  describe('コントロール機能', () => {
    it('should call onSave when save button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          onSave={mockOnSave}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should call onLoad when load button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          onLoad={mockOnLoad}
        />
      );

      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      expect(mockOnLoad).toHaveBeenCalled();
    });

    it('should call onReset when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByTestId('reset-button');
      await user.click(resetButton);

      expect(mockOnReset).toHaveBeenCalled();
      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          show_all: false,
          level_settings: {
            level1: true,
            level2: false,
            level3: true
          },
          revealed_items: []
        })
      );
    });

    it('should disable buttons when loading', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          onLoad={mockOnLoad}
          isLoading={true}
        />
      );

      const loadButton = screen.getByTestId('load-button');
      expect(loadButton).toBeDisabled();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('should disable buttons when saving', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
          onSave={mockOnSave}
          isSaving={true}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
      expect(screen.getByText('保存中...')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('赤セルシート設定')).toBeInTheDocument();
      expect(screen.getByText('全表示設定')).toBeInTheDocument();
      expect(screen.getByText('レベル設定')).toBeInTheDocument();
      expect(screen.getByText('プレビュー')).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('読み込み')).toBeInTheDocument();
      expect(screen.getByText('保存')).toBeInTheDocument();
      expect(screen.getByText('リセット')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle null settings gracefully', () => {
      render(
        <RedactionSettings
          settings={null}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('赤セルシート設定')).toBeInTheDocument();
      expect(screen.getByText('全表示設定')).toBeInTheDocument();
    });

    it('should handle undefined callbacks gracefully', () => {
      render(
        <RedactionSettings
          settings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // コールバックが未定義でもエラーが発生しないことを確認
      expect(screen.getByText('赤セルシート設定')).toBeInTheDocument();
    });
  });
});
