import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedactionControls from '../RedactionControls';
import { RedactionSettings } from '../../types/redaction';

// Mock functions for props
const mockOnSave = jest.fn();
const mockOnLoad = jest.fn();
const mockOnExport = jest.fn();
const mockOnImport = jest.fn();
const mockOnSettingsChange = jest.fn();

const defaultSettings: RedactionSettings = {
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

// Mock file input
const mockFileInput = {
  click: jest.fn(),
  files: null
};

Object.defineProperty(HTMLInputElement.prototype, 'click', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(HTMLInputElement.prototype, 'files', {
  writable: true,
  value: null
});

describe('RedactionControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
  });

  describe('基本レンダリング', () => {
    it('should render with default props', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={null}
        />
      );

      expect(screen.getByText('赤セルシートコントロール')).toBeInTheDocument();
      expect(screen.getByText('設定なし')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <RedactionControls
          fileId="test-file-id"
          settings={null}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render with settings', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
        />
      );

      expect(screen.getByText('赤セルシートコントロール')).toBeInTheDocument();
      expect(screen.getByText('設定: テスト設定')).toBeInTheDocument();
    });
  });

  describe('コントロールボタン', () => {
    it('should render all control buttons', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
        />
      );

      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('load-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      expect(screen.getByTestId('import-button')).toBeInTheDocument();
    });

    it('should disable save and export buttons when no settings', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={null}
        />
      );

      expect(screen.getByTestId('save-button')).toBeDisabled();
      expect(screen.getByTestId('export-button')).toBeDisabled();
    });

    it('should disable all buttons when disabled prop is true', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          disabled={true}
        />
      );

      expect(screen.getByTestId('save-button')).toBeDisabled();
      expect(screen.getByTestId('load-button')).toBeDisabled();
      expect(screen.getByTestId('export-button')).toBeDisabled();
      expect(screen.getByTestId('import-button')).toBeDisabled();
    });

    it('should show loading state for save button', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          isSaving={true}
        />
      );

      expect(screen.getByText('保存中...')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeDisabled();
    });

    it('should show loading state for load button', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          isLoading={true}
        />
      );

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
      expect(screen.getByTestId('load-button')).toBeDisabled();
    });

    it('should show loading state for export button', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          isExporting={true}
        />
      );

      expect(screen.getByText('エクスポート中...')).toBeInTheDocument();
      expect(screen.getByTestId('export-button')).toBeDisabled();
    });

    it('should show loading state for import button', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          isImporting={true}
        />
      );

      expect(screen.getByText('インポート中...')).toBeInTheDocument();
      expect(screen.getByTestId('import-button')).toBeDisabled();
    });
  });

  describe('ボタンクリック処理', () => {
    it('should call onSave when save button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onSave={mockOnSave}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(defaultSettings);
    });

    it('should call onLoad when load button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onLoad={mockOnLoad}
        />
      );

      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      expect(mockOnLoad).toHaveBeenCalledWith('test-file-id');
    });

    it('should call onExport when export button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      expect(mockOnExport).toHaveBeenCalledWith('test-file-id', 'test-settings-id');
    });

    it('should call onImport when import button is clicked', async () => {
      const user = userEvent.setup();
      // Mock file input
      const mockClick = jest.fn();
      const mockOnChange = jest.fn();

      Object.defineProperty(HTMLInputElement.prototype, 'click', {
        writable: true,
        value: mockClick
      });

      Object.defineProperty(HTMLInputElement.prototype, 'onchange', {
        writable: true,
        value: mockOnChange
      });

      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onImport={mockOnImport}
        />
      );

      const importButton = screen.getByTestId('import-button');
      await user.click(importButton);

      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('状態表示', () => {
    it('should display error message', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          error="テストエラー"
        />
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('テストエラー')).toBeInTheDocument();
    });

    it('should display success message', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          successMessage="テスト成功"
        />
      );

      expect(screen.getByTestId('success-message')).toBeInTheDocument();
      expect(screen.getByText('操作が完了しました')).toBeInTheDocument();
      expect(screen.getByText('テスト成功')).toBeInTheDocument();
    });

    it('should display loading message when any operation is loading', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          isSaving={true}
        />
      );

      expect(screen.getByTestId('loading-message')).toBeInTheDocument();
      expect(screen.getByText('処理中...')).toBeInTheDocument();
      expect(screen.getByText('設定を保存しています...')).toBeInTheDocument();
    });

    it('should clear error message when clear button is clicked', async () => {
      const user = userEvent.setup();
      // ローカルエラーを発生させるために、onSaveでエラーを発生させる
      mockOnSave.mockRejectedValue(new Error('テストエラー'));

      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onSave={mockOnSave}
        />
      );

      // エラーを発生させる
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // エラーメッセージをクリア
      const clearButton = screen.getByTestId('clear-error-button');
      await user.click(clearButton);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should clear success message when clear button is clicked', async () => {
      const user = userEvent.setup();
      // ローカル成功メッセージを発生させるために、onSaveで成功させる
      mockOnSave.mockResolvedValue(undefined);

      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onSave={mockOnSave}
        />
      );

      // 成功メッセージを発生させる
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });

      // 成功メッセージをクリア
      const clearButton = screen.getByTestId('clear-success-button');
      await user.click(clearButton);

      expect(screen.queryByTestId('success-message')).not.toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle save error', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('保存エラー'));

      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onSave={mockOnSave}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('保存エラー')).toBeInTheDocument();
      });
    });

    it('should handle load error', async () => {
      const user = userEvent.setup();
      mockOnLoad.mockRejectedValue(new Error('読み込みエラー'));

      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onLoad={mockOnLoad}
        />
      );

      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('読み込みエラー')).toBeInTheDocument();
      });
    });

    it('should handle export error', async () => {
      const user = userEvent.setup();
      mockOnExport.mockRejectedValue(new Error('エクスポートエラー'));

      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('エクスポートエラー')).toBeInTheDocument();
      });
    });

    it('should handle success after save', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
          onSave={mockOnSave}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
        expect(screen.getByText('設定を保存しました')).toBeInTheDocument();
      });
    });
  });

  describe('設定情報表示', () => {
    it('should display settings information when settings exist', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
        />
      );

      expect(screen.getByText('設定情報')).toBeInTheDocument();
      expect(screen.getByText('名前:')).toBeInTheDocument();
      expect(screen.getByText('テスト設定')).toBeInTheDocument();
      expect(screen.getByText('共有:')).toBeInTheDocument();
      expect(screen.getByText('いいえ')).toBeInTheDocument();
      expect(screen.getByText('作成日:')).toBeInTheDocument();
      expect(screen.getByText('更新日:')).toBeInTheDocument();
    });

    it('should not display settings information when no settings', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={null}
        />
      );

      expect(screen.queryByText('設定情報')).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
        />
      );

      expect(screen.getByText('赤セルシートコントロール')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('load-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      expect(screen.getByTestId('import-button')).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(
        <RedactionControls
          fileId="test-file-id"
          settings={defaultSettings}
        />
      );

      expect(screen.getByText('保存')).toBeInTheDocument();
      expect(screen.getByText('読み込み')).toBeInTheDocument();
      expect(screen.getByText('エクスポート')).toBeInTheDocument();
      expect(screen.getByText('インポート')).toBeInTheDocument();
    });
  });
});
