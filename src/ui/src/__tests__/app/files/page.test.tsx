import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilesPage from '../../../app/files/page';

// APIモック
jest.mock('../../../lib/api', () => ({
  api: {
    getFileList: jest.fn(),
    getFile: jest.fn(),
    deleteFile: jest.fn(),
    searchFiles: jest.fn(),
    editFile: jest.fn(),
    uploadPdf: jest.fn(),
  }
}));

import { api } from '../../../lib/api';
const mockApi = api as jest.Mocked<typeof api>;

// フックモック
jest.mock('@/hooks/useFileListPagination', () => ({
  useFileListPagination: () => ({
    itemsPerPage: 10,
  }),
}));

// テスト用のファイルデータ
const mockFiles = {
  files: [
    {
      id: 'test-file-1',
      filename: 'test1.pdf',
      markdown: '# Test 1',
      status: 'completed' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      file_size: 1024,
      processing_time: 1.5,
    },
    {
      id: 'test-file-2',
      filename: 'test2.pdf',
      markdown: '# Test 2',
      status: 'processing' as const,
      created_at: '2024-01-01T01:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      file_size: 2048,
      processing_time: null,
    },
  ],
  total_count: 2,
  page: 1,
  per_page: 10,
};

const mockFileDetail = {
  id: 'test-file-1',
  filename: 'test1.pdf',
  markdown: '# Test 1',
  status: 'completed' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  file_size: 1024,
  processing_time: 1.5,
};

describe('FilesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // デフォルトのAPIモック
    mockApi.getFileList.mockResolvedValue(mockFiles);
    mockApi.getFile.mockResolvedValue(mockFileDetail);
    mockApi.deleteFile.mockResolvedValue({ message: 'File deleted' });
    mockApi.searchFiles.mockResolvedValue(mockFiles);
    mockApi.editFile.mockResolvedValue(mockFileDetail);
  });

  it('renders files page with title and description', async () => {
    render(<FilesPage />);

    expect(screen.getByText('ファイル一覧')).toBeInTheDocument();
    expect(screen.getByText('変換済みのPDFファイル一覧を表示します。')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<FilesPage />);

    expect(screen.getByTestId('files-page-loading')).toBeInTheDocument();
    expect(screen.getByText('ファイル一覧を読み込んでいます...')).toBeInTheDocument();
  });

  it('displays files after loading', async () => {
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    expect(screen.getByText('test2.pdf')).toBeInTheDocument();
    expect(screen.getByText('ファイル一覧（2件）')).toBeInTheDocument();
  });

  it('displays search filter component', async () => {
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('file-search-filter')).toBeInTheDocument();
    expect(screen.getByLabelText('検索')).toBeInTheDocument();
    expect(screen.getByLabelText('ステータス')).toBeInTheDocument();
    expect(screen.getByLabelText('編集状態')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // 検索条件を設定
    const searchInput = screen.getByLabelText('検索');
    const statusSelect = screen.getByLabelText('ステータス');
    const editStateSelect = screen.getByLabelText('編集状態');

    await user.type(searchInput, 'test');
    await user.selectOptions(statusSelect, 'completed');
    await user.selectOptions(editStateSelect, 'true');

    // 検索ボタンをクリック
    const searchButton = screen.getByRole('button', { name: '検索' });
    await user.click(searchButton);

    expect(mockApi.searchFiles).toHaveBeenCalledWith({
      query: 'test',
      status: 'completed',
      is_edited: true,
      page: 1,
      per_page: 10,
    });
  });

  it('handles search reset functionality', async () => {
    const user = userEvent.setup();
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: 'リセット' });
    await user.click(resetButton);

    // ファイル一覧が再取得されることを確認
    expect(mockApi.getFileList).toHaveBeenCalledWith(1, 10);
  });

  it('handles file view functionality', async () => {
    const user = userEvent.setup();
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // 完了済みファイルの行をクリック
    const completedFileRow = screen.getByRole('button', { name: /test1.pdfの詳細を表示/ });
    await user.click(completedFileRow);

    expect(mockApi.getFile).toHaveBeenCalledWith('test-file-1');
  });

  it('handles file edit functionality', async () => {
    const user = userEvent.setup();
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // 編集ボタンをクリック
    const editButton = screen.getByRole('button', { name: /test1.pdfを編集/ });
    await user.click(editButton);

    expect(mockApi.getFile).toHaveBeenCalledWith('test-file-1');
  });

  it('handles file deletion functionality', async () => {
    const user = userEvent.setup();

    // confirmダイアログをモック
    global.confirm = jest.fn(() => true);

    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // 削除ボタンをクリック
    const deleteButton = screen.getByRole('button', { name: /test1.pdfを削除/ });
    await user.click(deleteButton);

    expect(global.confirm).toHaveBeenCalledWith('このファイルを削除してもよろしいですか？');
    expect(mockApi.deleteFile).toHaveBeenCalledWith('test-file-1');
  });

  it('handles file edit save functionality', async () => {
    const user = userEvent.setup();
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // 編集ボタンをクリック
    const editButton = screen.getByRole('button', { name: /test1.pdfを編集/ });
    await user.click(editButton);

    // 編集モーダルが表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('file-edit-modal')).toBeInTheDocument();
    });

    // 編集理由を入力
    const reasonInput = screen.getByTestId('edit-reason-input');
    await user.type(reasonInput, 'Content improvement');

    // 保存ボタンをクリック
    const saveButton = screen.getByTestId('edit-modal-save-button');
    await user.click(saveButton);

    expect(mockApi.editFile).toHaveBeenCalledWith('test-file-1', {
      filename: 'test1.pdf',
      markdown_content: '# Test 1',
      edit_reason: 'Content improvement',
      edited_by: 'user',
    });
  });

  it('shows error message when API calls fail', async () => {
    mockApi.getFileList.mockRejectedValue(new Error('API Error'));

    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    const user = userEvent.setup();
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // 更新ボタンをクリック
    const refreshButton = screen.getByRole('button', { name: '更新' });
    await user.click(refreshButton);

    expect(mockApi.getFileList).toHaveBeenCalledWith(1, 10);
  });

  it('displays pagination when there are many files', async () => {
    const manyFiles = {
      ...mockFiles,
      total_count: 25,
      per_page: 10,
    };

    mockApi.getFileList.mockResolvedValue(manyFiles);

    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // ページネーションが表示されることを確認
    expect(screen.getByText('ファイル一覧（25件）')).toBeInTheDocument();
  });

  it('handles empty files state', async () => {
    const emptyFiles = {
      files: [],
      total_count: 0,
      page: 1,
      per_page: 10,
    };

    mockApi.getFileList.mockResolvedValue(emptyFiles);

    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    expect(screen.getByText('ファイルがありません')).toBeInTheDocument();
    expect(screen.getByText('まだファイルがアップロードされていません。')).toBeInTheDocument();
    expect(screen.getByText('ファイルをアップロード')).toBeInTheDocument();
  });

  it('maintains accessibility features', async () => {
    render(<FilesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('files-page')).toBeInTheDocument();
    });

    // 適切なテストIDが設定されていることを確認
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('files-card')).toBeInTheDocument();
    expect(screen.getByTestId('file-search-filter')).toBeInTheDocument();
  });
});
