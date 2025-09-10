/**
 * RedactionExportDialogコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedactionExportDialog from '../RedactionExportDialog';
import { RedactionSettings } from '../../types/redaction';

// モックデータ
const mockSettings: RedactionSettings[] = [
  {
    id: 'settings-1',
    file_id: 'file-1',
    name: 'Settings 1',
    is_shared: false,
    show_all: false,
    revealed_items: ['item1', 'item2'],
    level_settings: {
      level1: true,
      level2: false,
      level3: true
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 'settings-2',
    file_id: 'file-2',
    name: 'Settings 2',
    is_shared: true,
    show_all: true,
    revealed_items: ['item3'],
    level_settings: {
      level1: false,
      level2: true,
      level3: false
    },
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z'
  }
];

// モック関数
const mockOnClose = jest.fn();
const mockOnExport = jest.fn();
const mockOnImport = jest.fn();

describe('RedactionExportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('should not render when isOpen is false', () => {
      render(
        <RedactionExportDialog
          isOpen={false}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      expect(screen.queryByTestId('redaction-export-dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      expect(screen.getByTestId('redaction-export-dialog')).toBeInTheDocument();
      expect(screen.getByText('赤セルシート設定のエクスポート・インポート')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
          className="custom-class"
        />
      );

      const dialog = screen.getByTestId('redaction-export-dialog');
      expect(dialog).toHaveClass('custom-class');
    });

    it('should initialize with export tab active', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      expect(screen.getByTestId('export-tab')).toHaveClass('border-blue-500');
      expect(screen.getByTestId('import-tab')).toHaveClass('border-transparent');
    });
  });

  describe('タブ切り替え', () => {
    it('should switch to import tab when clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      const importTab = screen.getByTestId('import-tab');
      await user.click(importTab);

      expect(importTab).toHaveClass('border-blue-500');
      expect(screen.getByTestId('export-tab')).toHaveClass('border-transparent');
      expect(screen.getByText('ファイルから赤セルシート設定をインポートします。')).toBeInTheDocument();
    });

    it('should switch back to export tab when clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      await user.click(importTab);

      // エクスポートタブに戻る
      const exportTab = screen.getByTestId('export-tab');
      await user.click(exportTab);

      expect(exportTab).toHaveClass('border-blue-500');
      expect(importTab).toHaveClass('border-transparent');
      expect(screen.getByText('赤セルシート設定をファイルにエクスポートします。')).toBeInTheDocument();
    });

    it('should disable tabs when exporting', async () => {
      const user = userEvent.setup();
      mockOnExport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 設定を選択してエクスポート開始
      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      expect(screen.getByTestId('export-tab')).toBeDisabled();
      expect(screen.getByTestId('import-tab')).toBeDisabled();
    });
  });

  describe('エクスポート機能', () => {
    it('should display settings list', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      expect(screen.getByText('エクスポートする設定 (0/2)')).toBeInTheDocument();
      expect(screen.getByTestId('export-setting-settings-1')).toBeInTheDocument();
      expect(screen.getByTestId('export-setting-settings-2')).toBeInTheDocument();
    });

    it('should show empty state when no settings', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={[]}
        />
      );

      expect(screen.getByText('エクスポート可能な設定がありません')).toBeInTheDocument();
    });

    it('should toggle setting selection', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      expect(checkbox).toBeChecked();
      expect(screen.getByText('エクスポートする設定 (1/2)')).toBeInTheDocument();
    });

    it('should select all settings', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      const selectAllButton = screen.getByTestId('select-all-button');
      await user.click(selectAllButton);

      expect(screen.getByTestId('export-checkbox-settings-1')).toBeChecked();
      expect(screen.getByTestId('export-checkbox-settings-2')).toBeChecked();
      expect(screen.getByText('エクスポートする設定 (2/2)')).toBeInTheDocument();
    });

    it('should deselect all settings', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 全選択
      const selectAllButton = screen.getByTestId('select-all-button');
      await user.click(selectAllButton);

      // 全解除
      await user.click(selectAllButton);

      expect(screen.getByTestId('export-checkbox-settings-1')).not.toBeChecked();
      expect(screen.getByTestId('export-checkbox-settings-2')).not.toBeChecked();
      expect(screen.getByText('エクスポートする設定 (0/2)')).toBeInTheDocument();
    });

    it('should update export options', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // CSV形式に変更
      const csvRadio = screen.getByTestId('format-csv');
      await user.click(csvRadio);
      expect(csvRadio).toBeChecked();

      // ファイル名を変更
      const filenameInput = screen.getByTestId('export-filename');
      await user.type(filenameInput, '-custom');
      // 現在の日付に基づくファイル名を期待
      const expectedFilename = `redaction-settings-${new Date().toISOString().split('T')[0]}-custom`;
      expect(filenameInput).toHaveValue(expectedFilename);

      // メタデータを含めるを無効化
      const metadataCheckbox = screen.getByTestId('include-metadata');
      await user.click(metadataCheckbox);
      expect(metadataCheckbox).not.toBeChecked();

      // 圧縮を有効化
      const compressCheckbox = screen.getByTestId('compress-file');
      await user.click(compressCheckbox);
      expect(compressCheckbox).toBeChecked();
    });

    it('should call onExport with correct parameters', async () => {
      const user = userEvent.setup();
      mockOnExport.mockResolvedValue(undefined);

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 設定を選択
      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      // エクスポート設定を変更
      const csvRadio = screen.getByTestId('format-csv');
      await user.click(csvRadio);

      const metadataCheckbox = screen.getByTestId('include-metadata');
      await user.click(metadataCheckbox);

      // エクスポート実行
      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      expect(mockOnExport).toHaveBeenCalledWith(
        [mockSettings[0]],
        {
          format: 'csv',
          filename: `redaction-settings-${new Date().toISOString().split('T')[0]}`,
          includeMetadata: false,
          compress: false
        }
      );
    });

    it('should show loading state during export', async () => {
      const user = userEvent.setup();
      mockOnExport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 設定を選択
      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      // エクスポート実行
      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      expect(screen.getByText('エクスポート中...')).toBeInTheDocument();
      expect(exportButton).toBeDisabled();
    });

    it('should show success message after export', async () => {
      const user = userEvent.setup();
      mockOnExport.mockResolvedValue(undefined);

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 設定を選択
      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      // エクスポート実行
      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('1件の設定をエクスポートしました')).toBeInTheDocument();
      });
    });

    it('should show error when export fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'エクスポートに失敗しました';
      mockOnExport.mockRejectedValue(new Error(errorMessage));

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 設定を選択
      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      // エクスポート実行
      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should disable export button when no settings selected', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      const exportButton = screen.getByTestId('export-button');
      expect(exportButton).toBeDisabled();
    });

  });

  describe('インポート機能', () => {
    it('should display file upload area', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      expect(screen.getByText('インポートするファイル')).toBeInTheDocument();
      expect(screen.getByTestId('import-file-button')).toBeInTheDocument();
      expect(screen.getByText('ファイルを選択するか、ここにドラッグ&ドロップ')).toBeInTheDocument();
    });

    it('should validate file type', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      const fileInput = screen.getByTestId('import-file-input');

      // 無効なファイル形式を選択
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      expect(screen.getByText('JSONまたはCSVファイルを選択してください')).toBeInTheDocument();
    });

    it('should validate file size', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      const fileInput = screen.getByTestId('import-file-input');

      // 大きすぎるファイルを選択（11MB）
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      expect(screen.getByText('ファイルサイズが大きすぎます（10MB以下）')).toBeInTheDocument();
    });

    it('should call onImport with valid file', async () => {
      const user = userEvent.setup();
      mockOnImport.mockResolvedValue([mockSettings[0]]);

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      const fileInput = screen.getByTestId('import-file-input');
      const validFile = new File(['{"settings": []}'], 'test.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      const importButton = screen.getByTestId('import-button');
      await user.click(importButton);

      expect(mockOnImport).toHaveBeenCalledWith(validFile);
    });

    it('should show loading state during import', async () => {
      const user = userEvent.setup();
      mockOnImport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      const fileInput = screen.getByTestId('import-file-input');
      const validFile = new File(['{"settings": []}'], 'test.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      const importButton = screen.getByTestId('import-button');
      await user.click(importButton);

      expect(screen.getByText('インポート中...')).toBeInTheDocument();
      expect(importButton).toBeDisabled();
    });

    it('should show success message after import', async () => {
      const user = userEvent.setup();
      mockOnImport.mockResolvedValue([mockSettings[0]]);

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      const fileInput = screen.getByTestId('import-file-input');
      const validFile = new File(['{"settings": []}'], 'test.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      const importButton = screen.getByTestId('import-button');
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('1件の設定をインポートしました')).toBeInTheDocument();
      });
    });

    it('should show error when import fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'インポートに失敗しました';
      mockOnImport.mockRejectedValue(new Error(errorMessage));

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      const fileInput = screen.getByTestId('import-file-input');
      const validFile = new File(['{"settings": []}'], 'test.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      const importButton = screen.getByTestId('import-button');
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should disable import button when no file selected', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      const importButton = screen.getByTestId('import-button');
      expect(importButton).toBeDisabled();
    });

  });

  describe('キャンセル機能', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      const closeButton = screen.getByTestId('close-button');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      const overlay = screen.getByTestId('redaction-export-dialog').firstChild as HTMLElement;
      await user.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when exporting', async () => {
      const user = userEvent.setup();
      mockOnExport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 設定を選択してエクスポート開始
      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      // キャンセルボタンが無効化されていることを確認
      const cancelButton = screen.getByTestId('cancel-button');
      expect(cancelButton).toBeDisabled();

      const closeButton = screen.getByTestId('close-button');
      expect(closeButton).toBeDisabled();
    });
  });

  describe('キーボードショートカット', () => {
    it('should close dialog on Escape key', async () => {
      const user = userEvent.setup();

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // ダイアログにフォーカスを当てる
      const dialog = screen.getByTestId('redaction-export-dialog');
      dialog.focus();

      // Escapeキーを押す
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close on Escape when exporting', async () => {
      const user = userEvent.setup();
      mockOnExport.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 設定を選択してエクスポート開始
      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      // ダイアログにフォーカスを当てる
      const dialog = screen.getByTestId('redaction-export-dialog');
      dialog.focus();

      // Escapeキーを押す
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
    });

    it('should have proper labels', () => {
      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      expect(screen.getByLabelText('ファイル名')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle export function throwing non-Error object', async () => {
      const user = userEvent.setup();
      mockOnExport.mockRejectedValue('String error');

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // 設定を選択
      const checkbox = screen.getByTestId('export-checkbox-settings-1');
      await user.click(checkbox);

      // エクスポート実行
      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('エクスポートに失敗しました')).toBeInTheDocument();
      });
    });

    it('should handle import function throwing non-Error object', async () => {
      const user = userEvent.setup();
      mockOnImport.mockRejectedValue('String error');

      render(
        <RedactionExportDialog
          isOpen={true}
          onClose={mockOnClose}
          onExport={mockOnExport}
          onImport={mockOnImport}
          settings={mockSettings}
        />
      );

      // インポートタブに切り替え
      const importTab = screen.getByTestId('import-tab');
      fireEvent.click(importTab);

      const fileInput = screen.getByTestId('import-file-input');
      const validFile = new File(['{"settings": []}'], 'test.json', { type: 'application/json' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      const importButton = screen.getByTestId('import-button');
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('インポートに失敗しました')).toBeInTheDocument();
      });
    });
  });
});
