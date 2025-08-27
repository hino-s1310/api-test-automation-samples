import { useState, useEffect, useCallback } from 'react';

export const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(0);

  const updateHeight = useCallback(() => {
    setViewportHeight(window.innerHeight);
  }, []);

  useEffect(() => {
    updateHeight();

    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateHeight();
      }, 150); // 150ms のデバウンス
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [updateHeight]);

  return {
    viewportHeight,
    // サイドバー（256px）とパディング（32px）、ヘッダー（60px）を考慮
    availableHeight: Math.max(0, viewportHeight - 348),
    // モバイルの場合は、モバイルヘッダー（68px）とパディング（32px）を考慮
    availableHeightMobile: Math.max(0, viewportHeight - 100),
  };
};
