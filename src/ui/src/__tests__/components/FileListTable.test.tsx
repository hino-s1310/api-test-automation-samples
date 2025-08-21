import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileListTable from '@/components/FileListTable'

const mockFiles = [
  {
    id: '1',
    filename: 'test1.pdf',
    markdown: '# Test 1',
    created_at: '2024-03-20T13:00:00Z',
    status: 'completed' as const,
    file_size: 1024,
    processing_time: 1.5
  },
  {
    id: '2',
    filename: 'test2.pdf',
    markdown: '# Test 2',
    created_at: '2024-03-20T14:00:00Z',
    status: 'processing' as const,
    file_size: 2048,
    processing_time: null
  }
]

describe('FileListTable', () => {
  const mockOnViewFile = jest.fn()
  const mockOnDeleteFile = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ファイル一覧が表示される', () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onDeleteFile={mockOnDeleteFile}
        deletingFileId={null}
      />
    )

    // ヘッダーが表示されていることを確認
    expect(screen.getByText('ファイル名')).toBeInTheDocument()
    expect(screen.getByText('作成日時')).toBeInTheDocument()
    expect(screen.getByText('ステータス')).toBeInTheDocument()

    // ファイルデータが表示されていることを確認
    expect(screen.getByText('test1.pdf')).toBeInTheDocument()
    expect(screen.getByText('test2.pdf')).toBeInTheDocument()

    // 日付のフォーマットが正しいことを確認
    expect(screen.getByText('2024/03/20 22:00')).toBeInTheDocument()
    expect(screen.getByText('2024/03/20 23:00')).toBeInTheDocument()

    // ステータスが表示されていることを確認
    expect(screen.getByText('完了')).toBeInTheDocument()
    expect(screen.getByText('処理中')).toBeInTheDocument()

    // ファイルサイズが表示されていることを確認
    expect(screen.getByText('1.0 KB')).toBeInTheDocument()
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
  })

  it('完了済みのファイルをクリックするとonViewFileが呼ばれる', async () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onDeleteFile={mockOnDeleteFile}
        deletingFileId={null}
      />
    )

    const completedFileRow = screen.getByRole('button', { name: /test1.pdfの詳細を表示/ })
    await userEvent.click(completedFileRow)

    expect(mockOnViewFile).toHaveBeenCalledWith(mockFiles[0].id)
  })

  it('処理中のファイルをクリックしてもonViewFileは呼ばれない', async () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onDeleteFile={mockOnDeleteFile}
        deletingFileId={null}
      />
    )

    const processingFileRow = screen.getByText('test2.pdf').closest('tr')
    expect(processingFileRow).toHaveAttribute('tabindex', '-1')

    if (processingFileRow) {
      await userEvent.click(processingFileRow)
    }
    expect(mockOnViewFile).not.toHaveBeenCalled()
  })

  it('削除ボタンをクリックするとonDeleteFileが呼ばれる', async () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onDeleteFile={mockOnDeleteFile}
        deletingFileId={null}
      />
    )

    const deleteButton = screen.getByRole('button', { name: /test1.pdfを削除/ })
    await userEvent.click(deleteButton)

    expect(mockOnDeleteFile).toHaveBeenCalledWith(mockFiles[0].id)
  })

  it('削除中のファイルのボタンが無効になる', () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onDeleteFile={mockOnDeleteFile}
        deletingFileId="1"
      />
    )

    const deleteButton = screen.getByRole('button', { name: /test1.pdfを削除/ })
    expect(deleteButton).toBeDisabled()
  })

  it('ファイルが空の場合、テーブルボディが空になる', () => {
    render(
      <FileListTable
        files={[]}
        onViewFile={mockOnViewFile}
        onDeleteFile={mockOnDeleteFile}
        deletingFileId={null}
      />
    )

    const tbody = screen.getAllByRole('rowgroup')[1] // 2番目のrowgroupがtbody
    expect(tbody.children.length).toBe(0)
  })
})