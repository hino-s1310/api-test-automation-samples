'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  RedactionSettings,
  RedactionElement,
  RedactionLevel,
  RedactionState
} from '../types/redaction';
import { parseRedactionElements, convertElementsToMarkdown } from '../utils/redactionParser';
import { renderRedactionElement } from '../utils/redactionRenderer';
import { useRedaction } from '../hooks/useRedaction';

export interface RedactedMarkdownProps {
  /** Markdownコンテンツ */
  content: string;
  /** 赤セルシート設定 */
  redactionSettings?: RedactionSettings;
  /** 設定変更時のコールバック */
  onSettingsChange?: (settings: RedactionSettings) => void;
  /** 保存要求時のコールバック */
  onSaveRequest?: (settings: RedactionSettings) => Promise<void>;
  /** 読み込み要求時のコールバック */
  onLoadRequest?: () => Promise<RedactionSettings | null>;
  /** 初期状態の設定 */
  initialRedactionState?: Partial<RedactionState>;
  /** デバッグモード */
  debug?: boolean;
  /** 自動保存の有効/無効 */
  autoSave?: boolean;
  /** カスタムCSSクラス */
  className?: string;
  /** アクセシビリティ用のラベル */
  'aria-label'?: string;
}

export default function RedactedMarkdown({
  content,
  redactionSettings,
  onSettingsChange,
  onSaveRequest,
  onLoadRequest,
  initialRedactionState,
  debug = false,
  autoSave = true,
  className = '',
  'aria-label': ariaLabel = '赤セルシート付きMarkdown表示'
}: RedactedMarkdownProps) {
  // 赤セルシート状態管理
  const {
    state,
    actions,
    utils
  } = useRedaction({
    initialSettings: redactionSettings ? {
      showAll: redactionSettings.show_all,
      revealedItems: new Set(redactionSettings.revealed_items),
      levelSettings: redactionSettings.level_settings
    } : undefined,
    debug,
    autoSave
  });

  // Markdownから赤セルシート要素を解析
  const parseResult = useMemo(() => {
    return parseRedactionElements(
      content,
      state.revealedItems,
      state.showAll,
      state.levelSettings
    );
  }, [content, state.revealedItems, state.showAll, state.levelSettings]);

  // 設定変更時の処理
  const handleSettingsChange = useCallback(() => {
    if (onSettingsChange && redactionSettings) {
      const updatedSettings: RedactionSettings = {
        ...redactionSettings,
        show_all: state.showAll,
        revealed_items: Array.from(state.revealedItems),
        level_settings: state.levelSettings
      };
      onSettingsChange(updatedSettings);
    }
  }, [onSettingsChange, redactionSettings, state.showAll, state.revealedItems, state.levelSettings]);

  // 設定変更を監視
  useEffect(() => {
    if (state.isDirty) {
      handleSettingsChange();
    }
  }, [state.isDirty, handleSettingsChange]);

  // カスタムレンダラー関数
  const customRenderers = useMemo(() => ({
    // テキストノードのカスタムレンダリング
    text: ({ children }: { children: string }) => {
      // 赤セルシート要素をHTMLに変換
      const htmlContent = convertElementsToMarkdown(parseResult.elements, content);
      return <span dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    }
  }), [parseResult.elements]);

  // 処理されたMarkdownコンテンツ
  const processedContent = useMemo(() => {
    // 赤セルシート要素を処理したMarkdownに変換
    return convertElementsToMarkdown(parseResult.elements, content);
  }, [parseResult.elements, content]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          actions.toggleShowAll();
        }
        break;
      case 'Escape':
        // Escapeキーでモーダルを閉じる（個別のモーダルを閉じる）
        actions.closeSettingsModal();
        actions.closeExportModal();
        actions.closeImportModal();
        break;
      case 'ArrowRight':
      case 'ArrowLeft':
        // 赤セルシート要素間のナビゲーション
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const visibleElements = parseResult.elements.filter(el => el.isVisible);
          const currentIndex = visibleElements.findIndex(el =>
            document.activeElement?.getAttribute('data-element-id') === el.id
          );

          if (currentIndex !== -1) {
            const nextIndex = event.key === 'ArrowRight'
              ? (currentIndex + 1) % visibleElements.length
              : (currentIndex - 1 + visibleElements.length) % visibleElements.length;

            const nextElement = document.querySelector(
              `[data-element-id="${visibleElements[nextIndex].id}"]`
            ) as HTMLElement;

            if (nextElement) {
              nextElement.focus();
            }
          }
        }
        break;
      case 'Enter':
      case ' ':
        // フォーカスされた赤セルシート要素の切り替え
        if (event.target instanceof HTMLElement) {
          const redactionElement = event.target.closest('[data-element-id]');
          if (redactionElement) {
            event.preventDefault();
            const elementId = redactionElement.getAttribute('data-element-id');
            if (elementId) {
              actions.toggleRevealedItem(elementId);
            }
          }
        }
        break;
      default:
        break;
    }
  }, [actions, parseResult.elements]);

  // クリックイベントハンドラー
  const handleClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const redactionElement = target.closest('[data-element-id]');

    if (redactionElement) {
      const elementId = redactionElement.getAttribute('data-element-id');
      if (elementId) {
        actions.toggleRevealedItem(elementId);
      }
    }
  }, [actions]);

  return (
    <div
      className={`redacted-markdown ${className}`}
      aria-label={ariaLabel}
      role="region"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      data-testid="redacted-markdown"
    >
      {/* デバッグ情報 */}
      {debug && (
        <div className="debug-panel mb-4 p-3 bg-gray-100 border rounded text-xs">
          <h4 className="font-bold mb-2">デバッグ情報</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <strong>総要素数:</strong> {parseResult.elements.length}
            </div>
            <div>
              <strong>表示要素数:</strong> {parseResult.totalRevealedCount}
            </div>
            <div>
              <strong>非表示要素数:</strong> {parseResult.totalRedactedCount}
            </div>
            <div>
              <strong>全表示:</strong> {state.showAll ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
      )}

      {/* Markdownコンテンツ */}
      <div className="prose max-w-none" data-testid="markdown-content">
        <ReactMarkdown>
          {processedContent}
        </ReactMarkdown>
      </div>

      {/* アクセシビリティ用の説明 */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        赤セルシート要素: {parseResult.totalRedactedCount}個の非表示要素、
        {parseResult.totalRevealedCount}個の表示要素があります。
        キーボードショートカット: Ctrl+Rで全表示切り替え、
        Ctrl+左右矢印で要素間移動、EnterまたはSpaceで個別表示切り替え。
        マウス操作: クリックで個別表示切り替えが可能です。
      </div>

      {/* キーボードショートカットの説明（デバッグモード時のみ表示） */}
      {debug && (
        <div className="debug-panel mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
          <h4 className="font-bold mb-2 text-blue-800">キーボードショートカット</h4>
          <ul className="space-y-1 text-blue-700">
            <li><kbd className="px-1 bg-blue-100 rounded">Ctrl+R</kbd> 全表示切り替え</li>
            <li><kbd className="px-1 bg-blue-100 rounded">Ctrl+←/→</kbd> 赤セルシート要素間移動</li>
            <li><kbd className="px-1 bg-blue-100 rounded">Enter/Space</kbd> フォーカス要素の表示切り替え</li>
            <li><kbd className="px-1 bg-blue-100 rounded">Escape</kbd> モーダルを閉じる</li>
          </ul>
        </div>
      )}
    </div>
  );
}
