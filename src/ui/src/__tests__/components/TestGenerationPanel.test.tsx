import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TestGenerationPanel from '@/components/TestGenerationPanel'

// APIモック
jest.mock('@/lib/api', () => ({
  api: {
    generateTests: jest.fn(),
    getGeneratedTests: jest.fn(),
    getGeneratedTest: jest.fn(),
  },
}))

import { api } from '@/lib/api'

const mockApi = api as jest.Mocked<typeof api>

describe('TestGenerationPanel', () => {
  const defaultProps = {
    fileId: 'test-file-id-123',
    markdownContent: '# Test API\n\n## GET /health\n\nヘルスチェック',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  // ===========================
  // 初期表示のテスト
  // ===========================

  it('初期状態で設定パネルが表示される', () => {
    render(<TestGenerationPanel {...defaultProps} />)

    expect(screen.getByTestId('test-generation-panel')).toBeInTheDocument()
    expect(screen.getByTestId('framework-select')).toBeInTheDocument()
    expect(screen.getByTestId('language-select')).toBeInTheDocument()
    expect(screen.getByTestId('test-type-select')).toBeInTheDocument()
    expect(screen.getByTestId('max-tests-input')).toBeInTheDocument()
    expect(screen.getByTestId('edge-cases-checkbox')).toBeInTheDocument()
  })

  it('生成ボタンが表示される', () => {
    render(<TestGenerationPanel {...defaultProps} />)

    const generateButton = screen.getByTestId('generate-button')
    expect(generateButton).toBeInTheDocument()
    expect(generateButton).toHaveTextContent('テストを生成')
  })

  it('空のMarkdownの場合、生成ボタンが無効になる', () => {
    render(<TestGenerationPanel fileId="test-id" markdownContent="" />)

    const generateButton = screen.getByTestId('generate-button')
    expect(generateButton).toBeDisabled()
  })

  it('空の状態メッセージが表示される', () => {
    render(<TestGenerationPanel {...defaultProps} />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  // ===========================
  // オプション選択のテスト
  // ===========================

  it('デフォルトのオプション値が設定される', () => {
    render(<TestGenerationPanel {...defaultProps} />)

    expect(screen.getByTestId('framework-select')).toHaveValue('pytest')
    expect(screen.getByTestId('language-select')).toHaveValue('python')
    expect(screen.getByTestId('test-type-select')).toHaveValue('unit')
    expect(screen.getByTestId('max-tests-input')).toHaveValue(10)
    expect(screen.getByTestId('edge-cases-checkbox')).toBeChecked()
  })

  it('フレームワークを変更できる', async () => {
    render(<TestGenerationPanel {...defaultProps} />)

    const select = screen.getByTestId('framework-select')
    await userEvent.selectOptions(select, 'jest')

    expect(select).toHaveValue('jest')
  })

  it('言語を変更できる', async () => {
    render(<TestGenerationPanel {...defaultProps} />)

    const select = screen.getByTestId('language-select')
    await userEvent.selectOptions(select, 'typescript')

    expect(select).toHaveValue('typescript')
  })

  it('テスト種類を変更できる', async () => {
    render(<TestGenerationPanel {...defaultProps} />)

    const select = screen.getByTestId('test-type-select')
    await userEvent.selectOptions(select, 'integration')

    expect(select).toHaveValue('integration')
  })

  it('エッジケースのチェックボックスを切り替えできる', async () => {
    render(<TestGenerationPanel {...defaultProps} />)

    const checkbox = screen.getByTestId('edge-cases-checkbox')
    expect(checkbox).toBeChecked()

    await userEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  // ===========================
  // テスト生成のテスト
  // ===========================

  it('テスト生成が成功した場合、結果が表示される', async () => {
    const mockResponse = {
      id: 1,
      file_id: 'test-file-id-123',
      generated_tests: 'def test_example():\n    assert True',
      test_count: 1,
      test_framework: 'pytest',
      language: 'python',
      test_type: 'unit',
      metadata: {
        model: 'gpt-4o',
        prompt_tokens: 500,
        completion_tokens: 200,
        generation_time: 2.5,
      },
      created_at: '2025-01-01T00:00:00',
    }

    mockApi.generateTests.mockResolvedValue(mockResponse)

    render(<TestGenerationPanel {...defaultProps} />)

    const generateButton = screen.getByTestId('generate-button')
    await userEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByTestId('generated-code')).toBeInTheDocument()
    })

    expect(screen.getByText('のテストが生成されました')).toBeInTheDocument()
    expect(screen.getByText(/gpt-4o/)).toBeInTheDocument()
  })

  it('テスト生成中にローディングが表示される', async () => {
    // 遅延するPromiseを作成
    let resolvePromise: (value: any) => void
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    mockApi.generateTests.mockReturnValue(delayedPromise as any)

    render(<TestGenerationPanel {...defaultProps} />)

    const generateButton = screen.getByTestId('generate-button')
    await userEvent.click(generateButton)

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    expect(screen.getByText('テスト生成中...')).toBeInTheDocument()

    // Promiseを解決してクリーンアップ
    resolvePromise!({
      id: 1,
      file_id: 'test-file-id-123',
      generated_tests: 'test',
      test_count: 0,
      test_framework: 'pytest',
      language: 'python',
      test_type: 'unit',
      metadata: { model: 'gpt-4o', prompt_tokens: 0, completion_tokens: 0, generation_time: 0 },
      created_at: '2025-01-01T00:00:00',
    })
  })

  it('テスト生成に失敗した場合、エラーメッセージが表示される', async () => {
    mockApi.generateTests.mockRejectedValue(new Error('AI APIに接続できませんでした'))

    render(<TestGenerationPanel {...defaultProps} />)

    const generateButton = screen.getByTestId('generate-button')
    await userEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })

    expect(screen.getByText('AI APIに接続できませんでした')).toBeInTheDocument()
  })

  it('生成結果をAPIに正しいオプションで送信する', async () => {
    mockApi.generateTests.mockResolvedValue({
      id: 1,
      file_id: 'test-file-id-123',
      generated_tests: 'test code',
      test_count: 1,
      test_framework: 'pytest',
      language: 'python',
      test_type: 'unit',
      metadata: { model: 'gpt-4o', prompt_tokens: 0, completion_tokens: 0, generation_time: 0 },
      created_at: '2025-01-01T00:00:00',
    })

    render(<TestGenerationPanel {...defaultProps} />)

    const generateButton = screen.getByTestId('generate-button')
    await userEvent.click(generateButton)

    expect(mockApi.generateTests).toHaveBeenCalledWith(
      'test-file-id-123',
      {
        test_framework: 'pytest',
        language: 'python',
        test_type: 'unit',
        max_tests: 10,
        include_edge_cases: true,
      }
    )
  })

  // ===========================
  // コピー・ダウンロードのテスト
  // ===========================

  it('コピーボタンをクリックするとクリップボードにコピーされる', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    mockApi.generateTests.mockResolvedValue({
      id: 1,
      file_id: 'test-file-id-123',
      generated_tests: 'def test_example():\n    assert True',
      test_count: 1,
      test_framework: 'pytest',
      language: 'python',
      test_type: 'unit',
      metadata: { model: 'gpt-4o', prompt_tokens: 0, completion_tokens: 0, generation_time: 0 },
      created_at: '2025-01-01T00:00:00',
    })

    render(<TestGenerationPanel {...defaultProps} />)

    // テスト生成
    await userEvent.click(screen.getByTestId('generate-button'))

    await waitFor(() => {
      expect(screen.getByTestId('copy-code-button')).toBeInTheDocument()
    })

    // コピーボタンクリック
    await userEvent.click(screen.getByTestId('copy-code-button'))

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      'def test_example():\n    assert True'
    )
  })

  // ===========================
  // 生成履歴のテスト
  // ===========================

  it('履歴ボタンをクリックすると履歴が表示される', async () => {
    mockApi.getGeneratedTests.mockResolvedValue({
      tests: [
        {
          id: 1,
          test_framework: 'pytest',
          language: 'python',
          test_type: 'unit',
          test_count: 3,
          created_at: '2025-01-01T00:00:00',
        },
      ],
      total_count: 1,
    })

    render(<TestGenerationPanel {...defaultProps} />)

    await userEvent.click(screen.getByTestId('history-button'))

    await waitFor(() => {
      expect(screen.getByTestId('history-list')).toBeInTheDocument()
    })

    expect(screen.getByTestId('history-item-1')).toBeInTheDocument()
  })

  it('履歴が空の場合メッセージが表示される', async () => {
    mockApi.getGeneratedTests.mockResolvedValue({
      tests: [],
      total_count: 0,
    })

    render(<TestGenerationPanel {...defaultProps} />)

    await userEvent.click(screen.getByTestId('history-button'))

    await waitFor(() => {
      expect(screen.getByText('生成履歴がありません')).toBeInTheDocument()
    })
  })

  it('履歴アイテムをクリックすると詳細が読み込まれる', async () => {
    mockApi.getGeneratedTests.mockResolvedValue({
      tests: [
        {
          id: 1,
          test_framework: 'pytest',
          language: 'python',
          test_type: 'unit',
          test_count: 2,
          created_at: '2025-01-01T00:00:00',
        },
      ],
      total_count: 1,
    })

    mockApi.getGeneratedTest.mockResolvedValue({
      id: 1,
      file_id: 'test-file-id-123',
      generated_tests: 'def test_from_history():\n    pass',
      test_count: 2,
      test_framework: 'pytest',
      language: 'python',
      test_type: 'unit',
      metadata: { model: 'gpt-4o', prompt_tokens: 100, completion_tokens: 200, generation_time: 1.5 },
      created_at: '2025-01-01T00:00:00',
    })

    render(<TestGenerationPanel {...defaultProps} />)

    // 履歴を開く
    await userEvent.click(screen.getByTestId('history-button'))

    await waitFor(() => {
      expect(screen.getByTestId('history-item-1')).toBeInTheDocument()
    })

    // 履歴アイテムをクリック
    await userEvent.click(screen.getByTestId('history-item-1'))

    await waitFor(() => {
      expect(screen.getByTestId('generated-code')).toBeInTheDocument()
    })

    expect(mockApi.getGeneratedTest).toHaveBeenCalledWith('test-file-id-123', 1)
  })
})
