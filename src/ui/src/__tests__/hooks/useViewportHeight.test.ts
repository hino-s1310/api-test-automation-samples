import { renderHook, act, waitFor } from '@testing-library/react'
import { useViewportHeight } from '@/hooks/useViewportHeight'

describe('useViewportHeight', () => {
  beforeEach(() => {
    // windowのリサイズイベントをモック
    window.innerHeight = 800
    window.innerWidth = 1024
  })

  it('デスクトップとモバイルの高さを計算する', async () => {
    const { result } = renderHook(() => useViewportHeight())

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
      // 初期化完了を待つ
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // サイドバー（256px）とパディング（32px）、ヘッダー（60px）を考慮
    expect(result.current.availableHeight).toBe(452) // 800 - 348
    // モバイルの場合は、モバイルヘッダー（68px）とパディング（32px）を考慮
    expect(result.current.availableHeightMobile).toBe(700) // 800 - 100
  })

  it('ウィンドウサイズの変更を検知する', async () => {
    const { result } = renderHook(() => useViewportHeight())

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    const initialViewportHeight = result.current.viewportHeight

    // デバウンス期間を考慮してPromiseで待機
    await act(async () => {
      window.innerHeight = 1000
      window.dispatchEvent(new Event('resize'))
      
      // デバウンス期間（150ms）より長く待機
      await new Promise(resolve => setTimeout(resolve, 200))
    })

    expect(result.current.viewportHeight).toBe(1000)
    expect(result.current.viewportHeight).not.toBe(initialViewportHeight)
  })

  it('モバイル表示の場合、サイドバーの幅を考慮しない', async () => {
    const { result } = renderHook(() => useViewportHeight())

    await act(async () => {
      window.innerWidth = 768 // モバイルサイズ
      window.dispatchEvent(new Event('resize'))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    expect(result.current.availableHeight).toBe(452) // 800 - 348
    expect(result.current.availableHeightMobile).toBe(700) // 800 - 100
  })

  it('デスクトップ表示の場合、サイドバーの幅を考慮する', async () => {
    const { result } = renderHook(() => useViewportHeight())

    await act(async () => {
      window.innerWidth = 1440 // デスクトップサイズ
      window.dispatchEvent(new Event('resize'))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    expect(result.current.availableHeight).toBe(452) // 800 - 348
    expect(result.current.availableHeightMobile).toBe(700) // 800 - 100
  })
})