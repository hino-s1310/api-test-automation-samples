'use client';

import React, { useCallback, useMemo } from 'react';
import {
  RedactionLevel,
  RedactionState,
  REDACTION_LEVELS
} from '../types/redaction';

export interface RedactionToggleProps {
  /** 赤セルシート状態 */
  state: RedactionState;
  /** アクション関数 */
  actions: {
    toggleShowAll: () => void;
    toggleRevealedItem: (item: string) => void;
    updateLevelSettings: (levelSettings: Record<string, boolean>) => void;
  };
  /** 赤セルシート要素のリスト */
  elements: Array<{
    id: string;
    level: RedactionLevel;
    content: string;
    isVisible: boolean;
  }>;
  /** カスタムCSSクラス */
  className?: string;
  /** コンパクトモード */
  compact?: boolean;
  /** レベル別表示の有効/無効 */
  showLevelControls?: boolean;
  /** 個別項目表示の有効/無効 */
  showItemControls?: boolean;
  /** アクセシビリティ用のラベル */
  'aria-label'?: string;
}

export default function RedactionToggle({
  state,
  actions,
  elements,
  className = '',
  compact = false,
  showLevelControls = true,
  showItemControls = true,
  'aria-label': ariaLabel = '赤セルシート表示制御'
}: RedactionToggleProps) {
  // 統計情報を計算
  const stats = useMemo(() => {
    const totalElements = elements.length;
    const visibleElements = elements.filter(el => el.isVisible).length;
    const hiddenElements = totalElements - visibleElements;

    const levelStats = Object.keys(REDACTION_LEVELS).reduce((acc, level) => {
      const levelElements = elements.filter(el => el.level === level);
      acc[level as RedactionLevel] = {
        total: levelElements.length,
        visible: levelElements.filter(el => el.isVisible).length,
        hidden: levelElements.length - levelElements.filter(el => el.isVisible).length
      };
      return acc;
    }, {} as Record<RedactionLevel, { total: number; visible: number; hidden: number }>);

    return {
      total: totalElements,
      visible: visibleElements,
      hidden: hiddenElements,
      levels: levelStats
    };
  }, [elements]);

  // 全表示切り替え
  const handleToggleShowAll = useCallback(() => {
    actions.toggleShowAll();
  }, [actions]);

  // レベル別設定変更
  const handleLevelToggle = useCallback((level: RedactionLevel) => {
    const newLevelSettings = {
      ...state.levelSettings,
      [level]: !state.levelSettings[level]
    };
    actions.updateLevelSettings(newLevelSettings);
  }, [actions, state.levelSettings]);

  // 個別項目切り替え
  const handleItemToggle = useCallback((itemId: string) => {
    actions.toggleRevealedItem(itemId);
  }, [actions]);

  // レベル別一括切り替え
  const handleLevelBulkToggle = useCallback((level: RedactionLevel, show: boolean) => {
    const newLevelSettings = {
      ...state.levelSettings,
      [level]: show
    };
    actions.updateLevelSettings(newLevelSettings);
  }, [actions, state.levelSettings]);

  return (
    <div
      className={`redaction-toggle ${className}`}
      aria-label={ariaLabel}
      role="toolbar"
      aria-orientation="vertical"
      data-testid="redaction-toggle"
    >
      {/* 統計情報 */}
      <div className="mb-3 p-2 bg-gray-50 border rounded text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">赤セルシート統計</span>
          <span className="text-gray-600">
            {stats.visible}/{stats.total} 表示中
          </span>
        </div>
        {stats.hidden > 0 && (
          <div className="mt-1 text-xs text-red-600">
            {stats.hidden}個の項目が非表示
          </div>
        )}
      </div>

      {/* 全表示切り替え */}
      <div className="mb-3">
        <button
          onClick={handleToggleShowAll}
          className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            state.showAll
              ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200'
              : 'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'
          }`}
          aria-pressed={state.showAll}
          data-testid="toggle-show-all"
        >
          {state.showAll ? '🔓 全表示中' : '🔒 全非表示中'}
        </button>
      </div>

      {/* レベル別制御 */}
      {showLevelControls && !compact && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">レベル別表示制御</h4>
          <div className="space-y-2">
            {Object.keys(REDACTION_LEVELS).map(level => {
              const levelInfo = REDACTION_LEVELS[level as RedactionLevel];
              const levelStat = stats.levels[level as RedactionLevel];
              const isEnabled = state.levelSettings[level as RedactionLevel];

              return (
                <div key={level} className="flex items-center justify-between p-2 bg-white border rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      {levelInfo.icon}
                    </span>
                    <span className="text-sm font-medium">
                      {levelInfo.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({levelStat.visible}/{levelStat.total})
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleLevelBulkToggle(level as RedactionLevel, false)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      disabled={!isEnabled}
                      data-testid={`hide-level-${level}`}
                    >
                      非表示
                    </button>
                    <button
                      onClick={() => handleLevelToggle(level as RedactionLevel)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        isEnabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      data-testid={`toggle-level-${level}`}
                    >
                      {isEnabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => handleLevelBulkToggle(level as RedactionLevel, true)}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      disabled={isEnabled}
                      data-testid={`show-level-${level}`}
                    >
                      表示
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 個別項目制御 */}
      {showItemControls && !compact && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">個別項目制御</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {elements.map(element => (
              <div key={element.id} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className="text-xs">
                    {REDACTION_LEVELS[element.level].icon}
                  </span>
                  <span className="truncate" title={element.content}>
                    {element.content.length > 30
                      ? `${element.content.substring(0, 30)}...`
                      : element.content
                    }
                  </span>
                </div>
                <button
                  onClick={() => handleItemToggle(element.id)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    element.isVisible
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                  data-testid={`toggle-item-${element.id}`}
                >
                  {element.isVisible ? '表示' : '非表示'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* コンパクトモード用の簡易制御 */}
      {compact && (
        <div className="flex space-x-2">
          <button
            onClick={handleToggleShowAll}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              state.showAll
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
            data-testid="compact-toggle-show-all"
          >
            {state.showAll ? '全表示' : '全非表示'}
          </button>
          {Object.keys(REDACTION_LEVELS).map(level => {
            const isEnabled = state.levelSettings[level];
            return (
              <button
                key={level}
                onClick={() => handleLevelToggle(level as RedactionLevel)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  isEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
                data-testid={`compact-toggle-level-${level}`}
              >
                {REDACTION_LEVELS[level as RedactionLevel].icon}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
