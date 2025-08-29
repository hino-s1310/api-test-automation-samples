'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FileInfo } from '@/types';

interface BatchOperationsProps {
  selectedFiles: string[];
  onOperationComplete: () => void;
  onClose: () => void;
}

export default function BatchOperations({
  selectedFiles,
  onOperationComplete,
  onClose
}: BatchOperationsProps) {
  const [loading, setLoading] = useState(false);
  const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);
  const [results, setResults] = useState<{
    success: boolean;
    message: string;
    results: Array<{
      file_id: string;
      success: boolean;
      error?: string;
    }>;
  } | null>(null);

  // 選択されたファイルの情報を取得
  useEffect(() => {
    const fetchFileInfos = async () => {
      if (selectedFiles.length === 0) return;

      try {
        const infos: FileInfo[] = [];
        for (const fileId of selectedFiles) {
          try {
            const fileInfo = await api.getFile(fileId);
            infos.push(fileInfo);
          } catch (error) {
            // ファイル情報が取得できない場合は、IDのみで表示
            infos.push({
              id: fileId,
              filename: `不明なファイル (${fileId})`,
              markdown: '',
              created_at: '',
              updated_at: ''
            });
          }
        }
        setFileInfos(infos);
      } catch (error) {
        console.error('ファイル情報の取得に失敗しました:', error);
      }
    };

    fetchFileInfos();
  }, [selectedFiles]);

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    try {
      // 一括削除
      const result = await api.batchDeleteFiles(selectedFiles);

      setResults({
        success: true,
        message: result.message,
        results: selectedFiles.map(fileId => ({
          file_id: fileId,
          success: true,
          error: undefined
        }))
      });

      // 成功時は少し待ってから閉じる
      setTimeout(() => {
        onOperationComplete();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('一括削除中にエラーが発生しました:', error);
      setResults({
        success: false,
        message: error.message || '一括削除に失敗しました',
        results: selectedFiles.map(fileId => ({
          file_id: fileId,
          success: false,
          error: error.message || '削除に失敗しました'
        }))
      });
    } finally {
      setLoading(false);
    }
  };

  const getOperationTitle = () => {
    return `一括削除 (${selectedFiles.length}件)`;
  };

  const getOperationDescription = () => {
    return '選択されたファイルを一括で削除します。この操作は取り消せません。';
  };

  const getConfirmationMessage = () => {
    return `選択された${selectedFiles.length}件のファイルを削除しますか？この操作は取り消せません。`;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" data-testid="batch-operations-modal">
      <div className="relative top-2 sm:top-4 mx-auto p-3 sm:p-4 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 max-w-6xl shadow-lg rounded-md bg-white h-[90vh] sm:h-[85vh] overflow-hidden">
        <div className="h-full flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate pr-2" data-testid="batch-operations-title">
              {getOperationTitle()}
            </h3>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-1"
              data-testid="batch-operations-close-button"
              aria-label="一括操作モーダルを閉じる"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* スクロール可能なコンテンツエリア */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* 説明 */}
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs sm:text-sm text-blue-800">{getOperationDescription()}</p>
            </div>

            {/* 選択されたファイル一覧 */}
            <div className="mb-3 sm:mb-4">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">選択されたファイル</h4>
              <div className="max-h-20 sm:max-h-24 overflow-y-auto border border-gray-200 rounded-md p-2">
                {fileInfos.map((file, index) => (
                  <div key={file.id} className="text-xs sm:text-sm text-gray-600 py-1 truncate">
                    {index + 1}. {file.filename}
                  </div>
                ))}
              </div>
            </div>

            {/* 確認メッセージ */}
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs sm:text-sm text-yellow-800">{getConfirmationMessage()}</p>
            </div>

            {/* 結果表示 */}
            {results && (
              <div className="mb-3 sm:mb-4">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">操作結果</h4>
                <div className={`p-2 sm:p-3 rounded-md mb-2 sm:mb-3 ${
                  results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-xs sm:text-sm ${
                    results.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {results.message}
                  </p>
                </div>
                <div className="max-h-20 sm:max-h-24 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {results.results.map((result, index) => (
                    <div
                      key={index}
                      className={`text-xs sm:text-sm py-1 ${
                        result.success ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {index + 1}. {result.file_id}: {result.success ? '成功' : `失敗 - ${result.error}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* アクションボタン - 固定位置 */}
          <div className="flex justify-end space-x-2 sm:space-x-3 pt-3 sm:pt-4 border-t border-gray-200 flex-shrink-0 mt-3 sm:mt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="batch-operations-cancel-button"
              aria-label="一括操作をキャンセル"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="batch-operations-submit-button"
              aria-label="一括削除を実行"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                  <span className="text-xs sm:text-sm">処理中</span>
                </div>
              ) : (
                '削除実行'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
