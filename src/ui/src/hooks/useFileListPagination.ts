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
    
    // ファイル一覧画面の固定要素の高さを計算（コンパクト化）
    const sidebarHeight = 0; // サイドバーは横並びなので影響なし
    const mainPadding = 48; // メインコンテンツの上下パディング (p-4 lg:p-8) - 削減
    
    // ページヘッダー部分の高さ（コンパクト化）
    const titleHeight = 36; // h1 タグ (text-2xl lg:text-3xl + mb-1) - 削減
    const descriptionHeight = 20; // p タグ (text-sm lg:text-lg) - 削減
    const headerButtonHeight = 32; // 更新ボタン - 削減
    const headerSpacing = 12; // ヘッダー内の余白 (gap-3) - 削減
    const sectionSpacing = 16; // セクション間の余白 (space-y-4) - 削減
    
    // カード内ヘッダー（コンパクト化）
    const cardHeaderHeight = 48; // カード内タイトル + 件数表示 - 削減
    const cardPadding = 32; // カード内パディング (p-6) - 削減
    
    // ページネーション（コンパクト化）
    const paginationHeight = 60; // ページネーション全体 - 削減
    const paginationMargin = 16; // ページネーション上の余白 - 削減
    
    // エラー表示領域（表示される可能性を考慮）
    const errorAreaHeight = 0; // 通常は非表示
    
    // 安全マージン（レイアウトの微調整）
    const safetyMargin = 16; // 予期しない高さ変動への対応 - 削減
    
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
    
    // より少ない件数で表示するように調整
    const adjustedItems = Math.max(
      minItemsPerPage,
      Math.min(maxItemsPerPage, Math.floor(calculatedItems * 0.8)) // 80%に制限
    );
    
    console.log('File List Pagination Calculation:', {
      viewportHeight,
      totalFixedHeight,
      availableHeight,
      calculatedItems,
      adjustedItems
    });
    
    return adjustedItems;
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
