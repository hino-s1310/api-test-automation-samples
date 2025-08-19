import { useState, useEffect } from 'react';

interface UseResponsivePaginationProps {
  minItemsPerPage?: number;
  maxItemsPerPage?: number;
  itemHeight?: number;
  headerHeight?: number;
  paginationHeight?: number;
  marginHeight?: number;
}

export const useResponsivePagination = ({
  minItemsPerPage = 5,
  maxItemsPerPage = 20,
  itemHeight = 70, // テーブル行の高さ（約70px）
  headerHeight = 200, // ヘッダー部分の高さ
  paginationHeight = 100, // ページネーション部分の高さ
  marginHeight = 100, // 余白
}: UseResponsivePaginationProps = {}) => {
  const [itemsPerPage, setItemsPerPage] = useState(minItemsPerPage);

  const calculateItemsPerPage = () => {
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - headerHeight - paginationHeight - marginHeight;
    const calculatedItems = Math.floor(availableHeight / itemHeight);
    
    // 最小値と最大値の範囲内に収める
    const clampedItems = Math.max(
      minItemsPerPage, 
      Math.min(maxItemsPerPage, calculatedItems)
    );
    
    return clampedItems;
  };

  useEffect(() => {
    const updateItemsPerPage = () => {
      const newItemsPerPage = calculateItemsPerPage();
      setItemsPerPage(newItemsPerPage);
    };

    // 初期設定
    updateItemsPerPage();

    // デバウンス機能付きリサイズハンドラー
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateItemsPerPage();
      }, 150); // 150ms のデバウンス
    };

    window.addEventListener('resize', handleResize);
    
    // クリーンアップ
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [minItemsPerPage, maxItemsPerPage, itemHeight, headerHeight, paginationHeight, marginHeight]);

  return {
    itemsPerPage,
    calculateItemsPerPage,
  };
};
