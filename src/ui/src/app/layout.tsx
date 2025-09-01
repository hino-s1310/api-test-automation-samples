'use client';

import { Inter } from 'next/font/google';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // タイトルを設定
  useEffect(() => {
    document.title = 'PDF to Markdown Converter';
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <html lang="ja">
      <head>
        <meta name="description" content="Convert PDF files to Markdown format using AI" />
      </head>
      <body className={inter.className}>
        <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex overflow-hidden" data-testid="app-container">
          {/* デスクトップ用サイドバー */}
          <div className="hidden lg:block flex-shrink-0" data-testid="desktop-sidebar">
            <Sidebar isOpen={true} />
          </div>

          {/* モバイル用サイドバー */}
          <div className="lg:hidden" data-testid="mobile-sidebar">
            <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} isMobile={true} />
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 flex flex-col min-h-0" data-testid="main-content">
            {/* トップバー（モバイル用ハンバーガーメニュー） */}
            <header className="bg-white shadow-sm border-b lg:hidden flex-shrink-0" data-testid="mobile-header">
              <div className="flex items-center justify-between px-4 py-2">
                <h1 className="text-lg font-semibold text-gray-900" data-testid="mobile-title">
                  PDF to Markdown
                </h1>
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700"
                  aria-label="メニューを開く"
                  data-testid="mobile-menu-button"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </header>

            {/* メインコンテンツエリア - パディングを調整 */}
            <main className="flex-1 p-3 lg:p-6 overflow-hidden" data-testid="main-content-area">
              <div className="max-w-7xl mx-auto h-full" data-testid="content-wrapper">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
