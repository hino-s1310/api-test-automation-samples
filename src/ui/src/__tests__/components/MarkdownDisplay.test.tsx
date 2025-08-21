import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MarkdownDisplay from '@/components/MarkdownDisplay'
import { UploadResponse } from '@/types'

const mockResult: UploadResponse = {
  id: '1',
  markdown: '# Test Title\nThis is a test content.',
  message: 'ファイルが正常に変換されました'
}

describe('MarkdownDisplay', () => {
  const mockOnNewUpload = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('Markdownコンテンツが表示される', () => {
    render(<MarkdownDisplay result={mockResult} onNewUpload={mockOnNewUpload} />)

    // プレビューでMarkdownコンテンツが表示される（生のテキストでも確認）
    expect(screen.getByText(/Test Title/)).toBeInTheDocument()
    expect(screen.getByText(/This is a test content/)).toBeInTheDocument()
    
    // ファイル情報が表示される
    expect(screen.getByText('ファイルID:')).toBeInTheDocument()
    expect(screen.getByText(mockResult.id)).toBeInTheDocument()
    
    // メッセージが表示される
    expect(screen.getByText(mockResult.message!)).toBeInTheDocument()
  })

  it('タブを切り替えるとプレビューとソースが切り替わる', async () => {
    render(<MarkdownDisplay result={mockResult} onNewUpload={mockOnNewUpload} />)

    // デフォルトでプレビューが表示される（生のテキストかレンダリングされたものかは問わない）
    expect(screen.getByText(/Test Title/)).toBeInTheDocument()

    // ソースタブをクリック
    const sourceTab = screen.getByRole('button', { name: 'Markdown' })
    await userEvent.click(sourceTab)

    // ソースコードが表示される（pre要素内）
    const preElement = document.querySelector('pre')
    expect(preElement).toBeInTheDocument()
    expect(preElement).toHaveTextContent('# Test Title')

    // プレビュータブをクリック
    const previewTab = screen.getByRole('button', { name: 'プレビュー' })
    await userEvent.click(previewTab)

    // プレビューが表示される
    expect(screen.getByText(/Test Title/)).toBeInTheDocument()
  })

  it('コピーボタンをクリックするとクリップボードにコピーされる', async () => {
    // クリップボードAPIのモック
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined)
    }
    Object.assign(navigator, {
      clipboard: mockClipboard
    })

    render(<MarkdownDisplay result={mockResult} onNewUpload={mockOnNewUpload} />)

    const copyButton = screen.getByRole('button', { name: 'コピー' })
    await userEvent.click(copyButton)

    expect(mockClipboard.writeText).toHaveBeenCalledWith(mockResult.markdown)
    
    // コピー成功時のUI変更をテスト
    expect(screen.getByText('コピー済み!')).toBeInTheDocument()
  })

  it('ダウンロード機能のテスト', () => {
    // URL.createObjectURLをモック
    const mockCreateObjectURL = jest.fn(() => 'blob:test')
    URL.createObjectURL = mockCreateObjectURL

    render(<MarkdownDisplay result={mockResult} onNewUpload={mockOnNewUpload} />)

    // ダウンロードボタンが表示されることを確認
    const downloadButton = screen.getByRole('button', { name: 'ダウンロード' })
    expect(downloadButton).toBeInTheDocument()
    
    // ボタンがクリック可能であることを確認
    expect(downloadButton).not.toBeDisabled()
  })

  it('新しいファイルボタンをクリックするとonNewUploadが呼ばれる', async () => {
    render(<MarkdownDisplay result={mockResult} onNewUpload={mockOnNewUpload} />)

    const newFileButton = screen.getByRole('button', { name: '新しいファイル' })
    await userEvent.click(newFileButton)

    expect(mockOnNewUpload).toHaveBeenCalled()
  })

  it('タブの状態が正しく管理される', () => {
    render(<MarkdownDisplay result={mockResult} onNewUpload={mockOnNewUpload} />)

    // プレビュータブがアクティブ
    const previewTab = screen.getByRole('button', { name: 'プレビュー' })
    const markdownTab = screen.getByRole('button', { name: 'Markdown' })
    
    expect(previewTab).toHaveClass('border-blue-500', 'text-blue-600')
    expect(markdownTab).toHaveClass('border-transparent', 'text-gray-500')
  })

  it('必要なボタンがすべて表示される', () => {
    render(<MarkdownDisplay result={mockResult} onNewUpload={mockOnNewUpload} />)

    expect(screen.getByRole('button', { name: 'コピー' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ダウンロード' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新しいファイル' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'プレビュー' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Markdown' })).toBeInTheDocument()
  })
})