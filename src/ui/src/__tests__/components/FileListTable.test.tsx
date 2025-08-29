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
  const mockOnEditFile = jest.fn()
  const mockOnDeleteFile = jest.fn()
  const mockOnBatchOperation = jest.fn()
  const mockOnShowHistory = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // タイムゾーンを一定にするためのモック
    jest.spyOn(Date.prototype, 'toLocaleString').mockImplementation(function(this: Date, locale, options) {
      // UTC時間として固定表示
      if (locale === 'ja-JP' && options) {
        const isoString = this.toISOString()
        const [datePart, timePart] = isoString.split('T')
        const [year, month, day] = datePart.split('-')
        const [hour, minute] = timePart.split(':')
        return `${year}/${month}/${day} ${hour}:${minute}`
      }
      return this.toISOString()
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('ファイル一覧が表示される', () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
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

    // 日付のフォーマットが正しいことを確認（UTC時間で表示）
    expect(screen.getByText('2024/03/20 13:00')).toBeInTheDocument()
    expect(screen.getByText('2024/03/20 14:00')).toBeInTheDocument()

    // ステータスが表示されていることを確認
    expect(screen.getByText('完了')).toBeInTheDocument()
    expect(screen.getByText('処理中')).toBeInTheDocument()

    // ファイルサイズが表示されていることを確認
    expect(screen.getByText('1 KB')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()
  })

  it('完了済みのファイルをクリックするとonViewFileが呼ばれる', async () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
        deletingFileId={null}
      />
    )

    const completedFileRow = screen.getByRole('button', { name: /test1.pdfの詳細を表示/ })
    await userEvent.click(completedFileRow)

    expect(mockOnViewFile).toHaveBeenCalledWith(mockFiles[0].id)
  })

  it('処理中のファイルをクリックしてもonViewFileは呼ばれる', async () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
        deletingFileId={null}
      />
    )

    const processingFileRow = screen.getByRole('button', { name: /test2.pdfの詳細を表示/ })
    await userEvent.click(processingFileRow)

    expect(mockOnViewFile).toHaveBeenCalledWith(mockFiles[1].id)
  })

  it('削除ボタンをクリックするとonDeleteFileが呼ばれる', async () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
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
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
        deletingFileId="1"
      />
    )

    const deleteButton = screen.getByRole('button', { name: /test1.pdfを削除/ })
    expect(deleteButton).toBeDisabled()
  })

  it('完了済みファイルに編集ボタンが表示される', () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
        deletingFileId={null}
      />
    )

    const editButton = screen.getByRole('button', { name: /test1.pdfを編集/ })
    expect(editButton).toBeInTheDocument()
  })

  it('処理中のファイルにも編集ボタンが表示される', () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
        deletingFileId={null}
      />
    )

    const editButton = screen.getByRole('button', { name: /test2.pdfを編集/ })
    expect(editButton).toBeInTheDocument()
  })

  it('編集ボタンをクリックするとonEditFileが呼ばれる', async () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
        deletingFileId={null}
      />
    )

    const editButton = screen.getByRole('button', { name: /test1.pdfを編集/ })
    await userEvent.click(editButton)

    expect(mockOnEditFile).toHaveBeenCalledWith(mockFiles[0].id)
  })

  it('編集ボタンと削除ボタンが並列に表示される', () => {
    render(
      <FileListTable
        files={mockFiles}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
        deletingFileId={null}
      />
    )

    const editButton = screen.getByRole('button', { name: /test1.pdfを編集/ })
    const deleteButton = screen.getByRole('button', { name: /test1.pdfを削除/ })

    expect(editButton).toBeInTheDocument()
    expect(deleteButton).toBeInTheDocument()

    // 両方のボタンが同じ行に表示されることを確認
    const row = editButton.closest('tr')
    expect(row).toContainElement(editButton)
    expect(row).toContainElement(deleteButton)
  })

  it('ファイルが空の場合、テーブルボディが空になる', () => {
    render(
      <FileListTable
        files={[]}
        onViewFile={mockOnViewFile}
        onEditFile={mockOnEditFile}
        onDeleteFile={mockOnDeleteFile}
        onBatchOperation={mockOnBatchOperation}
        onShowHistory={mockOnShowHistory}
        deletingFileId={null}
      />
    )

    const tbody = screen.getAllByRole('rowgroup')[1] // 2番目のrowgroupがtbody
    expect(tbody.children.length).toBe(0)
  })
})
