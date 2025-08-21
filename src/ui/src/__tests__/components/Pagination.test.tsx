import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from '@/components/Pagination'

describe('Pagination', () => {
  const mockOnPageChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // window.scrollTo のモック
    window.scrollTo = jest.fn()
  })

  it('ページネーションが正しく表示される', () => {
    render(
      <Pagination
        currentPage={1}
        onPageChange={mockOnPageChange}
        totalItems={50}
        itemsPerPage={10}
      />
    )

    // 数字ボタンが表示されていることを確認
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()

    // 前へ/次へボタンが表示されていることを確認
    expect(screen.getByRole('button', { name: '前へ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '次へ' })).toBeInTheDocument()
  })

  it('現在のページが強調表示される', () => {
    render(
      <Pagination
        currentPage={3}

        onPageChange={mockOnPageChange}
        totalItems={50}
        itemsPerPage={10}
      />
    )

    const currentPageButton = screen.getByRole('button', { name: '3' })
    expect(currentPageButton).toHaveClass('bg-blue-600')
    expect(currentPageButton).toHaveClass('text-white')
  })

  it('前へボタンをクリックすると前のページに移動する', async () => {
    render(
      <Pagination
        currentPage={3}

        onPageChange={mockOnPageChange}
        totalItems={50}
        itemsPerPage={10}
      />
    )

    const prevButton = screen.getByRole('button', { name: '前へ' })
    await userEvent.click(prevButton)

    expect(mockOnPageChange).toHaveBeenCalledWith(2)
  })

  it('次へボタンをクリックすると次のページに移動する', async () => {
    render(
      <Pagination
        currentPage={3}

        onPageChange={mockOnPageChange}
        totalItems={50}
        itemsPerPage={10}
      />
    )

    const nextButton = screen.getByRole('button', { name: '次へ' })
    await userEvent.click(nextButton)

    expect(mockOnPageChange).toHaveBeenCalledWith(4)
  })

  it('最初のページで前へボタンが無効になる', () => {
    render(
      <Pagination
        currentPage={1}

        onPageChange={mockOnPageChange}
        totalItems={50}
        itemsPerPage={10}
      />
    )

    const prevButton = screen.getByRole('button', { name: '前へ' })
    expect(prevButton).toBeDisabled()
  })

  it('最後のページで次へボタンが無効になる', () => {
    render(
      <Pagination
        currentPage={5}

        onPageChange={mockOnPageChange}
        totalItems={50}
        itemsPerPage={10}
      />
    )

    const nextButton = screen.getByRole('button', { name: '次へ' })
    expect(nextButton).toBeDisabled()
  })

  it('数字ボタンをクリックすると該当ページに移動する', async () => {
    render(
      <Pagination
        currentPage={1}

        onPageChange={mockOnPageChange}
        totalItems={50}
        itemsPerPage={10}
      />
    )

    const pageButton = screen.getByRole('button', { name: '3' })
    await userEvent.click(pageButton)

    expect(mockOnPageChange).toHaveBeenCalledWith(3)
  })

  it('ページ数が多い場合に省略記号が表示される', () => {
    render(
      <Pagination
        currentPage={5}

        onPageChange={mockOnPageChange}
        totalItems={100}
        itemsPerPage={10}
      />
    )

    const ellipses = screen.getAllByText('...')
    expect(ellipses).toHaveLength(2)
  })
})