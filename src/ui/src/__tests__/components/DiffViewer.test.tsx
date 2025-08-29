import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiffViewer from '../../components/DiffViewer';

describe('DiffViewer', () => {
  const mockOriginal = 'Hello\nWorld\nTest';
  const mockModified = 'Hello\nNew World\nTest';

  it('renders without crashing', async () => {
    render(<DiffViewer original={mockOriginal} modified={mockModified} />);

    // 初期状態ではローディングが表示される
    expect(screen.getByText('差分を生成中...')).toBeInTheDocument();

    // 差分生成完了後はdiff-viewerが表示される
    await waitFor(() => {
      expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
    });
  });

  it('shows unified view by default', async () => {
    render(<DiffViewer original={mockOriginal} modified={mockModified} />);

    await waitFor(() => {
      expect(screen.getByTestId('unified-diff-view')).toBeInTheDocument();
    });
  });

  it('switches to split view when split button is clicked', async () => {
    render(<DiffViewer original={mockOriginal} modified={mockModified} />);

    await waitFor(() => {
      const splitButton = screen.getByTestId('split-view-button');
      fireEvent.click(splitButton);
    });

    expect(screen.getByTestId('split-diff-view')).toBeInTheDocument();
  });

  it('shows no changes message when files are identical', async () => {
    render(<DiffViewer original={mockOriginal} modified={mockOriginal} />);

    await waitFor(() => {
      expect(screen.getByText('変更はありません')).toBeInTheDocument();
      expect(screen.getByText('元のファイルと編集後のファイルは同一です')).toBeInTheDocument();
    });
  });

  it('displays diff lines with correct styling', async () => {
    render(<DiffViewer original={mockOriginal} modified={mockModified} />);

    await waitFor(() => {
      // 変更なしの行（行番号の後のスペースを含む）
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
      expect(screen.getByText(/Test/)).toBeInTheDocument();

      // 削除された行
      expect(screen.getByText(/- World/)).toBeInTheDocument();

      // 追加された行
      expect(screen.getByText(/\+ New World/)).toBeInTheDocument();
    });
  });

  it('shows legend for change types', async () => {
    render(<DiffViewer original={mockOriginal} modified={mockModified} />);

    await waitFor(() => {
      expect(screen.getByText('削除された行')).toBeInTheDocument();
      expect(screen.getByText('追加された行')).toBeInTheDocument();
      expect(screen.getByText('変更なし')).toBeInTheDocument();
    });
  });

  it('handles close button when onClose is provided', async () => {
    const mockOnClose = jest.fn();
    render(
      <DiffViewer
        original={mockOriginal}
        modified={mockModified}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      const closeButton = screen.getByTestId('diff-viewer-close-button');
      fireEvent.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not show close button when onClose is not provided', async () => {
    render(<DiffViewer original={mockOriginal} modified={mockModified} />);

    await waitFor(() => {
      expect(screen.queryByTestId('diff-viewer-close-button')).not.toBeInTheDocument();
    });
  });

  it('shows loading state initially', async () => {
    render(<DiffViewer original={mockOriginal} modified={mockModified} />);

    // 初期状態ではローディングが表示される
    expect(screen.getByText('差分を生成中...')).toBeInTheDocument();

    // 差分生成完了後はローディングが消える
    await waitFor(() => {
      expect(screen.queryByText('差分を生成中...')).not.toBeInTheDocument();
    });
  });

  it('handles single line changes', async () => {
    render(<DiffViewer original="Single line" modified="Modified single line" />);

    await waitFor(() => {
      expect(screen.getByText(/- Single line/)).toBeInTheDocument();
      expect(screen.getByText(/\+ Modified single line/)).toBeInTheDocument();
    });
  });
});
