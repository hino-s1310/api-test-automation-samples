'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// export const metadata: Metadata = {
//   title: 'PDF to Markdown Converter',
//   description: 'Convert PDF files to Markdown format using AI',
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <html lang="ja">
      <head>
        <title>PDF to Markdown Converter</title>
        <meta name="description" content="Convert PDF files to Markdown format using AI" />
      </head>
      <body className={inter.className}>
        <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex overflow-hidden">
          {/* デスクトップ用サイドバー */}
          <div className="hidden lg:block flex-shrink-0">
            <Sidebar isOpen={true} onToggle={toggleSidebar} />
          </div>

          {/* モバイル用サイドバー */}
          <div className="lg:hidden">
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* トップバー（モバイル用ハンバーガーメニュー） */}
            <header className="bg-white shadow-sm border-b lg:hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-900">
                  PDF to Markdown
                </h1>
                <div className="w-10" /> {/* Spacer for center alignment */}
              </div>
            </header>

            {/* メインコンテンツエリア */}
            <main className="flex-1 p-4 lg:p-8 overflow-auto">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
