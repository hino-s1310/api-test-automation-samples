import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar from '@/components/Sidebar'

// next/navigationのモック
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
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
  })

  it('サイドバーが表示される', () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('PDF Converter')).toBeInTheDocument()
    expect(screen.getByText('アップロード')).toBeInTheDocument()
    expect(screen.getByText('ファイル一覧')).toBeInTheDocument()
  })

  it('現在のページのメニューがアクティブになる', () => {
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