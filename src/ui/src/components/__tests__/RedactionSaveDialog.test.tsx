/**
 * RedactionSaveDialogコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedactionSaveDialog, { SaveDialogData } from '../RedactionSaveDialog';
import { RedactionSettings } from '../../types/redaction';

// モックデータ
const mockRedactionSettings: RedactionSettings = {
  id: 'test-settings-id',
  file_id: 'test-file-id',
  name: 'Test Settings',
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
};

// モック関数
const mockOnClose = jest.fn();
const mockOnSave = jest.fn();

describe('RedactionSaveDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('should not render when isOpen is false', () => {
      render(
        <RedactionSaveDialog
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      expect(screen.queryByTestId('redaction-save-dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      expect(screen.getByTestId('redaction-save-dialog')).toBeInTheDocument();
      expect(screen.getByText('赤セルシート設定の保存')).toBeInTheDocument();
      expect(screen.getByText('現在の赤セルシート設定を保存します。設定名と説明を入力してください。')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
          className="custom-class"
        />
      );

      const dialog = screen.getByTestId('redaction-save-dialog');
      expect(dialog).toHaveClass('custom-class');
    });
  });

  describe('フォーム要素', () => {
    it('should render form inputs', () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('description-input')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('close-button')).toBeInTheDocument();
    });

    it('should show character counts', () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      expect(screen.getByText('0/50文字')).toBeInTheDocument();
      expect(screen.getByText('11/200文字')).toBeInTheDocument();
    });

    it('should initialize with default values', () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
          currentSettings={mockRedactionSettings}
        />
      );

      const nameInput = screen.getByTestId('name-input') as HTMLInputElement;
      const descriptionInput = screen.getByTestId('description-input') as HTMLTextAreaElement;

      expect(nameInput.value).toContain('設定_');
      expect(descriptionInput.value).toBe('既存設定の更新');
    });
  });

  describe('フォーム入力', () => {
    it('should update name input', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'テスト設定');

      expect(nameInput).toHaveValue('テスト設定');
      expect(screen.getByText('5/50文字')).toBeInTheDocument();
    });

    it('should update description input', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const descriptionInput = screen.getByTestId('description-input');
      await user.type(descriptionInput, 'テスト用の説明');

      expect(descriptionInput).toHaveValue('新しい赤セルシート設定テスト用の説明');
      expect(screen.getByText('18/200文字')).toBeInTheDocument();
    });

    it('should clear errors when input changes', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      // フォーム送信でエラーを発生させる
      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(screen.getByText('設定名を入力してください')).toBeInTheDocument();

      // 名前を入力してエラーをクリア
      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'テスト');

      expect(screen.queryByText('設定名を入力してください')).not.toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    it('should show error for empty name', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      // 保存ボタンは無効化されているので、フォーム送信でテスト
      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(screen.getByText('設定名を入力してください')).toBeInTheDocument();
    });

    it('should show error for name too short', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'a');

      // フォーム送信でテスト
      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(screen.getByText('設定名は2文字以上で入力してください')).toBeInTheDocument();
    });

    it('should show error for name too long', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      // maxLengthを無視して直接値を設定
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(51) } });

      // 保存ボタンをクリックしてバリデーションを実行
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(screen.getByText('設定名は50文字以内で入力してください')).toBeInTheDocument();
    });

    it('should show error for description too long', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      // まず名前を入力して保存ボタンを有効にする
      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'テスト設定');

      const descriptionInput = screen.getByTestId('description-input');
      // maxLengthを無視して直接値を設定
      fireEvent.change(descriptionInput, { target: { value: 'a'.repeat(201) } });

      // 保存ボタンをクリックしてバリデーションを実行
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(screen.getByText('説明は200文字以内で入力してください')).toBeInTheDocument();
    });

    it('should show error for missing fileId', async () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId=""
        />
      );

      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'テスト設定' } });

      // フォーム送信でテスト
      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(screen.getByText('ファイルIDが指定されていません')).toBeInTheDocument();
    });
  });

  describe('保存機能', () => {
    it('should call onSave with correct data', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      const descriptionInput = screen.getByTestId('description-input');

      await user.type(nameInput, 'テスト設定');
      await user.type(descriptionInput, 'テスト用の説明');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        name: 'テスト設定',
        description: '新しい赤セルシート設定テスト用の説明',
        fileId: 'test-file-id'
      });
    });

    it('should show loading state during save', async () => {
      const user = userEvent.setup();
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'テスト設定');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(screen.getByText('保存中...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });


    it('should call onClose after successful save', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'テスト設定');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('キャンセル機能', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const closeButton = screen.getByTestId('close-button');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );
      const overlay = screen.getByTestId('redaction-save-dialog').firstChild as HTMLElement;
      await user.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when saving', async () => {
      const user = userEvent.setup();
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'テスト設定');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

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
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      // ダイアログにフォーカスを当てる
      const dialog = screen.getByTestId('redaction-save-dialog');
      dialog.focus();

      // Escapeキーを押す
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should save on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'テスト設定');

      // ダイアログにフォーカスを当てる
      const dialog = screen.getByTestId('redaction-save-dialog');
      dialog.focus();

      // Ctrl+Enterキーを押す
      fireEvent.keyDown(dialog, { key: 'Enter', ctrlKey: true });

      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
    });

    it('should have proper labels', () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      expect(screen.getByLabelText('設定名 *')).toBeInTheDocument();
      expect(screen.getByLabelText('説明')).toBeInTheDocument();
    });

    it('should disable save button when name is empty', () => {
      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle save function throwing non-Error object', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue('String error');

      render(
        <RedactionSaveDialog
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          fileId="test-file-id"
        />
      );

      const nameInput = screen.getByTestId('name-input');
      await user.type(nameInput, 'テスト設定');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('保存に失敗しました')).toBeInTheDocument();
      });
    });
  });
});
