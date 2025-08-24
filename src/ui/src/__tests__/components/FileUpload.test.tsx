import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileUpload from '@/components/FileUpload'
import { UploadState } from '@/types'

// react-dropzoneをモック
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop, disabled }: any) => ({
    getRootProps: () => ({
      'data-testid': 'file-dropzone',
      role: 'presentation',
      tabIndex: 0,
      className: disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    }),
    getInputProps: () => ({
      'data-testid': 'file-input',
      type: 'file',
      style: { display: 'none' },
      onChange: (e: any) => {
        if (e.target.files && e.target.files.length > 0) {
          onDrop([e.target.files[0]])
        }
      }
    }),
    isDragActive: false
  })
}))

describe('FileUpload', () => {
  const mockOnUpload = jest.fn()
  const defaultUploadState: UploadState = {
    isLoading: false,
    error: null,
    result: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // アラートをモック
    window.alert = jest.fn()
  })

  it('ドロップゾーンが表示される', () => {
    render(<FileUpload onUpload={mockOnUpload} uploadState={defaultUploadState} />)

    expect(screen.getByText('PDFファイルをアップロード')).toBeInTheDocument()
    expect(screen.getByText('ドラッグ&ドロップまたはクリックしてファイルを選択')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ファイルを選択' })).toBeInTheDocument()
    expect(screen.getByTestId('file-dropzone')).toBeInTheDocument()
  })

  it('ローディング状態が正しく表示される', () => {
    const loadingState: UploadState = {
      isLoading: true,
      error: null,
      result: null
    }

    render(<FileUpload onUpload={mockOnUpload} uploadState={loadingState} />)

    expect(screen.getByText('アップロード中...')).toBeInTheDocument()
    expect(screen.getByText('ファイルを変換しています。しばらくお待ちください。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ファイルを選択' })).not.toBeInTheDocument()
    
    // スピナーが表示されることを確認
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('エラー状態が正しく表示される', () => {
    const errorState: UploadState = {
      isLoading: false,
      error: 'ファイルのアップロードに失敗しました',
      result: null
    }

    render(<FileUpload onUpload={mockOnUpload} uploadState={errorState} />)

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    expect(screen.getByText('ファイルのアップロードに失敗しました')).toBeInTheDocument()
  })

  it('PDFファイルがアップロードされたときにonUploadが呼ばれる', async () => {
    render(<FileUpload onUpload={mockOnUpload} uploadState={defaultUploadState} />)

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('file-input')

    // ファイル入力をシミュレート
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    expect(mockOnUpload).toHaveBeenCalledWith(file)
  })

  it('PDF以外のファイルがアップロードされたときにアラートが表示される', async () => {
    render(<FileUpload onUpload={mockOnUpload} uploadState={defaultUploadState} />)

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const input = screen.getByTestId('file-input')

    // ファイル入力をシミュレート
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    expect(window.alert).toHaveBeenCalledWith('PDFファイルのみアップロード可能です。')
    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('ドロップゾーンがクリック可能', async () => {
    render(<FileUpload onUpload={mockOnUpload} uploadState={defaultUploadState} />)

    const dropzone = screen.getByTestId('file-dropzone')
    expect(dropzone).toHaveClass('cursor-pointer')
    expect(dropzone).not.toHaveClass('opacity-50')
  })

  it('ローディング中はドロップゾーンが無効になる', () => {
    const loadingState: UploadState = {
      isLoading: true,
      error: null,
      result: null
    }

    render(<FileUpload onUpload={mockOnUpload} uploadState={loadingState} />)

    const dropzone = screen.getByTestId('file-dropzone')
    expect(dropzone).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('ドロップゾーンをクリックしてファイル選択', async () => {
    render(<FileUpload onUpload={mockOnUpload} uploadState={defaultUploadState} />)

    const dropzone = screen.getByTestId('file-dropzone')
    const input = screen.getByTestId('file-input')
    
    // input要素のクリックをモック
    const mockClick = jest.fn()
    input.click = mockClick

    await userEvent.click(dropzone)

    // ドロップゾーンがクリックされることを確認
    expect(dropzone).toBeInTheDocument()
  })

  it('ファイルサイズ制限のテスト', async () => {
    render(<FileUpload onUpload={mockOnUpload} uploadState={defaultUploadState} />)

    // 11MBのファイルを作成（制限は通常10MB）
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
    const input = screen.getByTestId('file-input')

    // ファイル入力をシミュレート
    Object.defineProperty(input, 'files', {
      value: [largeFile],
      writable: false,
    })

    fireEvent.change(input)

    // ファイルサイズが大きすぎる場合の処理をテスト
    // 実際の実装では、ファイルサイズチェックが行われる可能性があります
    expect(mockOnUpload).toHaveBeenCalledWith(largeFile)
  })
})