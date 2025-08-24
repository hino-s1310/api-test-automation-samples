'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadState } from '@/types';

interface FileUploadProps {
  onUpload: (file: File) => void;
  uploadState: UploadState;
}

export default function FileUpload({ onUpload, uploadState }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file.type === 'application/pdf') {
          onUpload(file);
        } else {
          alert('PDFファイルのみアップロード可能です。');
        }
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    disabled: uploadState.isLoading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        data-testid="file-dropzone"
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploadState.isLoading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            {uploadState.isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" data-testid="loading-spinner"></div>
            ) : (
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            )}
          </div>
          
          <div className="text-center">
            <h3 className="text-base font-medium text-gray-900 mb-1" data-testid="upload-title">
              {uploadState.isLoading ? 'アップロード中...' : 'PDFファイルをアップロード'}
            </h3>
            <p className="text-xs text-gray-500" data-testid="upload-description">
              {uploadState.isLoading 
                ? 'ファイルを変換しています。しばらくお待ちください。'
                : isDragActive 
                  ? 'ここにファイルをドロップしてください'
                  : 'ドラッグ&ドロップまたはクリックしてファイルを選択'
              }
            </p>
          </div>
          
          {!uploadState.isLoading && (
            <button
              type="button"
              className="btn-primary text-sm py-1 px-3"
              disabled={uploadState.isLoading}
              data-testid="select-file-button"
            >
              ファイルを選択
            </button>
          )}
        </div>
      </div>
      
      {uploadState.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md" data-testid="upload-error">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2">
              <h3 className="text-xs font-medium text-red-800">エラーが発生しました</h3>
              <div className="mt-1 text-xs text-red-700">
                <p data-testid="error-message">{uploadState.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
