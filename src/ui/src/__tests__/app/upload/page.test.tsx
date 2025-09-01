import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadPageClient from '../../../app/upload/UploadPageClient';

// APIモック
jest.mock('../../../lib/api', () => ({
  api: {
    uploadPdf: jest.fn(),
  }
}));

import { api } from '../../../lib/api';
const mockApi = api as jest.Mocked<typeof api>;

// フックモック
jest.mock('@/hooks/useViewportHeight', () => ({
  useViewportHeight: () => ({
    availableHeight: 800,
    availableHeightMobile: 600,
  }),
}));

describe('UploadPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload page with title and description', () => {
    render(<UploadPageClient />);

    expect(screen.getByText('アップロード')).toBeInTheDocument();
    expect(screen.getByText('PDFファイルをアップロードしてMarkdown形式に変換します。')).toBeInTheDocument();
  });

  it('displays file upload section', () => {
    render(<UploadPageClient />);

    expect(screen.getByText('ファイルアップロード')).toBeInTheDocument();
    expect(screen.getByTestId('upload-card')).toBeInTheDocument();
  });

  it('displays usage instructions', () => {
    render(<UploadPageClient />);

    expect(screen.getByText('使用方法')).toBeInTheDocument();
    expect(screen.getByText('PDFファイルをドラッグ&ドロップ')).toBeInTheDocument();
    expect(screen.getByText('自動変換開始')).toBeInTheDocument();
    expect(screen.getByText('右側にプレビュー表示')).toBeInTheDocument();
    expect(screen.getByText('コピー・ダウンロード可能')).toBeInTheDocument();
  });

  it('displays usage note about file size limit', () => {
    render(<UploadPageClient />);

    expect(screen.getByText('注意:')).toBeInTheDocument();
    expect(screen.getByText('10MB以下のPDFファイルのみ対応')).toBeInTheDocument();
  });

  it('shows empty state initially', () => {
    render(<UploadPageClient />);

    expect(screen.getByText('変換結果がここに表示されます')).toBeInTheDocument();
    expect(screen.getByText('PDFファイルをアップロードすると、Markdownがここに表示されます。')).toBeInTheDocument();
  });

  it('displays file upload component with correct elements', () => {
    render(<UploadPageClient />);

    // FileUploadコンポーネントの要素が表示されていることを確認
    expect(screen.getByTestId('file-dropzone')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
    expect(screen.getByTestId('upload-title')).toHaveTextContent('PDFファイルをアップロード');
    expect(screen.getByTestId('upload-description')).toHaveTextContent('ドラッグ&ドロップまたはクリックしてファイルを選択');
    expect(screen.getByTestId('select-file-button')).toHaveTextContent('ファイルを選択');
  });

  it('maintains accessibility features', () => {
    render(<UploadPageClient />);

    // 適切なテストIDが設定されていることを確認
    expect(screen.getByTestId('upload-page')).toBeInTheDocument();
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByTestId('upload-section')).toBeInTheDocument();
    expect(screen.getByTestId('result-section')).toBeInTheDocument();
    expect(screen.getByTestId('upload-card')).toBeInTheDocument();
    expect(screen.getByTestId('usage-card')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('displays correct layout structure', () => {
    render(<UploadPageClient />);

    // ページタイトル
    expect(screen.getByTestId('page-title')).toHaveTextContent('アップロード');

    // ページ説明
    expect(screen.getByTestId('page-description')).toHaveTextContent('PDFファイルをアップロードしてMarkdown形式に変換します。');

    // アップロードカードタイトル
    expect(screen.getByTestId('upload-card-title')).toHaveTextContent('ファイルアップロード');

    // 使用方法タイトル
    expect(screen.getByTestId('usage-title')).toHaveTextContent('使用方法');

    // 空の状態のタイトルと説明
    expect(screen.getByTestId('empty-title')).toHaveTextContent('変換結果がここに表示されます');
    expect(screen.getByTestId('empty-description')).toHaveTextContent('PDFファイルをアップロードすると、Markdownがここに表示されます。');
  });

  it('has correct grid layout structure', () => {
    render(<UploadPageClient />);

    // メインコンテンツが2カラムのグリッドレイアウトになっていることを確認
    const mainContent = screen.getByTestId('main-content');
    expect(mainContent).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2');
  });

  it('displays usage steps in correct format', () => {
    render(<UploadPageClient />);

    // 使用方法のステップが正しく表示されていることを確認
    const usageSteps = screen.getByTestId('usage-steps');
    expect(usageSteps).toHaveClass('grid', 'grid-cols-2', 'gap-2');

    // 各ステップの番号が正しく表示されていることを確認
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
    expect(screen.getByText('4.')).toBeInTheDocument();
  });
});
