import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileSearchFilter from '@/components/FileSearchFilter';

// モック関数
const mockOnSearch = jest.fn();
const mockOnReset = jest.fn();

describe('FileSearchFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form elements correctly', () => {
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    // 検索クエリ入力フィールド
    expect(screen.getByLabelText('検索')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ファイル名で検索...')).toBeInTheDocument();

    // ステータスフィルター
    expect(screen.getByLabelText('ステータス')).toBeInTheDocument();
    const statusSelect = screen.getByTestId('status-filter-select');
    expect(statusSelect).toHaveValue('');

    // 編集状態フィルター
    expect(screen.getByLabelText('編集状態')).toBeInTheDocument();
    const editStateSelect = screen.getByTestId('edited-filter-select');
    expect(editStateSelect).toHaveValue('all');

    // ボタン
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'リセット' })).toBeInTheDocument();
  });

  it('handles search query input correctly', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    const searchInput = screen.getByLabelText('検索');
    await user.type(searchInput, 'test file');

    expect(searchInput).toHaveValue('test file');
  });

  it('handles status filter selection correctly', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    const statusSelect = screen.getByLabelText('ステータス');
    await user.selectOptions(statusSelect, 'completed');

    expect(statusSelect).toHaveValue('completed');
  });

  it('handles edit state filter selection correctly', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    const editStateSelect = screen.getByLabelText('編集状態');
    await user.selectOptions(editStateSelect, 'true');

    expect(editStateSelect).toHaveValue('true');
  });

  it('calls onSearch with correct parameters when search button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    // 検索条件を設定
    const searchInput = screen.getByLabelText('検索');
    const statusSelect = screen.getByLabelText('ステータス');
    const editStateSelect = screen.getByLabelText('編集状態');

    await user.type(searchInput, 'test file');
    await user.selectOptions(statusSelect, 'completed');
    await user.selectOptions(editStateSelect, 'true');

    // 検索ボタンをクリック
    const searchButton = screen.getByRole('button', { name: '検索' });
    await user.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('test file', 'completed', true);
  });

  it('calls onSearch with correct parameters when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    const searchInput = screen.getByLabelText('検索');
    await user.type(searchInput, 'test file');
    await user.keyboard('{Enter}');

    expect(mockOnSearch).toHaveBeenCalledWith('test file', '', null);
  });

  it('calls onReset when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    const resetButton = screen.getByRole('button', { name: 'リセット' });
    await user.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('resets form fields when reset is called', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    // フォームに値を入力
    const searchInput = screen.getByLabelText('検索');
    const statusSelect = screen.getByLabelText('ステータス');
    const editStateSelect = screen.getByLabelText('編集状態');

    await user.type(searchInput, 'test file');
    await user.selectOptions(statusSelect, 'completed');
    await user.selectOptions(editStateSelect, 'true');

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: 'リセット' });
    await user.click(resetButton);

    // フォームがリセットされることを確認
    expect(searchInput).toHaveValue('');
    expect(statusSelect).toHaveValue('');
    expect(editStateSelect).toHaveValue('all');
  });

  it('shows loading state correctly', () => {
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={true}
      />
    );

    const searchButton = screen.getByRole('button', { name: /検索中/ });
    expect(searchButton).toBeInTheDocument();
    expect(searchButton).toBeDisabled();

    const resetButton = screen.getByRole('button', { name: 'リセット' });
    expect(resetButton).toBeDisabled();
  });

  it('handles empty search query correctly', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    const searchButton = screen.getByRole('button', { name: '検索' });
    await user.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('', '', null);
  });

  it('handles all filter combinations correctly', async () => {
    const user = userEvent.setup();
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    // すべてのフィルターを設定
    const searchInput = screen.getByLabelText('検索');
    const statusSelect = screen.getByLabelText('ステータス');
    const editStateSelect = screen.getByLabelText('編集状態');

    await user.type(searchInput, 'document');
    await user.selectOptions(statusSelect, 'failed');
    await user.selectOptions(editStateSelect, 'false');

    const searchButton = screen.getByRole('button', { name: '検索' });
    await user.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('document', 'failed', false);
  });

  it('maintains accessibility attributes', () => {
    render(
      <FileSearchFilter
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        loading={false}
      />
    );

    // ラベルとフォーム要素の関連付け
    const searchInput = screen.getByLabelText('検索');
    const statusSelect = screen.getByLabelText('ステータス');
    const editStateSelect = screen.getByLabelText('編集状態');

    expect(searchInput).toHaveAttribute('id', 'search-query');
    expect(statusSelect).toHaveAttribute('id', 'status-filter');
    expect(editStateSelect).toHaveAttribute('id', 'edited-filter');
  });
});
