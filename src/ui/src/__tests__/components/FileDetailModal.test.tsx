import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileDetailModal from '@/components/FileDetailModal'
import { useState } from 'react'

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
})