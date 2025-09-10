/**
 * RedactionLoadDialogコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedactionLoadDialog from '../RedactionLoadDialog';
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
  },
  {
    id: 'test-settings',
    file_id: 'test-file',
    name: 'Test Settings',
    is_shared: false,
    show_all: false,
    revealed_items: [],
    level_settings: {
      level1: true,
      level2: true,
      level3: false
    },
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z'
  }
];

// モック関数
const mockOnClose = jest.fn();
const mockOnLoad = jest.fn();
const mockOnDelete = jest.fn();

describe('RedactionLoadDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('should not render when isOpen is false', () => {
      render(
        <RedactionLoadDialog
          isOpen={false}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      expect(screen.queryByTestId('redaction-load-dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      expect(screen.getByTestId('redaction-load-dialog')).toBeInTheDocument();
      expect(screen.getByText('赤セルシート設定の読み込み')).toBeInTheDocument();
      expect(screen.getByText('保存済みの赤セルシート設定から選択して読み込みます。')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
          className="custom-class"
        />
      );

      const dialog = screen.getByTestId('redaction-load-dialog');
      expect(dialog).toHaveClass('custom-class');
    });
  });

  describe('設定一覧表示', () => {
    it('should display all settings', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      expect(screen.getByText('保存済み設定 (3件)')).toBeInTheDocument();
      expect(screen.getByTestId('setting-item-settings-1')).toBeInTheDocument();
      expect(screen.getByTestId('setting-item-settings-2')).toBeInTheDocument();
      expect(screen.getByTestId('setting-item-test-settings')).toBeInTheDocument();
    });

    it('should display setting information', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定IDの表示
      expect(screen.getByText('settings-1')).toBeInTheDocument();
      expect(screen.getByText('settings-2')).toBeInTheDocument();

      // ファイルIDの表示
      expect(screen.getByText('ファイルID: file-1')).toBeInTheDocument();
      expect(screen.getByText('ファイルID: file-2')).toBeInTheDocument();

      // 設定詳細の表示（より具体的なセレクターを使用）
      const settingItem1 = screen.getByTestId('setting-item-settings-1');
      const settingItem2 = screen.getByTestId('setting-item-settings-2');

      expect(settingItem1).toHaveTextContent('全表示: OFF');
      expect(settingItem1).toHaveTextContent('表示項目: 2件');
      expect(settingItem2).toHaveTextContent('全表示: ON');
      expect(settingItem2).toHaveTextContent('表示項目: 1件');
    });

    it('should show empty state when no settings', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={[]}
          fileId="test-file-id"
        />
      );

      expect(screen.getByText('保存済み設定 (0件)')).toBeInTheDocument();
      expect(screen.getByText('保存済みの設定がありません')).toBeInTheDocument();
    });
  });

  describe('検索・フィルタ機能', () => {
    it('should filter settings by search query', async () => {
      const user = userEvent.setup();

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');

      expect(screen.getByText('保存済み設定 (1件)')).toBeInTheDocument();
      expect(screen.getByTestId('setting-item-test-settings')).toBeInTheDocument();
      expect(screen.queryByTestId('setting-item-settings-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('setting-item-settings-2')).not.toBeInTheDocument();
    });

    it('should filter settings by file ID', async () => {
      const user = userEvent.setup();

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'file-1');

      expect(screen.getByText('保存済み設定 (1件)')).toBeInTheDocument();
      expect(screen.getByTestId('setting-item-settings-1')).toBeInTheDocument();
    });

    it('should show no results message when no matches', async () => {
      const user = userEvent.setup();

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('保存済み設定 (0件)')).toBeInTheDocument();
      expect(screen.getByText('検索条件に一致する設定が見つかりません')).toBeInTheDocument();
    });

    it('should clear selection when search query changes', async () => {
      const user = userEvent.setup();

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      expect(screen.getByText('選択中')).toBeInTheDocument();

      // 検索クエリを変更
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');

      expect(screen.queryByText('選択中')).not.toBeInTheDocument();
    });
  });

  describe('設定選択', () => {
    it('should select setting when clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      expect(screen.getByText('選択中')).toBeInTheDocument();
      expect(settingItem).toHaveClass('bg-blue-50');
    });

    it('should change selection when different setting is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 最初の設定を選択
      const settingItem1 = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem1);

      expect(screen.getByText('選択中')).toBeInTheDocument();

      // 別の設定を選択
      const settingItem2 = screen.getByTestId('setting-item-settings-2');
      await user.click(settingItem2);

      // 選択状態が更新される
      expect(settingItem2).toHaveClass('bg-blue-50');
    });
  });

  describe('読み込み機能', () => {
    it('should call onLoad with selected setting', async () => {
      const user = userEvent.setup();
      mockOnLoad.mockResolvedValue(undefined);

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      // 読み込みボタンをクリック
      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      expect(mockOnLoad).toHaveBeenCalledWith(mockSettings[0]);
    });

    it('should show loading state during load', async () => {
      const user = userEvent.setup();
      mockOnLoad.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      // 読み込みボタンをクリック
      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
      expect(loadButton).toBeDisabled();
    });

    it('should call onClose after successful load', async () => {
      const user = userEvent.setup();
      mockOnLoad.mockResolvedValue(undefined);

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      // 読み込みボタンをクリック
      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle load error', async () => {
      const user = userEvent.setup();
      const errorMessage = '読み込みに失敗しました';
      mockOnLoad.mockClear(); // モックをリセット
      mockOnLoad.mockRejectedValue(new Error(errorMessage));
      mockOnClose.mockClear(); // モックをリセット

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      // 読み込みボタンをクリック
      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // エラー処理が完了するまで少し待機
      await new Promise(resolve => setTimeout(resolve, 100));

      // エラーが発生した場合、onCloseは呼び出されない
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should disable load button when no setting is selected', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const loadButton = screen.getByTestId('load-button');
      expect(loadButton).toBeDisabled();
    });
  });

  describe('削除機能', () => {
    it('should show delete button when onDelete is provided', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          onDelete={mockOnDelete}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      expect(screen.getByTestId('delete-button-settings-1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button-settings-2')).toBeInTheDocument();
    });

    it('should not show delete button when onDelete is not provided', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      expect(screen.queryByTestId('delete-button-settings-1')).not.toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue(undefined);

      // confirmをモック
      window.confirm = jest.fn(() => true);

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          onDelete={mockOnDelete}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const deleteButton = screen.getByTestId('delete-button-settings-1');
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('この設定を削除しますか？この操作は元に戻せません。');
      expect(mockOnDelete).toHaveBeenCalledWith('settings-1');
    });

    it('should not call onDelete when user cancels confirmation', async () => {
      const user = userEvent.setup();

      // confirmをモック（falseを返す）
      window.confirm = jest.fn(() => false);

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          onDelete={mockOnDelete}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const deleteButton = screen.getByTestId('delete-button-settings-1');
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      const user = userEvent.setup();
      const errorMessage = '削除に失敗しました';
      mockOnDelete.mockRejectedValue(new Error(errorMessage));

      // confirmをモック
      window.confirm = jest.fn(() => true);

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          onDelete={mockOnDelete}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const deleteButton = screen.getByTestId('delete-button-settings-1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should prevent event propagation when delete button is clicked', async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue(undefined);

      // confirmをモック
      window.confirm = jest.fn(() => true);

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          onDelete={mockOnDelete}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const settingItem = screen.getByTestId('setting-item-settings-1');
      const deleteButton = screen.getByTestId('delete-button-settings-1');

      // 削除ボタンをクリック
      await user.click(deleteButton);

      // 設定が選択されていないことを確認（イベント伝播が止まっている）
      expect(screen.queryByText('選択中')).not.toBeInTheDocument();
    });
  });

  describe('キャンセル機能', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
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
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
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
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );
      const overlay = screen.getByTestId('redaction-load-dialog').firstChild as HTMLElement;
      await user.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when loading', async () => {
      const user = userEvent.setup();
      mockOnLoad.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択して読み込み開始
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

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
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // ダイアログにフォーカスを当てる
      const dialog = screen.getByTestId('redaction-load-dialog');
      dialog.focus();

      // Escapeキーを押す
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should load on Ctrl+Enter when setting is selected', async () => {
      const user = userEvent.setup();
      mockOnLoad.mockResolvedValue(undefined);

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      // ダイアログにフォーカスを当てる
      const dialog = screen.getByTestId('redaction-load-dialog');
      dialog.focus();

      // Ctrl+Enterキーを押す
      fireEvent.keyDown(dialog, { key: 'Enter', ctrlKey: true });

      expect(mockOnLoad).toHaveBeenCalled();
    });

    it('should not close on Escape when loading', async () => {
      const user = userEvent.setup();
      mockOnLoad.mockClear(); // モックをリセット
      mockOnLoad.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockOnClose.mockClear(); // モックをリセット

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択して読み込み開始
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      // ローディング状態になるまで少し待機
      await waitFor(() => {
        expect(loadButton).toBeDisabled();
      });

      // ダイアログにフォーカスを当てる
      const dialog = screen.getByTestId('redaction-load-dialog');
      dialog.focus();

      // ローディング中にEscapeキーを押す
      fireEvent.keyDown(dialog, { key: 'Escape' });

      // ローディング中はEscapeキーでダイアログが閉じられない
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
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
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      expect(screen.getByLabelText('検索')).toBeInTheDocument();
    });

    it('should disable load button when no setting is selected', () => {
      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const loadButton = screen.getByTestId('load-button');
      expect(loadButton).toBeDisabled();
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle load function throwing non-Error object', async () => {
      const user = userEvent.setup();
      mockOnLoad.mockRejectedValue('String error');

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      // 設定を選択
      const settingItem = screen.getByTestId('setting-item-settings-1');
      await user.click(settingItem);

      // 読み込みボタンをクリック
      const loadButton = screen.getByTestId('load-button');
      await user.click(loadButton);

      await waitFor(() => {
        expect(screen.getByText('読み込みに失敗しました')).toBeInTheDocument();
      });
    });

    it('should handle delete function throwing non-Error object', async () => {
      const user = userEvent.setup();
      mockOnDelete.mockRejectedValue('String error');

      // confirmをモック
      window.confirm = jest.fn(() => true);

      render(
        <RedactionLoadDialog
          isOpen={true}
          onClose={mockOnClose}
          onLoad={mockOnLoad}
          onDelete={mockOnDelete}
          settings={mockSettings}
          fileId="test-file-id"
        />
      );

      const deleteButton = screen.getByTestId('delete-button-settings-1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('削除に失敗しました')).toBeInTheDocument();
      });
    });
  });
});
