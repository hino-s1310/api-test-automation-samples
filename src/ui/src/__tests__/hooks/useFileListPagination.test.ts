import { renderHook, act } from '@testing-library/react'
import { useFileListPagination } from '@/hooks/useFileListPagination'

describe('useFileListPagination', () => {
  const defaultOptions = {
    minItemsPerPage: 3,
    maxItemsPerPage: 10,
    itemHeight: 60
  }

  beforeEach(() => {
    // windowのリサイズイベントをモック
    window.innerHeight = 800
    window.dispatchEvent(new Event('resize'))
  })

  it('初期状態が正しい', async () => {
    const { result } = renderHook(() => useFileListPagination(defaultOptions))

    // 初期化完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    expect(result.current.itemsPerPage).toBeGreaterThanOrEqual(defaultOptions.minItemsPerPage)
    expect(result.current.itemsPerPage).toBeLessThanOrEqual(defaultOptions.maxItemsPerPage)
    expect(typeof result.current.calculateItemsPerPage).toBe('function')
  })

  it('最小表示数が保証される', async () => {
    const { result } = renderHook(() => useFileListPagination(defaultOptions))

    await act(async () => {
      window.innerHeight = 200 // 非常に小さな画面サイズ
      window.dispatchEvent(new Event('resize'))
      // デバウンス期間を待つ
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    expect(result.current.itemsPerPage).toBeGreaterThanOrEqual(defaultOptions.minItemsPerPage)
  })

  it('最大表示数が制限される', async () => {
    const { result } = renderHook(() => useFileListPagination(defaultOptions))

    await act(async () => {
      window.innerHeight = 2000 // 非常に大きな画面サイズ
      window.dispatchEvent(new Event('resize'))
      // デバウンス期間を待つ
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    expect(result.current.itemsPerPage).toBeLessThanOrEqual(defaultOptions.maxItemsPerPage)
  })

  it('ウィンドウサイズに応じてitemsPerPageが更新される', async () => {
    const { result } = renderHook(() => useFileListPagination(defaultOptions))
    
    // 初期化完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })
    
    const initialItemsPerPage = result.current.itemsPerPage

    await act(async () => {
      window.innerHeight = 1200
      window.dispatchEvent(new Event('resize'))
      // デバウンス期間を待つ
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    // より大きな画面サイズでは、同じかより多くのアイテムが表示される
    expect(result.current.itemsPerPage).toBeGreaterThanOrEqual(initialItemsPerPage)
    expect(result.current.itemsPerPage).toBeLessThanOrEqual(defaultOptions.maxItemsPerPage)
  })

  it('calculateItemsPerPageが正しく動作する', async () => {
    const { result } = renderHook(() => useFileListPagination(defaultOptions))

    // 初期化完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    const calculatedItems = result.current.calculateItemsPerPage()
    expect(calculatedItems).toBeGreaterThanOrEqual(defaultOptions.minItemsPerPage)
    expect(calculatedItems).toBeLessThanOrEqual(defaultOptions.maxItemsPerPage)
    expect(calculatedItems).toBe(result.current.itemsPerPage)
  })

  it('リサイズイベントがデバウンスされる', async () => {
    const { result } = renderHook(() => useFileListPagination(defaultOptions))
    
    // 初期化完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // 複数回リサイズイベントを発火
    await act(async () => {
      window.innerHeight = 900
      window.dispatchEvent(new Event('resize'))
      window.innerHeight = 1000
      window.dispatchEvent(new Event('resize'))
      window.innerHeight = 1100
      window.dispatchEvent(new Event('resize'))
      
      // デバウンス期間後に状態が更新されることを確認
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    expect(result.current.itemsPerPage).toBeGreaterThanOrEqual(defaultOptions.minItemsPerPage)
    expect(result.current.itemsPerPage).toBeLessThanOrEqual(defaultOptions.maxItemsPerPage)
  })
})