/**
 * 赤セルシート解析ユーティリティのテスト
 */

import {
  parseRedactionElements,
  convertElementsToMarkdown,
  createRedactionSyntax,
  createRedactionDisplay,
  generateElementId,
  validateRedactionSyntax,
  filterRedactionElements,
  updateElementPositions
} from '../redactionParser';
import { RedactionElement, RedactionLevel } from '../../types/redaction';

describe('RedactionParser', () => {
  describe('parseRedactionElements', () => {
    it('should parse redaction elements from markdown', () => {
      const markdown = 'これは[REDACTED:level1:機密情報]です。';
      const result = parseRedactionElements(markdown);

      expect(result.elements).toHaveLength(1);
      expect(result.hasRedactedContent).toBe(true);
      expect(result.totalRedactedCount).toBe(1);
      expect(result.totalRevealedCount).toBe(0);

      const element = result.elements[0];
      expect(element.level).toBe('level1');
      expect(element.content).toBe('機密情報');
      expect(element.isVisible).toBe(false);
    });

    it('should handle multiple redaction elements', () => {
      const markdown = '[REDACTED:level1:機密1] [REDACTED:level2:機密2]';
      const result = parseRedactionElements(markdown);

      expect(result.elements).toHaveLength(2);
      expect(result.totalRedactedCount).toBe(2);
      expect(result.levels.level1).toBe(1);
      expect(result.levels.level2).toBe(1);
    });

    it('should respect revealed items', () => {
      const markdown = '[REDACTED:level1:機密情報]';
      const result = parseRedactionElements(markdown);
      const elementId = result.elements[0].id;
      const revealedItems = new Set([elementId]);
      const resultWithRevealed = parseRedactionElements(markdown, revealedItems);

      expect(resultWithRevealed.elements[0].isVisible).toBe(true);
      expect(resultWithRevealed.totalRevealedCount).toBe(1);
    });

    it('should respect show all flag', () => {
      const markdown = '[REDACTED:level1:機密情報]';
      const result = parseRedactionElements(markdown, new Set(), true);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].isVisible).toBe(true);
      expect(result.totalRevealedCount).toBe(1);
    });

    it('should respect level settings', () => {
      const markdown = '[REDACTED:level1:機密情報]';
      const levelSettings = { level1: true };
      const result = parseRedactionElements(markdown, new Set(), false, levelSettings);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].isVisible).toBe(true);
      expect(result.totalRevealedCount).toBe(1);
    });
  });

  describe('convertElementsToMarkdown', () => {
    it('should convert visible elements to content', () => {
      const elements: RedactionElement[] = [{
        id: 'test',
        type: 'revealed',
        level: 'level1',
        content: '機密情報',
        originalText: '[REDACTED:level1:機密情報]',
        position: { start: 0, end: 25 },
        isVisible: true
      }];

      const originalMarkdown = '[REDACTED:level1:機密情報]';
      const result = convertElementsToMarkdown(elements, originalMarkdown);

      expect(result).toBe('機密情報');
    });

    it('should keep hidden elements as redaction display', () => {
      const elements: RedactionElement[] = [{
        id: 'test',
        type: 'redacted',
        level: 'level1',
        content: '機密情報',
        originalText: '[REDACTED:level1:機密情報]',
        position: { start: 0, end: 25 },
        isVisible: false
      }];

      const originalMarkdown = '[REDACTED:level1:機密情報]';
      const result = convertElementsToMarkdown(elements, originalMarkdown);

      expect(result).toContain('redaction-element');
      expect(result).toContain('level1');
    });
  });

  describe('createRedactionSyntax', () => {
    it('should create redaction syntax with default level', () => {
      const result = createRedactionSyntax('機密情報');
      expect(result).toBe('[REDACTED:level1:機密情報]');
    });

    it('should create redaction syntax with specified level', () => {
      const result = createRedactionSyntax('機密情報', 'level2');
      expect(result).toBe('[REDACTED:level2:機密情報]');
    });
  });

  describe('createRedactionDisplay', () => {
    it('should create redaction display HTML', () => {
      const element: RedactionElement = {
        id: 'test',
        type: 'redacted',
        level: 'level1',
        content: '機密情報',
        originalText: '[REDACTED:level1:機密情報]',
        position: { start: 0, end: 25 },
        isVisible: false
      };

      const result = createRedactionDisplay(element);

      expect(result).toContain('redaction-element');
      expect(result).toContain('redaction-level1');
      expect(result).toContain('data-element-id="test"');
      expect(result).toContain('data-level="level1"');
    });
  });

  describe('generateElementId', () => {
    it('should generate consistent element IDs', () => {
      const id1 = generateElementId('機密情報', 'level1', 0);
      const id2 = generateElementId('機密情報', 'level1', 0);

      expect(id1).toBe(id2);
      expect(id1).toContain('redaction_level1_');
    });

    it('should generate different IDs for different content', () => {
      const id1 = generateElementId('機密情報1', 'level1', 0);
      const id2 = generateElementId('機密情報2', 'level1', 0);

      expect(id1).not.toBe(id2);
    });
  });

  describe('validateRedactionSyntax', () => {
    it('should validate correct syntax', () => {
      const markdown = '[REDACTED:level1:機密情報]';
      const result = validateRedactionSyntax(markdown);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect incomplete syntax', () => {
      const markdown = '[REDACTED:level1:';
      const result = validateRedactionSyntax(markdown);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid levels', () => {
      const markdown = '[REDACTED:invalidlevel:機密情報]';
      const result = validateRedactionSyntax(markdown);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect empty content', () => {
      const markdown = '[REDACTED:level1: ]';
      const result = validateRedactionSyntax(markdown);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('filterRedactionElements', () => {
    const elements: RedactionElement[] = [
      {
        id: '1',
        type: 'redacted',
        level: 'level1',
        content: '機密1',
        originalText: '[REDACTED:level1:機密1]',
        position: { start: 0, end: 20 },
        isVisible: false
      },
      {
        id: '2',
        type: 'revealed',
        level: 'level2',
        content: '機密2',
        originalText: '[REDACTED:level2:機密2]',
        position: { start: 20, end: 40 },
        isVisible: true
      }
    ];

    it('should filter by level', () => {
      const result = filterRedactionElements(elements, { level: 'level1' });
      expect(result).toHaveLength(1);
      expect(result[0].level).toBe('level1');
    });

    it('should filter by type', () => {
      const result = filterRedactionElements(elements, { type: 'revealed' });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('revealed');
    });

    it('should filter by visibility', () => {
      const result = filterRedactionElements(elements, { isVisible: true });
      expect(result).toHaveLength(1);
      expect(result[0].isVisible).toBe(true);
    });
  });

  describe('updateElementPositions', () => {
    it('should update element positions with offset', () => {
      const elements: RedactionElement[] = [{
        id: 'test',
        type: 'redacted',
        level: 'level1',
        content: '機密情報',
        originalText: '[REDACTED:level1:機密情報]',
        position: { start: 0, end: 25 },
        isVisible: false
      }];

      const result = updateElementPositions(elements, 10);

      expect(result[0].position.start).toBe(10);
      expect(result[0].position.end).toBe(35);
    });
  });
});
