import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileEditModal from '@/components/FileEditModal';
import { FileInfo } from '@/types';

// モック関数
const mockOnSave = jest.fn();
const mockOnClose = jest.fn();

// テスト用のファイルデータ
const mockFile: FileInfo = {
  id: 'test-file-id',
  filename: 'test-file.md',
  markdown: '# Test Content\n\nThis is test content.',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('FileEditModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when isOpen is true and file is provided', () => {
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    expect(screen.getByTestId('file-edit-modal')).toBeInTheDocument();
    expect(screen.getByText('ファイル編集: test-file.md')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <FileEditModal
        isOpen={false}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    expect(screen.queryByTestId('file-edit-modal')).not.toBeInTheDocument();
  });

  it('does not render when file is null', () => {
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={null}
        onSave={mockOnSave}
        loading={false}
      />
    );

    expect(screen.queryByTestId('file-edit-modal')).not.toBeInTheDocument();
  });

  it('displays file information correctly', () => {
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    expect(screen.getByText(/ファイルID:/)).toBeInTheDocument();
    expect(screen.getByText(/作成日時:/)).toBeInTheDocument();
  });

  it('populates form fields with file data', () => {
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    const filenameInput = screen.getByTestId('edit-filename-input');
    const contentTextarea = screen.getByTestId('edit-content-input');

    expect(filenameInput).toHaveValue('test-file.md');
    expect(contentTextarea).toHaveValue('# Test Content\n\nThis is test content.');
  });

  it('handles filename input changes', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    const filenameInput = screen.getByTestId('edit-filename-input');
    await user.clear(filenameInput);
    await user.type(filenameInput, 'new-filename.md');

    expect(filenameInput).toHaveValue('new-filename.md');
  });

  it('handles content input changes', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    const contentTextarea = screen.getByTestId('edit-content-input');
    await user.clear(contentTextarea);
    await user.type(contentTextarea, '# New Content\n\nUpdated content.');

    expect(contentTextarea).toHaveValue('# New Content\n\nUpdated content.');
  });

  it('handles edit reason input changes', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    const reasonInput = screen.getByTestId('edit-reason-input');
    await user.type(reasonInput, 'Content improvement');

    expect(reasonInput).toHaveValue('Content improvement');
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // 必須フィールドをクリア
    const filenameInput = screen.getByTestId('edit-filename-input');
    const contentTextarea = screen.getByTestId('edit-content-input');
    const reasonInput = screen.getByTestId('edit-reason-input');

    await user.clear(filenameInput);
    await user.clear(contentTextarea);
    await user.clear(reasonInput);

    // 保存ボタンをクリック
    const saveButton = screen.getByTestId('edit-modal-save-button');
    await user.click(saveButton);

    // バリデーションエラーが表示されることを確認
    expect(screen.getByText('ファイル名は必須です')).toBeInTheDocument();
    expect(screen.getByText('内容は必須です')).toBeInTheDocument();
    expect(screen.getByText('編集理由は必須です')).toBeInTheDocument();
  });

  it('calls onSave with correct data when form is valid', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // ファイル名を変更
    const filenameInput = screen.getByTestId('edit-filename-input');
    await user.clear(filenameInput);
    await user.type(filenameInput, 'new-filename.md');

    // 編集理由を入力
    const reasonInput = screen.getByTestId('edit-reason-input');
    await user.type(reasonInput, 'Content improvement');

    // 保存ボタンをクリック
    const saveButton = screen.getByTestId('edit-modal-save-button');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      'test-file-id',
      'new-filename.md',
      '# Test Content\n\nThis is test content.',
      'Content improvement'
    );
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    const cancelButton = screen.getByTestId('edit-modal-cancel-button');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button (X) is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    const closeButton = screen.getByTestId('edit-modal-close-button');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state correctly', () => {
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={true}
      />
    );

    const saveButton = screen.getByTestId('edit-modal-save-button');
    expect(saveButton).toHaveTextContent('保存中');
    expect(saveButton).toBeDisabled();

    const cancelButton = screen.getByTestId('edit-modal-cancel-button');
    expect(cancelButton).toBeDisabled();
  });

  it('prevents closing when loading', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={true}
      />
    );

    const closeButton = screen.getByTestId('edit-modal-close-button');
    await user.click(closeButton);

    // ローディング中は閉じることができない
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('handles form submission with modified content', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // ファイル名と内容を変更
    const filenameInput = screen.getByTestId('edit-filename-input');
    const contentTextarea = screen.getByTestId('edit-content-input');
    const reasonInput = screen.getByTestId('edit-reason-input');

    await user.clear(filenameInput);
    await user.type(filenameInput, 'updated-file.md');
    await user.clear(contentTextarea);
    await user.type(contentTextarea, '# Updated Content\n\nNew content here.');
    await user.type(reasonInput, 'Major content update');

    // 保存ボタンをクリック
    const saveButton = screen.getByTestId('edit-modal-save-button');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      'test-file-id',
      'updated-file.md',
      '# Updated Content\n\nNew content here.',
      'Major content update'
    );
  });

  it('maintains accessibility attributes', () => {
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // ラベルとフォーム要素の関連付け
    const filenameInput = screen.getByTestId('edit-filename-input');
    const contentTextarea = screen.getByTestId('edit-content-input');
    const reasonInput = screen.getByTestId('edit-reason-input');

    expect(filenameInput).toHaveAttribute('id', 'edit-filename');
    expect(contentTextarea).toHaveAttribute('id', 'edit-content');
    expect(reasonInput).toHaveAttribute('id', 'edit-reason');
  });

  it('shows error styling for invalid fields', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // 必須フィールドをクリア
    const filenameInput = screen.getByTestId('edit-filename-input');
    await user.clear(filenameInput);

    // 保存ボタンをクリック
    const saveButton = screen.getByTestId('edit-modal-save-button');
    await user.click(saveButton);

    // エラー状態のスタイリングを確認
    expect(filenameInput).toHaveClass('border-red-300');
  });

  it('赤セルシートタブが表示される', () => {
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // 赤セルシートタブが表示されることを確認
    expect(screen.getByTestId('redacted-tab')).toBeInTheDocument();
    expect(screen.getByText('赤セルシート')).toBeInTheDocument();
  });

  it('赤セルシートタブをクリックすると赤セルシート表示に切り替わる', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // 赤セルシートタブをクリック
    const redactedTab = screen.getByTestId('redacted-tab');
    await user.click(redactedTab);

    // 赤セルシート表示が表示されることを確認
    expect(screen.getByText('赤セルシート表示')).toBeInTheDocument();
    expect(screen.getByText('表示制御')).toBeInTheDocument();
  });

  it('赤セルシートタブで設定ボタンが表示される', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // 赤セルシートタブをクリック
    const redactedTab = screen.getByTestId('redacted-tab');
    await user.click(redactedTab);

    // 設定ボタンが表示されることを確認
    expect(screen.getByTestId('redaction-settings-button')).toBeInTheDocument();
    expect(screen.getByTestId('redaction-controls-button')).toBeInTheDocument();
  });

  it('赤セルシート設定ボタンをクリックすると設定パネルが表示される', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // 赤セルシートタブをクリック
    const redactedTab = screen.getByTestId('redacted-tab');
    await user.click(redactedTab);

    // 設定ボタンをクリック
    const settingsButton = screen.getByTestId('redaction-settings-button');
    await user.click(settingsButton);

    // 設定パネルが表示されることを確認
    expect(screen.getByText('詳細設定')).toBeInTheDocument();
    expect(screen.getByText('設定を閉じる')).toBeInTheDocument();
  });

  it('赤セルシートコントロールボタンをクリックするとコントロールパネルが表示される', async () => {
    const user = userEvent.setup();
    render(
      <FileEditModal
        isOpen={true}
        onClose={mockOnClose}
        file={mockFile}
        onSave={mockOnSave}
        loading={false}
      />
    );

    // 赤セルシートタブをクリック
    const redactedTab = screen.getByTestId('redacted-tab');
    await user.click(redactedTab);

    // コントロールボタンをクリック
    const controlsButton = screen.getByTestId('redaction-controls-button');
    await user.click(controlsButton);

    // コントロールパネルが表示されることを確認
    expect(screen.getByText('設定管理')).toBeInTheDocument();
    expect(screen.getByText('コントロールを閉じる')).toBeInTheDocument();
  });
});
