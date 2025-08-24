'use client';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // 総ページ数が少ない場合は全て表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 表示範囲を決定
      let startPage, endPage;
      
      if (currentPage <= 3) {
        // 最初の方のページ: 1, 2, 3, 4, 5 を表示
        startPage = 1;
        endPage = 5;
      } else if (currentPage >= totalPages - 2) {
        // 最後の方のページ: (total-4), (total-3), (total-2), (total-1), total を表示
        startPage = totalPages - 4;
        endPage = totalPages;
      } else {
        // 中央のページ: (current-2), (current-1), current, (current+1), (current+2) を表示
        startPage = currentPage - 2;
        endPage = currentPage + 2;
      }
      
      // 連続する5ページを表示
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // 先頭に省略記号と1を追加（必要な場合）
      if (startPage > 1) {
        if (startPage > 2) {
          pages.unshift('...');
        }
        pages.unshift(1);
      }
      
      // 末尾に省略記号と最終ページを追加（必要な場合）
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePrevious = () => {
    const newPage = currentPage - 1;
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const handleNext = () => {
    const newPage = currentPage + 1;
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
    }
  };

  const getItemRange = () => {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    return { start, end };
  };

  const { start, end } = getItemRange();
  const pageNumbers = getPageNumbers();

  return (
    <div className="card" data-testid="pagination-container">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* アイテム数の表示 */}
        <div className="text-sm text-gray-700" data-testid="item-range">
          <span>
            <span className="font-medium">{start}</span>-<span className="font-medium">{end}</span>件を表示（全
            <span className="font-medium">{totalItems}</span>件中）
          </span>
        </div>

        {/* ページネーション */}
        <div className="flex items-center space-x-2" data-testid="pagination-controls">
          {/* 前へボタン */}
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="previous-button"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            前へ
          </button>

          {/* ページ番号 */}
          <div className="flex items-center space-x-1" data-testid="page-numbers">
            {pageNumbers.map((pageNumber, index) => {
              if (pageNumber === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500" data-testid="ellipsis">
                    ...
                  </span>
                );
              }

              const isCurrentPage = pageNumber === currentPage;
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageClick(pageNumber as number)}
                  className={`relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isCurrentPage
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                  data-testid={`page-button-${pageNumber}`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          {/* 次へボタン */}
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="next-button"
          >
            次へ
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
