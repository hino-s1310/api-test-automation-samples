/**
 * 赤セルシート要素のレンダリングユーティリティ
 * 赤セルシート要素をHTMLに変換し、スタイルを適用する
 */

import {
  RedactionElement,
  RedactionLevel,
  REDACTION_LEVELS
} from '../types/redaction';

/**
 * 赤セルシート要素のレンダリングオプション
 */
export interface RedactionRenderOptions {
  showTooltip?: boolean;
  enableClick?: boolean;
  customStyles?: Record<string, string>;
  theme?: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
}

/**
 * 赤セルシート要素をHTMLにレンダリング
 * @param element 赤セルシート要素
 * @param options レンダリングオプション
 * @returns HTML文字列
 */
export function renderRedactionElement(
  element: RedactionElement,
  options: RedactionRenderOptions = {}
): string {
  const {
    showTooltip = true,
    enableClick = true,
    customStyles = {},
    theme = 'light',
    size = 'medium'
  } = options;

  const levelInfo = REDACTION_LEVELS[element.level];
  const baseStyles = getBaseStyles(levelInfo, theme, size);
  const mergedStyles = { ...baseStyles, ...customStyles };

  const styleString = Object.entries(mergedStyles)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');

  const classes = [
    'redaction-cell',
    `level-${element.level.replace('level', '')}`,
    element.isVisible ? 'revealed' : '',
    enableClick ? 'redaction-clickable' : ''
  ].filter(Boolean).join(' ');

  const tooltip = showTooltip ? `title="${levelInfo.label}: ${element.content}"` : '';
  const clickHandler = enableClick ? `onclick="toggleRedactionElement('${element.id}')"` : '';

  return `<span
    class="${classes}"
    data-element-id="${element.id}"
    data-level="${element.level}"
    data-content="${escapeHtml(element.content)}"
    style="${styleString}"
    ${tooltip}
    ${clickHandler}
  >${levelInfo.icon} ${levelInfo.label}</span>`;
}

/**
 * 赤セルシート要素の一覧をHTMLにレンダリング
 * @param elements 赤セルシート要素の配列
 * @param options レンダリングオプション
 * @returns HTML文字列
 */
export function renderRedactionElements(
  elements: RedactionElement[],
  options: RedactionRenderOptions = {}
): string {
  return elements
    .map(element => renderRedactionElement(element, options))
    .join('');
}

/**
 * 赤セルシート要素のCSSスタイルを生成
 * @param level レベル
 * @param theme テーマ
 * @param size サイズ
 * @returns CSSスタイルオブジェクト
 */
export function generateRedactionStyles(
  level: RedactionLevel,
  theme: 'light' | 'dark' = 'light',
  size: 'small' | 'medium' | 'large' = 'medium'
): Record<string, string> {
  const levelInfo = REDACTION_LEVELS[level];
  const baseStyles = getBaseStyles(levelInfo, theme, size);

  return {
    ...baseStyles,
    transition: 'all 0.2s ease-in-out',
    userSelect: 'none',
    display: 'inline-block',
    verticalAlign: 'baseline'
  };
}

/**
 * 赤セルシート要素のCSSクラスを生成
 * @param level レベル
 * @param theme テーマ
 * @param size サイズ
 * @returns CSSクラス文字列
 */
export function generateRedactionClasses(
  level: RedactionLevel,
  theme: 'light' | 'dark' = 'light',
  size: 'small' | 'medium' | 'large' = 'medium'
): string {
  return [
    'redaction-cell',
    `level-${level.replace('level', '')}`,
    'redaction-clickable'
  ].join(' ');
}

/**
 * 赤セルシート要素のアニメーションCSSを生成
 * @returns CSS文字列
 */
export function generateRedactionAnimations(): string {
  return `
    @keyframes redaction-pulse {
      0% { opacity: 0.8; }
      50% { opacity: 1; }
      100% { opacity: 0.8; }
    }

    @keyframes redaction-reveal {
      0% {
        background-color: var(--redaction-bg);
        color: var(--redaction-text);
      }
      100% {
        background-color: transparent;
        color: var(--text-color);
      }
    }

    @keyframes redaction-hide {
      0% {
        background-color: transparent;
        color: var(--text-color);
      }
      100% {
        background-color: var(--redaction-bg);
        color: var(--redaction-text);
      }
    }

    .redaction-cell {
      animation: redaction-pulse 2s infinite;
    }

    .redaction-cell.revealed {
      animation: redaction-reveal 0.3s ease-in-out;
    }

    .redaction-cell.hidden {
      animation: redaction-hide 0.3s ease-in-out;
    }
  `;
}

/**
 * 赤セルシート要素の基本CSSを生成
 * @returns CSS文字列
 */
export function generateRedactionBaseCSS(): string {
  return `
    .redaction-cell {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      user-select: none;
      vertical-align: baseline;
      white-space: nowrap;
    }

    .redaction-cell:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .redaction-cell.redaction-clickable {
      cursor: pointer;
    }

    .redaction-cell.redaction-clickable:hover {
      opacity: 0.9;
    }

    .redaction-cell.level-1 {
      background-color: #dc2626;
    }

    .redaction-cell.level-2 {
      background-color: #ea580c;
    }

    .redaction-cell.level-3 {
      background-color: #d97706;
    }

    .redaction-cell.level-4 {
      background-color: #16a34a;
    }

    .redaction-cell.level-5 {
      background-color: #2563eb;
    }

    .redaction-cell.revealed {
      background-color: #6b7280;
      opacity: 0.7;
    }
  `;
}

/**
 * 赤セルシート要素のツールチップを生成
 * @param element 赤セルシート要素
 * @returns ツールチップHTML文字列
 */
export function generateRedactionTooltip(element: RedactionElement): string {
  const levelInfo = REDACTION_LEVELS[element.level];
  return `
    <div class="redaction-tooltip" data-element-id="${element.id}">
      <div class="redaction-tooltip-header">
        <span class="redaction-tooltip-icon">${levelInfo.icon}</span>
        <span class="redaction-tooltip-title">${levelInfo.label}</span>
      </div>
      <div class="redaction-tooltip-content">
        <p><strong>内容:</strong> ${escapeHtml(element.content)}</p>
        <p><strong>レベル:</strong> ${levelInfo.description}</p>
        <p><strong>状態:</strong> ${element.isVisible ? '表示中' : '非表示'}</p>
      </div>
      <div class="redaction-tooltip-actions">
        <button onclick="toggleRedactionElement('${element.id}')">
          ${element.isVisible ? '非表示にする' : '表示する'}
        </button>
      </div>
    </div>
  `;
}

/**
 * 赤セルシート要素の統計情報をレンダリング
 * @param elements 赤セルシート要素の配列
 * @returns 統計情報HTML文字列
 */
export function renderRedactionStats(elements: RedactionElement[]): string {
  const stats = calculateElementStats(elements);

  return `
    <div class="redaction-stats">
      <div class="redaction-stats-item">
        <span class="redaction-stats-label">総要素数:</span>
        <span class="redaction-stats-value">${stats.total}</span>
      </div>
      <div class="redaction-stats-item">
        <span class="redaction-stats-label">非表示:</span>
        <span class="redaction-stats-value">${stats.hidden}</span>
      </div>
      <div class="redaction-stats-item">
        <span class="redaction-stats-label">表示中:</span>
        <span class="redaction-stats-value">${stats.visible}</span>
      </div>
      <div class="redaction-stats-item">
        <span class="redaction-stats-label">レベル1:</span>
        <span class="redaction-stats-value">${stats.level1}</span>
      </div>
      <div class="redaction-stats-item">
        <span class="redaction-stats-label">レベル2:</span>
        <span class="redaction-stats-value">${stats.level2}</span>
      </div>
      <div class="redaction-stats-item">
        <span class="redaction-stats-label">レベル3:</span>
        <span class="redaction-stats-value">${stats.level3}</span>
      </div>
    </div>
  `;
}

/**
 * 基本スタイルを取得
 * @param levelInfo レベル情報
 * @param theme テーマ
 * @param size サイズ
 * @returns スタイルオブジェクト
 */
function getBaseStyles(
  levelInfo: typeof REDACTION_LEVELS[RedactionLevel],
  theme: 'light' | 'dark',
  size: 'small' | 'medium' | 'large'
): Record<string, string> {
  const sizeStyles = {
    small: { padding: '1px 4px', fontSize: '0.75rem' },
    medium: { padding: '2px 6px', fontSize: '0.875rem' },
    large: { padding: '4px 8px', fontSize: '1rem' }
  };

  const themeStyles = {
    light: { color: 'white', textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' },
    dark: { color: '#f3f4f6', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }
  };

  return {
    backgroundColor: levelInfo.color,
    ...sizeStyles[size],
    ...themeStyles[theme],
    borderRadius: '4px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    userSelect: 'none',
    display: 'inline-block',
    verticalAlign: 'baseline',
    whiteSpace: 'nowrap'
  };
}

/**
 * HTMLエスケープ
 * @param text テキスト
 * @returns エスケープされたテキスト
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 要素統計を計算
 * @param elements 赤セルシート要素の配列
 * @returns 統計情報
 */
function calculateElementStats(elements: RedactionElement[]) {
  let total = elements.length;
  let hidden = 0;
  let visible = 0;
  let level1 = 0;
  let level2 = 0;
  let level3 = 0;

  elements.forEach(element => {
    if (element.isVisible) {
      visible++;
    } else {
      hidden++;
    }

    switch (element.level) {
      case 'level1':
        level1++;
        break;
      case 'level2':
        level2++;
        break;
      case 'level3':
        level3++;
        break;
    }
  });

  return {
    total,
    hidden,
    visible,
    level1,
    level2,
    level3
  };
}
