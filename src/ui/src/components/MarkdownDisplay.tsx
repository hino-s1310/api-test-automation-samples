'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { UploadResponse } from '@/types';
import RedactedMarkdown from './RedactedMarkdown';
import RedactionToggle from './RedactionToggle';
import RedactionControls from './RedactionControls';
import RedactionSettings from './RedactionSettings';
import TestGenerationPanel from './TestGenerationPanel';
import { RedactionSettings as RedactionSettingsType } from '../types/redaction';

interface MarkdownDisplayProps {
  result: UploadResponse;
  onNewUpload: () => void;
}

export default function MarkdownDisplay({ result, onNewUpload }: MarkdownDisplayProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw' | 'editable' | 'redacted' | 'test-generation'>('preview');
  const [copied, setCopied] = useState(false);
  const [editableContent, setEditableContent] = useState(result.markdown);

  // 赤セルシート関連の状態
  const [redactionSettings, setRedactionSettings] = useState<RedactionSettingsType | null>(null);
  const [showRedactionSettings, setShowRedactionSettings] = useState(false);
  const [showRedactionControls, setShowRedactionControls] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  const downloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([result.markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `converted-${result.id}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleContentChange = (newContent: string) => {
    setEditableContent(newContent);
  };

  // 赤セルシート関連のハンドラー
  const handleRedactionSettingsChange = (settings: Partial<RedactionSettingsType>) => {
    setRedactionSettings(prev => prev ? { ...prev, ...settings } : null);
  };

  const handleRedactionSave = async (settings: Partial<RedactionSettingsType>) => {
    // TODO: 実際の保存処理を実装
    console.log('Saving redaction settings:', settings);
  };

  const handleRedactionLoad = async (fileId: string) => {
    // TODO: 実際の読み込み処理を実装
    console.log('Loading redaction settings for file:', fileId);
  };

  const handleRedactionExport = async (fileId: string, settingsId: string) => {
    // TODO: 実際のエクスポート処理を実装
    console.log('Exporting redaction settings:', { fileId, settingsId });
  };

  const handleRedactionImport = async (fileId: string, settingsData: string) => {
    // TODO: 実際のインポート処理を実装
    console.log('Importing redaction settings:', { fileId, settingsData });
  };

  const getTabButtonClass = (tab: string) => {
    const baseClasses = "py-2 px-1 border-b-2 font-medium text-sm";
    const activeClasses = "border-blue-500 text-blue-600";
    const inactiveClasses = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

    return `${baseClasses} ${activeTab === tab ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="w-full h-full flex flex-col" data-testid="markdown-display-container">
      <div className="card h-full flex flex-col">
        {/* ヘッダー部分 - 固定サイズ */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0" data-testid="result-header">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900" data-testid="result-title">変換結果</h2>
          <div className="flex space-x-2">
            <button
              onClick={copyToClipboard}
              className={`btn-secondary text-sm ${copied ? 'bg-green-500 hover:bg-green-600' : ''}`}
              data-testid="copy-button"
            >
              {copied ? 'コピー済み!' : 'コピー'}
            </button>
            <button
              onClick={downloadMarkdown}
              className="btn-secondary text-sm"
              data-testid="download-button"
            >
              ダウンロード
            </button>
            {activeTab === 'redacted' && (
              <>
                <button
                  onClick={() => setShowRedactionSettings(!showRedactionSettings)}
                  className="btn-secondary text-sm"
                  data-testid="redaction-settings-button"
                >
                  {showRedactionSettings ? '設定を閉じる' : '赤セルシート設定'}
                </button>
                <button
                  onClick={() => setShowRedactionControls(!showRedactionControls)}
                  className="btn-secondary text-sm"
                  data-testid="redaction-controls-button"
                >
                  {showRedactionControls ? 'コントロールを閉じる' : '赤セルシートコントロール'}
                </button>
              </>
            )}
            <button
              onClick={onNewUpload}
              className="btn-primary text-sm"
              data-testid="new-file-button"
            >
              新しいファイル
            </button>
          </div>
        </div>

        {/* 成功メッセージ - 固定サイズ */}
        {result.message && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md flex-shrink-0" data-testid="success-message">
            <p className="text-xs lg:text-sm text-green-800">{result.message}</p>
          </div>
        )}

        {/* タブ部分 - 固定サイズ */}
        <div className="mb-3 flex-shrink-0" data-testid="tabs-section">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('preview')}
                className={getTabButtonClass('preview')}
                data-testid="preview-tab"
              >
                プレビュー
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={getTabButtonClass('raw')}
                data-testid="markdown-tab"
              >
                Markdown
              </button>
              <button
                onClick={() => setActiveTab('editable')}
                className={getTabButtonClass('editable')}
                data-testid="editable-tab"
              >
                編集可能プレビュー
              </button>
              <button
                onClick={() => setActiveTab('redacted')}
                className={getTabButtonClass('redacted')}
                data-testid="redacted-tab"
              >
                赤セルシート
              </button>
              <button
                onClick={() => setActiveTab('test-generation')}
                className={getTabButtonClass('test-generation')}
                data-testid="test-generation-tab"
              >
                テスト生成
              </button>
            </nav>
          </div>
        </div>

        {/* コンテンツ部分 - 残りの高さを使用、スクロールなし */}
        <div className="flex-1 min-h-0" data-testid="content-section">
          {activeTab === 'preview' ? (
            <div className="prose max-w-none prose-sm lg:prose-base h-full overflow-hidden" data-testid="preview-content">
              <div className="h-full overflow-y-auto">
                <ReactMarkdown>{result.markdown}</ReactMarkdown>
              </div>
            </div>
          ) : activeTab === 'raw' ? (
            <div className="h-full overflow-hidden" data-testid="raw-content-container">
              <pre className="bg-gray-50 p-3 rounded-md text-xs lg:text-sm overflow-auto whitespace-pre-wrap font-mono h-full">
                {result.markdown}
              </pre>
            </div>
          ) : activeTab === 'editable' ? (
            <div className="h-full overflow-hidden" data-testid="editable-content-container">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* 左側: 編集可能なMarkdown */}
                <div className="h-full">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700">Markdown編集</h4>
                  </div>
                  <textarea
                    value={editableContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-full p-3 font-mono text-sm border-0 resize-none focus:outline-none focus:ring-0"
                    placeholder="Markdownを編集してください..."
                    data-testid="editable-markdown-textarea"
                  />
                </div>

                {/* 右側: リアルタイムプレビュー */}
                <div className="h-full">
                  <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
                    <h4 className="text-sm font-medium text-blue-700">リアルタイムプレビュー</h4>
                  </div>
                  <div className="prose max-w-none prose-sm lg:prose-base h-full overflow-hidden">
                    <div className="h-full overflow-y-auto p-3">
                      <ReactMarkdown>{editableContent}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'test-generation' ? (
            <div className="h-full overflow-hidden" data-testid="test-generation-content-container">
              <TestGenerationPanel
                fileId={result.id}
                markdownContent={result.markdown}
              />
            </div>
          ) : (
            <div className="h-full overflow-hidden" data-testid="redacted-content-container">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                {/* 左側: 赤セルシート表示 */}
                <div className="lg:col-span-2 h-full">
                  <div className="bg-red-50 px-3 py-2 border-b border-red-200">
                    <h4 className="text-sm font-medium text-red-700">赤セルシート表示</h4>
                  </div>
                  <div className="h-full overflow-hidden">
                    <RedactedMarkdown
                      content={result.markdown}
                      redactionSettings={redactionSettings || undefined}
                      onSettingsChange={handleRedactionSettingsChange}
                      onSaveRequest={async (settings: RedactionSettingsType) => { setShowRedactionControls(true); }}
                      onLoadRequest={async () => { setShowRedactionControls(true); return null; }}
                      className="h-full"
                    />
                  </div>
                </div>

                {/* 右側: コントロールパネル */}
                <div className="h-full space-y-4">
                  {/* 赤セルシートトグル */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">表示制御</h5>
                    <RedactionToggle
                      elements={[]} // TODO: 実際の要素を渡す
                      state={{
                        showAll: redactionSettings?.show_all || false,
                        revealedItems: new Set(redactionSettings?.revealed_items || []),
                        levelSettings: redactionSettings?.level_settings || {
                          level1: true,
                          level2: true,
                          level3: true
                        },
                        isDirty: false,
                        settings: redactionSettings,
                        isLoading: false,
                        error: null,
                        isEditing: false,
                        isSaving: false,
                        isSettingsModalOpen: false,
                        isExportModalOpen: false,
                        isImportModalOpen: false
                      }}
                      actions={{
                        toggleShowAll: () => handleRedactionSettingsChange({ show_all: !redactionSettings?.show_all }),
                        toggleRevealedItem: (id: string) => {
                          const currentItems = redactionSettings?.revealed_items || [];
                          const newItems = currentItems.includes(id)
                            ? currentItems.filter(item => item !== id)
                            : [...currentItems, id];
                          handleRedactionSettingsChange({ revealed_items: newItems });
                        },
                        updateLevelSettings: (levelSettings: Record<string, boolean>) => {
                          handleRedactionSettingsChange({
                            level_settings: levelSettings
                          });
                        }
                      }}
                      compact={true}
                    />
                  </div>

                  {/* 赤セルシートコントロール */}
                  {showRedactionControls && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">設定管理</h5>
                      <RedactionControls
                        fileId={result.id}
                        settings={redactionSettings}
                        onSave={handleRedactionSave}
                        onLoad={handleRedactionLoad}
                        onExport={handleRedactionExport}
                        onImport={handleRedactionImport}
                        className="text-sm"
                      />
                    </div>
                  )}

                  {/* 赤セルシート設定 */}
                  {showRedactionSettings && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">詳細設定</h5>
                      <RedactionSettings
                        settings={redactionSettings}
                        onSettingsChange={handleRedactionSettingsChange}
                        onSave={async () => { await handleRedactionSave(redactionSettings || {}); }}
                        onLoad={async () => { await handleRedactionLoad(result.id); }}
                        onReset={() => setRedactionSettings(null)}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ファイル情報 - 固定サイズ */}
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md flex-shrink-0" data-testid="file-info">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-xs lg:text-sm text-blue-800">
                <strong>ファイルID:</strong> <span data-testid="file-id">{result.id}</span>
              </p>
              <p className="text-xs text-blue-600">
                文字数: {result.markdown.length.toLocaleString()}
              </p>
              {activeTab === 'editable' && (
                <p className="text-xs text-blue-600">
                  編集済み文字数: {editableContent.length.toLocaleString()}
                </p>
              )}
            </div>
            <p className="text-xs text-blue-600">
              このIDで後からファイルの取得・更新・削除が可能
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
