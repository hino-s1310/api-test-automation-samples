import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PDF to Markdown Converter',
  description: 'Convert PDF files to Markdown format using AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex overflow-hidden" data-testid="app-container">
          {/* デスクトップ用サイドバー */}
          <div className="hidden lg:block flex-shrink-0" data-testid="desktop-sidebar">
            <Sidebar isOpen={true} onToggle={() => {}} />
          </div>

          {/* モバイル用サイドバー */}
          <div className="lg:hidden" data-testid="mobile-sidebar">
            <Sidebar isOpen={false} onToggle={() => {}} />
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 flex flex-col min-h-0" data-testid="main-content">
            {/* トップバー（モバイル用ハンバーガーメニュー） */}
            <header className="bg-white shadow-sm border-b lg:hidden flex-shrink-0" data-testid="mobile-header">
              <div className="flex items-center justify-between px-4 py-2">
                <h1 className="text-lg font-semibold text-gray-900" data-testid="mobile-title">
                  PDF to Markdown
                </h1>
                <div className="w-10" /> {/* Spacer for center alignment */}
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
