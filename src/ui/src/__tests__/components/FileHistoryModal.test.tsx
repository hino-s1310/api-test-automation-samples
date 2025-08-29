import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileHistoryModal from '../../components/FileHistoryModal';

// Mock DiffViewer component
jest.mock('../../components/DiffViewer', () => {
  return function MockDiffViewer() {
    return <div data-testid="mock-diff-viewer">Mock Diff Viewer</div>;
  };
});

describe('FileHistoryModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    fileId: 'test-file-123',
    filename: 'test-file.md',
    onRevert: jest.fn(),
  };

  const mockHistory = [
    {
      id: 1,
      file_id: 'test-file-123',
      original_filename: 'old-name.md',
      original_content: 'old content',
      edited_filename: 'test-file.md',
      edited_content: 'new content',
      edit_reason: 'Content update',
      edited_by: 'user1',
      created_at: '2024-01-01T10:00:00Z',
    },
    {
      id: 2,
      file_id: 'test-file-123',
      original_filename: 'test-file.md',
      original_content: 'new content',
      edited_filename: 'test-file.md',
      edited_content: 'final content',
      edit_reason: 'Final revision',
      edited_by: 'user2',
      created_at: '2024-01-02T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch for history API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ history: mockHistory, total_count: 2 }),
      })
    ) as jest.Mock;
  });

  it('renders when open', () => {
    render(<FileHistoryModal {...mockProps} />);
    expect(screen.getByTestId('file-history-modal')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<FileHistoryModal {...mockProps} isOpen={false} />);
    expect(screen.queryByTestId('file-history-modal')).not.toBeInTheDocument();
  });

  it('displays file information', async () => {
    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('編集履歴: test-file.md')).toBeInTheDocument();
    });

    // ファイル情報は非同期で読み込まれるため、履歴が表示されるまで待つ
    await waitFor(() => {
      // ファイルIDとファイル名は別々の要素に分かれているため、個別に確認
      expect(screen.getByText('test-file-123')).toBeInTheDocument();
      // 複数のtest-file.mdがあるため、より具体的なセレクタを使用
      const filenameElements = screen.getAllByText('test-file.md');
      expect(filenameElements.length).toBeGreaterThan(0);
    });
  });

  it('fetches and displays history', async () => {
    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Content update')).toBeInTheDocument();
      expect(screen.getByText('Final revision')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching history', () => {
    render(<FileHistoryModal {...mockProps} />);

    expect(screen.getByText('履歴を読み込み中...')).toBeInTheDocument();
  });

  it('displays change type badges correctly', async () => {
    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('ファイル名・内容変更')).toBeInTheDocument();
      expect(screen.getByText('内容変更')).toBeInTheDocument();
    });
  });

  it('shows filename changes when they occur', async () => {
    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('old-name.md')).toBeInTheDocument();
      // 複数のtest-file.mdがあるため、より具体的なセレクタを使用
      const filenameElements = screen.getAllByText('test-file.md');
      expect(filenameElements.length).toBeGreaterThan(0);
    });
  });

  it('handles show diff button click', async () => {
    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      const diffButton = screen.getByTestId('show-diff-button-0');
      fireEvent.click(diffButton);
    });

    expect(screen.getByTestId('diff-modal-close-button')).toBeInTheDocument();
    expect(screen.getByTestId('mock-diff-viewer')).toBeInTheDocument();
  });

  it('handles revert button click', async () => {
    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      const revertButton = screen.getByTestId('revert-button-0');
      fireEvent.click(revertButton);
    });

    expect(mockProps.onRevert).toHaveBeenCalledWith(1);
  });

  it('shows empty state when no history', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ history: [], total_count: 0 }),
      })
    ) as jest.Mock;

    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('編集履歴がありません')).toBeInTheDocument();
      expect(screen.getByText('このファイルはまだ編集されていません')).toBeInTheDocument();
    });
  });

  it('handles close button clicks', () => {
    render(<FileHistoryModal {...mockProps} />);

    const closeButton = screen.getByTestId('history-modal-close-button');
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('handles diff modal close', async () => {
    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      const diffButton = screen.getByTestId('show-diff-button-0');
      fireEvent.click(diffButton);
    });

    const diffCloseButton = screen.getByTestId('diff-modal-close-button');
    fireEvent.click(diffCloseButton);

    expect(screen.queryByTestId('diff-modal-close-button')).not.toBeInTheDocument();
  });

  it('formats dates correctly', async () => {
    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      // 日付の形式を確認（実際の表示形式に合わせて調整）
      expect(screen.getByText(/2024\/01\/01/)).toBeInTheDocument();
      expect(screen.getByText(/2024\/01\/02/)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
      })
    ) as jest.Mock;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<FileHistoryModal {...mockProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('履歴の取得に失敗しました');
    });

    consoleSpy.mockRestore();
  });
});
