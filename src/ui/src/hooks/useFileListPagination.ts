import { useState, useEffect, useCallback } from 'react';

interface UseFileListPaginationOptions {
  minItemsPerPage: number;
  maxItemsPerPage: number;
  itemHeight: number;
}

export const useFileListPagination = ({
  minItemsPerPage,
  maxItemsPerPage,
  itemHeight,
}: UseFileListPaginationOptions) => {
  const [itemsPerPage, setItemsPerPage] = useState(minItemsPerPage);

  const calculateItemsPerPage = useCallback(() => {
    const viewportHeight = window.innerHeight;
    
    // ファイル一覧画面の固定要素の高さを計算
    const sidebarHeight = 0; // サイドバーは横並びなので影響なし
    const mainPadding = 64; // メインコンテンツの上下パディング (p-4 lg:p-8)
    
    // ページヘッダー部分の高さ（実測値に基づく調整）
    const titleHeight = 42; // h1 タグ (text-2xl lg:text-3xl + mb-2)
    const descriptionHeight = 24; // p タグ (text-sm lg:text-lg)
    const headerButtonHeight = 36; // 更新ボタン
    const headerSpacing = 16; // ヘッダー内の余白 (gap-4)
    const sectionSpacing = 24; // セクション間の余白 (space-y-6)
    
    // カード内ヘッダー
    const cardHeaderHeight = 56; // カード内タイトル + 件数表示 (実測調整)
    const cardPadding = 48; // カード内パディング (p-6)
    
    // ページネーション
    const paginationHeight = 76; // ページネーション全体（実測調整）
    const paginationMargin = 24; // ページネーション上の余白
    
    // エラー表示領域（表示される可能性を考慮）
    const errorAreaHeight = 0; // 通常は非表示
    
    // 安全マージン（レイアウトの微調整）
    const safetyMargin = 20; // 予期しない高さ変動への対応
    
    const totalFixedHeight = 
      mainPadding +
      titleHeight +
      descriptionHeight +
      headerButtonHeight +
      headerSpacing +
      sectionSpacing +
      cardHeaderHeight +
      cardPadding +
      paginationHeight +
      paginationMargin +
      errorAreaHeight +
      safetyMargin;
    
    const availableHeight = viewportHeight - totalFixedHeight;
    const calculatedItems = Math.floor(availableHeight / itemHeight);
    
    const clampedItems = Math.max(
      minItemsPerPage,
      Math.min(maxItemsPerPage, calculatedItems)
    );
    
    console.log('File List Pagination Calculation:', {
      viewportHeight,
      totalFixedHeight,
      availableHeight,
      calculatedItems,
      clampedItems
    });
    
    return clampedItems;
  }, [minItemsPerPage, maxItemsPerPage, itemHeight]);

  useEffect(() => {
    const updateItemsPerPage = () => {
      const newItemsPerPage = calculateItemsPerPage();
      setItemsPerPage(newItemsPerPage);
    };

    updateItemsPerPage();

    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateItemsPerPage();
      }, 150); // 150ms のデバウンス
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateItemsPerPage]);

  return {
    itemsPerPage,
    calculateItemsPerPage,
  };
};
