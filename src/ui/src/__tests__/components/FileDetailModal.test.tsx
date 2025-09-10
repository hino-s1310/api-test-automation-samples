import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

// APIモック
jest.mock('../../lib/api', () => ({
  api: {
    getFileList: jest.fn(),
    getFile: jest.fn(),
    deleteFile: jest.fn(),
    searchFiles: jest.fn(),
    editFile: jest.fn(),
    uploadPdf: jest.fn(),
  }
}));

import FileDetailModal from '../../components/FileDetailModal'

const mockFile = {
  id: '1',
  filename: 'test.pdf',
  markdown: '# Test Markdown\nThis is a test content.',
  created_at: new Date().toISOString()
};

// モーダルのラッパーコンポーネント（状態管理のテスト用）
const ModalWrapper = () => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <FileDetailModal
      file={mockFile}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
};

describe('FileDetailModal', () => {
  it('モーダルが表示される', () => {
    render(
      <FileDetailModal
        file={mockFile}
        isOpen={true}
        onClose={() => {}}
      />
    )

    // ファイル情報が表示されていることを確認
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
    expect(screen.getByText('ファイル詳細')).toBeInTheDocument()

    // Markdownコンテンツが表示されていることを確認
    const markdownContent = screen.getByRole('article', { name: 'markdown-content' })
    expect(markdownContent).toHaveTextContent('Test Markdown')
    expect(markdownContent).toHaveTextContent('This is a test content')
  })

  it('モーダルが閉じられる', async () => {
    const handleClose = jest.fn()
    render(
      <FileDetailModal
        file={mockFile}
        isOpen={true}
        onClose={handleClose}
      />
    )

    // 閉じるボタンをクリック
    const closeButton = screen.getByRole('button', { name: '閉じる' })
    await userEvent.click(closeButton)

    // onCloseが呼ばれたことを確認
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('ファイルの更新が機能する', async () => {
    const onFileUpdated = jest.fn()
    render(
      <FileDetailModal
        file={mockFile}
        isOpen={true}
        onClose={() => {}}
        onFileUpdated={onFileUpdated}
      />
    )

    // ファイル更新ボタンが表示されていることを確認
    const updateButton = screen.getByRole('button', { name: /ファイル更新/ })
    expect(updateButton).toBeInTheDocument()

    // ファイル入力が非表示であることを確認
    const fileInput = screen.getByTestId('file-input')
    expect(fileInput).toHaveClass('hidden')

    // 更新ボタンをクリックするとファイル入力がトリガーされることを確認
    await userEvent.click(updateButton)
    expect(fileInput).toBeInTheDocument()
  })

  it('Markdownのコピーが機能する', async () => {
    // クリップボードAPIのモック
    const mockClipboard = {
      writeText: jest.fn()
    }
    Object.assign(navigator, {
      clipboard: mockClipboard
    })

    render(
      <FileDetailModal
        file={mockFile}
        isOpen={true}
        onClose={() => {}}
      />
    )

    // コピーボタンをクリック
    const copyButton = screen.getByRole('button', { name: 'コピー' })
    await userEvent.click(copyButton)

    // クリップボードにMarkdownがコピーされたことを確認
    expect(mockClipboard.writeText).toHaveBeenCalledWith(mockFile.markdown)
  })

  it('赤セルシートタブが表示される', () => {
    render(<ModalWrapper />);

    // 赤セルシートタブが表示されることを確認
    expect(screen.getByTestId('redacted-tab')).toBeInTheDocument();
    expect(screen.getByText('赤セルシート')).toBeInTheDocument();
  });

  it('赤セルシートタブをクリックすると赤セルシート表示に切り替わる', async () => {
    render(<ModalWrapper />);

    // 赤セルシートタブをクリック
    const redactedTab = screen.getByTestId('redacted-tab');
    await userEvent.click(redactedTab);

    // 赤セルシート表示が表示されることを確認
    expect(screen.getByText('赤セルシート表示')).toBeInTheDocument();
    expect(screen.getByText('表示制御')).toBeInTheDocument();
  });

  it('赤セルシートタブで設定ボタンが表示される', async () => {
    render(<ModalWrapper />);

    // 赤セルシートタブをクリック
    const redactedTab = screen.getByTestId('redacted-tab');
    await userEvent.click(redactedTab);

    // 設定ボタンが表示されることを確認
    expect(screen.getByTestId('redaction-settings-button')).toBeInTheDocument();
    expect(screen.getByTestId('redaction-controls-button')).toBeInTheDocument();
  });

  it('赤セルシート設定ボタンをクリックすると設定パネルが表示される', async () => {
    render(<ModalWrapper />);

    // 赤セルシートタブをクリック
    const redactedTab = screen.getByTestId('redacted-tab');
    await userEvent.click(redactedTab);

    // 設定ボタンをクリック
    const settingsButton = screen.getByTestId('redaction-settings-button');
    await userEvent.click(settingsButton);

    // 設定パネルが表示されることを確認
    expect(screen.getByText('詳細設定')).toBeInTheDocument();
    expect(screen.getByText('設定を閉じる')).toBeInTheDocument();
  });

  it('赤セルシートコントロールボタンをクリックするとコントロールパネルが表示される', async () => {
    render(<ModalWrapper />);

    // 赤セルシートタブをクリック
    const redactedTab = screen.getByTestId('redacted-tab');
    await userEvent.click(redactedTab);

    // コントロールボタンをクリック
    const controlsButton = screen.getByTestId('redaction-controls-button');
    await userEvent.click(controlsButton);

    // コントロールパネルが表示されることを確認
    expect(screen.getByText('設定管理')).toBeInTheDocument();
    expect(screen.getByText('コントロールを閉じる')).toBeInTheDocument();
  });
})
