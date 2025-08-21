'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ isOpen, onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      href: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      label: 'アップロード',
      description: 'PDFをMarkdownに変換',
    },
    {
      href: '/files',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: 'ファイル一覧',
      description: '変換済みファイル管理',
    },
  ];

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* サイドバー */}
      <div className={`
        fixed top-0 left-0 h-screen bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-none lg:h-screen
        w-64
        overflow-hidden
        flex flex-col
      `}>
        {/* ヘッダー */}
        <div className="flex items-center p-4 border-b flex-shrink-0">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <span className="font-bold text-gray-900 whitespace-nowrap">
                PDF Converter
              </span>
            </div>
          </div>
          
          {/* 閉じるボタン（モバイルのみ） */}
          {isMobile && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 lg:hidden"
              aria-label="サイドバーを閉じる"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* メニューアイテム */}
        <nav className="flex-1 mt-8 px-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (isMobile) {
                        onClose();
                      }
                    }}
                    className={`
                      flex items-center p-3 rounded-lg transition-colors duration-200
                      ${isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className={`
                      flex-shrink-0 transition-colors duration-200
                      ${isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'}
                    `}>
                      {item.icon}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium whitespace-nowrap">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{item.description}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* フッター */}
        <div className="px-4 py-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-xs text-gray-500 whitespace-nowrap">
              PDF to Markdown
            </p>
            <p className="text-xs text-gray-400 whitespace-nowrap">
              v1.0.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}