/**
 * 赤セルシート構文の解析ユーティリティ
 * Markdown内の赤セルシート構文を解析し、要素に変換する
 */

import {
  RedactionLevel,
  RedactionElement,
  RedactionParseResult,
  REDACTION_REGEX
} from '../types/redaction';

/**
 * Markdownテキストから赤セルシート要素を解析
 * @param markdown Markdownテキスト
 * @param revealedItems 表示されている項目のセット
 * @param showAll 全項目表示フラグ
 * @param levelSettings レベル別設定
 * @returns 解析結果
 */
export function parseRedactionElements(
  markdown: string,
  revealedItems: Set<string> = new Set(),
  showAll: boolean = false,
  levelSettings: Record<string, boolean> = {}
): RedactionParseResult {
  const elements: RedactionElement[] = [];
  let currentIndex = 0;

  // 全項目表示が有効な場合は、すべての要素を表示状態にする
  const shouldShowAll = showAll;

  // 正規表現で赤セルシート構文を検索
  const allMatches: Array<{ match: RegExpMatchArray; type: 'full' | 'simple' }> = [];

  // 完全な構文を検索
  const fullMatches = Array.from(markdown.matchAll(REDACTION_REGEX.full));
  fullMatches.forEach(match => allMatches.push({ match, type: 'full' }));

  // 単純な構文を検索（完全な構文と重複しないもののみ）
  const simpleMatches = Array.from(markdown.matchAll(REDACTION_REGEX.simple));
  simpleMatches.forEach(match => {
    // 完全な構文と重複していないかチェック
    const isOverlapping = fullMatches.some(fullMatch =>
      fullMatch.index !== undefined &&
      match.index !== undefined &&
      match.index >= fullMatch.index &&
      match.index < fullMatch.index + fullMatch[0].length
    );

    if (!isOverlapping) {
      allMatches.push({ match, type: 'simple' });
    }
  });

  // 位置順にソート
  allMatches.sort((a, b) => (a.match.index || 0) - (b.match.index || 0));

  // 各マッチを処理
  allMatches.forEach(({ match, type }, index) => {
    if (match.index === undefined) return;

    const fullMatch = match[0];
    let level: RedactionLevel;
    let content: string;

    if (type === 'full') {
      level = match[1] as RedactionLevel;
      content = match[2];
    } else {
      level = 'level1'; // デフォルトレベル
      content = match[1];
    }

    // 要素IDを生成（内容のハッシュベース）
    const elementId = generateElementId(content, level, index);

    // 表示状態を決定
    const isVisible = shouldShowAll ||
                     revealedItems.has(elementId) ||
                     levelSettings[level] === true;

    const element: RedactionElement = {
      id: elementId,
      type: isVisible ? 'revealed' : 'redacted',
      level,
      content,
      originalText: fullMatch,
      position: {
        start: match.index,
        end: match.index + fullMatch.length
      },
      isVisible
    };

    elements.push(element);
  });

  // 統計情報を計算
  const stats = calculateParseStats(elements);

  return {
    elements,
    hasRedactedContent: elements.length > 0,
    totalRedactedCount: stats.redactedCount,
    totalRevealedCount: stats.revealedCount,
    levels: stats.levelCounts
  };
}

/**
 * 赤セルシート要素をMarkdownテキストに変換
 * @param elements 赤セルシート要素の配列
 * @param originalMarkdown 元のMarkdownテキスト
 * @returns 変換されたMarkdownテキスト
 */
export function convertElementsToMarkdown(
  elements: RedactionElement[],
  originalMarkdown: string
): string {
  let result = originalMarkdown;

  // 後ろから前へ処理（インデックスのずれを防ぐため）
  const sortedElements = elements
    .slice()
    .sort((a, b) => b.position.start - a.position.start);

  sortedElements.forEach(element => {
    const { start, end } = element.position;
    const before = result.substring(0, start);
    const after = result.substring(end);

    if (element.isVisible) {
      // 表示状態の場合は内容を表示
      result = before + element.content + after;
    } else {
      // 非表示状態の場合は赤セルシート表示
      result = before + createRedactionDisplay(element) + after;
    }
  });

  return result;
}

/**
 * 赤セルシート構文を生成
 * @param content 内容
 * @param level レベル
 * @returns 赤セルシート構文
 */
export function createRedactionSyntax(
  content: string,
  level: RedactionLevel = 'level1'
): string {
  return `[REDACTED:${level}:${content}]`;
}

/**
 * 赤セルシート表示用のHTMLを生成
 * @param element 赤セルシート要素
 * @returns HTML文字列
 */
export function createRedactionDisplay(element: RedactionElement): string {
  const levelInfo = getLevelInfo(element.level);
  return `<span class="redaction-element redaction-${element.level}" data-element-id="${element.id}" data-level="${element.level}" style="background-color: ${levelInfo.color}; color: white; padding: 2px 4px; border-radius: 3px; cursor: pointer;">${levelInfo.icon} ${levelInfo.label}</span>`;
}

/**
 * 赤セルシート要素のIDを生成
 * @param content 内容
 * @param level レベル
 * @param index インデックス
 * @returns 要素ID
 */
export function generateElementId(
  content: string,
  level: RedactionLevel,
  index: number
): string {
  // 内容のハッシュを生成（簡易版）
  const contentHash = simpleHash(content);
  return `redaction_${level}_${contentHash}_${index}`;
}

/**
 * テキストの簡易ハッシュを生成
 * @param text テキスト
 * @returns ハッシュ値
 */
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(36);
}

/**
 * 解析統計情報を計算
 * @param elements 赤セルシート要素の配列
 * @returns 統計情報
 */
function calculateParseStats(elements: RedactionElement[]) {
  let redactedCount = 0;
  let revealedCount = 0;
  const levelCounts = {
    level1: 0,
    level2: 0,
    level3: 0
  };

  elements.forEach(element => {
    if (element.isVisible) {
      revealedCount++;
    } else {
      redactedCount++;
    }
    levelCounts[element.level]++;
  });

  return {
    redactedCount,
    revealedCount,
    levelCounts
  };
}

/**
 * レベル情報を取得
 * @param level レベル
 * @returns レベル情報
 */
function getLevelInfo(level: RedactionLevel) {
  const levelInfoMap = {
    level1: { color: '#dc2626', icon: '🔴', label: '最高機密' },
    level2: { color: '#ea580c', icon: '🟠', label: '一般機密' },
    level3: { color: '#d97706', icon: '🟡', label: '内部限定' }
  };

  return levelInfoMap[level] || { color: '#6b7280', icon: '⚫', label: '不明' };
}

/**
 * Markdownテキスト内の赤セルシート構文を検証
 * @param markdown Markdownテキスト
 * @returns 検証結果
 */
export function validateRedactionSyntax(markdown: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 不完全な構文をチェック
  const incompleteMatches = markdown.match(/\[REDACTED:[^\]]*$/g);
  if (incompleteMatches) {
    errors.push(`不完全な赤セルシート構文が見つかりました: ${incompleteMatches.join(', ')}`);
  }

  // ネストした構文をチェック
  const nestedMatches = markdown.match(/\[REDACTED:[^\]]*\[REDACTED:[^\]]*\]/g);
  if (nestedMatches) {
    warnings.push('ネストした赤セルシート構文が見つかりました');
  }

  // 空の内容をチェック
  const emptyContentMatches = markdown.match(/\[REDACTED:\w+:\s*\]/g);
  if (emptyContentMatches) {
    warnings.push('空の内容を持つ赤セルシート構文が見つかりました');
  }

  // 無効なレベルをチェック
  const invalidLevelMatches = markdown.match(/\[REDACTED:(?!level[123])(\w+):/g);
  if (invalidLevelMatches) {
    errors.push('無効なレベルが指定された赤セルシート構文が見つかりました');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 赤セルシート要素をフィルタリング
 * @param elements 赤セルシート要素の配列
 * @param filter フィルター条件
 * @returns フィルタリングされた要素
 */
export function filterRedactionElements(
  elements: RedactionElement[],
  filter: {
    level?: RedactionLevel;
    type?: 'redacted' | 'revealed';
    isVisible?: boolean;
  }
): RedactionElement[] {
  return elements.filter(element => {
    if (filter.level && element.level !== filter.level) {
      return false;
    }
    if (filter.type && element.type !== filter.type) {
      return false;
    }
    if (filter.isVisible !== undefined && element.isVisible !== filter.isVisible) {
      return false;
    }
    return true;
  });
}

/**
 * 赤セルシート要素の位置を更新
 * @param elements 赤セルシート要素の配列
 * @param offset オフセット
 * @returns 位置が更新された要素の配列
 */
export function updateElementPositions(
  elements: RedactionElement[],
  offset: number
): RedactionElement[] {
  return elements.map(element => ({
    ...element,
    position: {
      start: element.position.start + offset,
      end: element.position.end + offset
    }
  }));
}
