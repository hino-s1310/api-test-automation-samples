import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar from '@/components/Sidebar'

// next/navigationのモック
const mockUsePathname = jest.fn(() => '/upload')
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  })
}))

describe('Sidebar', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // デフォルトで/uploadを返すようにリセット
    mockUsePathname.mockReturnValue('/upload')
  })

  it('サイドバーが表示される', () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('PDF Converter')).toBeInTheDocument()
    expect(screen.getByText('アップロード')).toBeInTheDocument()
    expect(screen.getByText('ファイル一覧')).toBeInTheDocument()
  })

  it('現在のページのメニューがアクティブになる（/upload）', () => {
    mockUsePathname.mockReturnValue('/upload')
    render(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const uploadLink = screen.getByText('アップロード').closest('a')
    expect(uploadLink).toHaveClass('bg-blue-100')
    expect(uploadLink).toHaveClass('text-blue-700')
  })

  it('ファイル一覧ページでファイル一覧メニューがアクティブになる（/files）', () => {
    mockUsePathname.mockReturnValue('/files')
    render(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const filesLink = screen.getByText('ファイル一覧').closest('a')
    expect(filesLink).toHaveClass('bg-blue-100')
    expect(filesLink).toHaveClass('text-blue-700')
  })

  it('ルートページでアップロードメニューがアクティブになる（/）', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Sidebar isOpen={true} onClose={mockOnClose} />)

    const uploadLink = screen.getByText('アップロード').closest('a')
    expect(uploadLink).toHaveClass('bg-blue-100')
    expect(uploadLink).toHaveClass('text-blue-700')
  })

  it('モバイル表示で閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} isMobile={true} />)

    const closeButton = screen.getByLabelText('サイドバーを閉じる')
    await userEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('デスクトップ表示で閉じるボタンが表示されない', () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} isMobile={false} />)

    const closeButton = screen.queryByLabelText('サイドバーを閉じる')
    expect(closeButton).not.toBeInTheDocument()
  })

  it('フッターが表示される', () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('PDF to Markdown')).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })
})