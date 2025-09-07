/**
 * 赤セルシートレンダリングユーティリティのテスト
 */

import {
  renderRedactionElement,
  renderRedactionElements,
  generateRedactionStyles,
  generateRedactionClasses,
  generateRedactionAnimations,
  generateRedactionBaseCSS,
  generateRedactionTooltip,
  renderRedactionStats
} from '../redactionRenderer';
import { RedactionElement, RedactionLevel } from '../../types/redaction';

describe('RedactionRenderer', () => {
  const mockElement: RedactionElement = {
    id: 'test-element',
    type: 'redacted',
    level: 'level1',
    content: '機密情報',
    originalText: '[REDACTED:level1:機密情報]',
    position: { start: 0, end: 25 },
    isVisible: false
  };

  describe('renderRedactionElement', () => {
    it('should render element with default options', () => {
      const result = renderRedactionElement(mockElement);

      expect(result).toContain('redaction-element');
      expect(result).toContain('redaction-level1');
      expect(result).toContain('data-element-id="test-element"');
      expect(result).toContain('data-level="level1"');
      expect(result).toContain('data-content="機密情報"');
    });

    it('should render element with custom options', () => {
      const options = {
        showTooltip: false,
        enableClick: false,
        theme: 'dark' as const,
        size: 'large' as const
      };

      const result = renderRedactionElement(mockElement, options);

      expect(result).toContain('redaction-dark');
      expect(result).toContain('redaction-large');
      expect(result).not.toContain('title=');
      expect(result).not.toContain('onclick=');
    });

    it('should include tooltip when enabled', () => {
      const options = { showTooltip: true };
      const result = renderRedactionElement(mockElement, options);

      expect(result).toContain('title=');
    });

    it('should include click handler when enabled', () => {
      const options = { enableClick: true };
      const result = renderRedactionElement(mockElement, options);

      expect(result).toContain('onclick=');
    });
  });

  describe('renderRedactionElements', () => {
    it('should render multiple elements', () => {
      const elements = [mockElement, { ...mockElement, id: 'test-element-2' }];
      const result = renderRedactionElements(elements);

      expect(result).toContain('test-element');
      expect(result).toContain('test-element-2');
    });

    it('should apply options to all elements', () => {
      const elements = [mockElement];
      const options = { theme: 'dark' as const };
      const result = renderRedactionElements(elements, options);

      expect(result).toContain('redaction-dark');
    });
  });

  describe('generateRedactionStyles', () => {
    it('should generate styles for level1', () => {
      const styles = generateRedactionStyles('level1');

      expect(styles.backgroundColor).toBe('#dc2626');
      expect(styles.color).toBe('white');
      expect(styles.padding).toBe('2px 6px');
      expect(styles.fontSize).toBe('0.875rem');
    });

    it('should generate styles for different themes', () => {
      const lightStyles = generateRedactionStyles('level1', 'light');
      const darkStyles = generateRedactionStyles('level1', 'dark');

      expect(lightStyles.color).toBe('white');
      expect(darkStyles.color).toBe('#f3f4f6');
    });

    it('should generate styles for different sizes', () => {
      const smallStyles = generateRedactionStyles('level1', 'light', 'small');
      const largeStyles = generateRedactionStyles('level1', 'light', 'large');

      expect(smallStyles.padding).toBe('1px 4px');
      expect(smallStyles.fontSize).toBe('0.75rem');
      expect(largeStyles.padding).toBe('4px 8px');
      expect(largeStyles.fontSize).toBe('1rem');
    });
  });

  describe('generateRedactionClasses', () => {
    it('should generate correct classes', () => {
      const classes = generateRedactionClasses('level1', 'light', 'medium');

      expect(classes).toContain('redaction-element');
      expect(classes).toContain('redaction-level1');
      expect(classes).toContain('redaction-light');
      expect(classes).toContain('redaction-medium');
      expect(classes).toContain('redaction-clickable');
    });
  });

  describe('generateRedactionAnimations', () => {
    it('should generate animation CSS', () => {
      const css = generateRedactionAnimations();

      expect(css).toContain('@keyframes redaction-pulse');
      expect(css).toContain('@keyframes redaction-reveal');
      expect(css).toContain('@keyframes redaction-hide');
      expect(css).toContain('.redaction-element');
    });
  });

  describe('generateRedactionBaseCSS', () => {
    it('should generate base CSS', () => {
      const css = generateRedactionBaseCSS();

      expect(css).toContain('.redaction-element');
      expect(css).toContain('.redaction-level1');
      expect(css).toContain('.redaction-level2');
      expect(css).toContain('.redaction-level3');
      expect(css).toContain('.redaction-small');
      expect(css).toContain('.redaction-medium');
      expect(css).toContain('.redaction-large');
    });
  });

  describe('generateRedactionTooltip', () => {
    it('should generate tooltip HTML', () => {
      const tooltip = generateRedactionTooltip(mockElement);

      expect(tooltip).toContain('redaction-tooltip');
      expect(tooltip).toContain('data-element-id="test-element"');
      expect(tooltip).toContain('機密情報');
      expect(tooltip).toContain('最高機密');
      expect(tooltip).toContain('非表示');
    });
  });

  describe('renderRedactionStats', () => {
    it('should render stats for elements', () => {
      const elements: RedactionElement[] = [
        { ...mockElement, level: 'level1', isVisible: false },
        { ...mockElement, id: '2', level: 'level2', isVisible: true },
        { ...mockElement, id: '3', level: 'level1', isVisible: true }
      ];

      const stats = renderRedactionStats(elements);

      expect(stats).toContain('redaction-stats');
      expect(stats).toContain('総要素数');
      expect(stats).toContain('非表示');
      expect(stats).toContain('表示中');
      expect(stats).toContain('レベル1');
      expect(stats).toContain('レベル2');
    });
  });
});
