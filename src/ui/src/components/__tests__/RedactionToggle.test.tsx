/**
 * RedactionToggleコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedactionToggle from '../RedactionToggle';
import { RedactionLevel, RedactionState } from '../../types/redaction';

// モックデータ
const mockElements = [
  {
    id: 'element-1',
    level: 'level1' as RedactionLevel,
    content: '機密情報1',
    isVisible: false
  },
  {
    id: 'element-2',
    level: 'level2' as RedactionLevel,
    content: '機密情報2',
    isVisible: true
  },
  {
    id: 'element-3',
    level: 'level3' as RedactionLevel,
    content: '機密情報3',
    isVisible: false
  },
  {
    id: 'element-4',
    level: 'level1' as RedactionLevel,
    content: '機密情報4',
    isVisible: true
  }
];

const mockState: RedactionState = {
  showAll: false,
  revealedItems: new Set(['element-2', 'element-4']),
  levelSettings: {
    level1: true,
    level2: false,
    level3: true
  },
  settings: null,
  isLoading: false,
  isDirty: false,
  isEditing: false,
  isSaving: false,
  error: null,
  isSettingsModalOpen: false,
  isExportModalOpen: false,
  isImportModalOpen: false,
};

// モック関数
const mockActions = {
  toggleShowAll: jest.fn(),
  toggleRevealedItem: jest.fn(),
  updateLevelSettings: jest.fn()
};

describe('RedactionToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('should render toggle component', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      expect(screen.getByTestId('redaction-toggle')).toBeInTheDocument();
      expect(screen.getByText('赤セルシート統計')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          className="custom-class"
        />
      );

      const container = screen.getByTestId('redaction-toggle');
      expect(container).toHaveClass('custom-class');
    });

    it('should render with custom aria-label', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          aria-label="カスタムラベル"
        />
      );

      const container = screen.getByTestId('redaction-toggle');
      expect(container).toHaveAttribute('aria-label', 'カスタムラベル');
    });
  });

  describe('統計情報表示', () => {
    it('should display correct statistics', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      // 総数と表示数の確認
      expect(screen.getByText('2/4 表示中')).toBeInTheDocument();
      expect(screen.getByText('2個の項目が非表示')).toBeInTheDocument();
    });

    it('should not show hidden count when all items are visible', () => {
      const allVisibleElements = mockElements.map(el => ({ ...el, isVisible: true }));

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={allVisibleElements}
        />
      );

      expect(screen.getByText('4/4 表示中')).toBeInTheDocument();
      expect(screen.queryByText(/個の項目が非表示/)).not.toBeInTheDocument();
    });
  });

  describe('全表示切り替え', () => {
    it('should show correct state for show all toggle', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const toggleButton = screen.getByTestId('toggle-show-all');
      expect(toggleButton).toHaveTextContent('🔒 全非表示中');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show correct state when show all is enabled', () => {
      const stateWithShowAll = { ...mockState, showAll: true };

      render(
        <RedactionToggle
          state={stateWithShowAll}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const toggleButton = screen.getByTestId('toggle-show-all');
      expect(toggleButton).toHaveTextContent('🔓 全表示中');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should call toggleShowAll when clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const toggleButton = screen.getByTestId('toggle-show-all');
      await user.click(toggleButton);

      expect(mockActions.toggleShowAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('レベル別制御', () => {
    it('should render level controls when enabled', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          showLevelControls={true}
        />
      );

      expect(screen.getByText('レベル別表示制御')).toBeInTheDocument();
      expect(screen.getByText('最高機密')).toBeInTheDocument();
      expect(screen.getByText('一般機密')).toBeInTheDocument();
      expect(screen.getByText('内部限定')).toBeInTheDocument();
    });

    it('should not render level controls when disabled', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          showLevelControls={false}
        />
      );

      expect(screen.queryByText('レベル別表示制御')).not.toBeInTheDocument();
    });

    it('should show correct level statistics', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      // level1: 2個中1個表示
      expect(screen.getByText('(1/2)')).toBeInTheDocument();
      // level2: 1個中1個表示
      expect(screen.getByText('(1/1)')).toBeInTheDocument();
      // level3: 1個中0個表示
      expect(screen.getByText('(0/1)')).toBeInTheDocument();
    });

    it('should call updateLevelSettings when level toggle is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const levelToggle = screen.getByTestId('toggle-level-level1');
      await user.click(levelToggle);

      expect(mockActions.updateLevelSettings).toHaveBeenCalledWith({
        level1: false, // 現在trueなのでfalseに変更
        level2: false,
        level3: true
      });
    });

    it('should call updateLevelSettings when show level button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const showButton = screen.getByTestId('show-level-level2');
      await user.click(showButton);

      expect(mockActions.updateLevelSettings).toHaveBeenCalledWith({
        level1: true,
        level2: true, // 現在falseなのでtrueに変更
        level3: true
      });
    });

    it('should call updateLevelSettings when hide level button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const hideButton = screen.getByTestId('hide-level-level1');
      await user.click(hideButton);

      expect(mockActions.updateLevelSettings).toHaveBeenCalledWith({
        level1: false, // 現在trueなのでfalseに変更
        level2: false,
        level3: true
      });
    });
  });

  describe('個別項目制御', () => {
    it('should render item controls when enabled', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          showItemControls={true}
        />
      );

      expect(screen.getByText('個別項目制御')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-item-element-1')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-item-element-2')).toBeInTheDocument();
    });

    it('should not render item controls when disabled', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          showItemControls={false}
        />
      );

      expect(screen.queryByText('個別項目制御')).not.toBeInTheDocument();
    });

    it('should show correct item states', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      // 非表示項目
      const hiddenButton = screen.getByTestId('toggle-item-element-1');
      expect(hiddenButton).toHaveTextContent('非表示');

      // 表示項目
      const visibleButton = screen.getByTestId('toggle-item-element-2');
      expect(visibleButton).toHaveTextContent('表示');
    });

    it('should truncate long content', () => {
      const longContentElements = [
        {
          id: 'long-element',
          level: 'level1' as RedactionLevel,
          content: 'これは非常に長い機密情報の内容で、30文字を超える長いテキストです',
          isVisible: false
        }
      ];

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={longContentElements}
        />
      );

      expect(screen.getByText('これは非常に長い機密情報の内容で、30文字を超える長いテキス...')).toBeInTheDocument();
    });

    it('should call toggleRevealedItem when item toggle is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const itemToggle = screen.getByTestId('toggle-item-element-1');
      await user.click(itemToggle);

      expect(mockActions.toggleRevealedItem).toHaveBeenCalledWith('element-1');
    });
  });

  describe('コンパクトモード', () => {
    it('should render compact controls when compact is true', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          compact={true}
        />
      );

      expect(screen.getByTestId('compact-toggle-show-all')).toBeInTheDocument();
      expect(screen.getByTestId('compact-toggle-level-level1')).toBeInTheDocument();
      expect(screen.getByTestId('compact-toggle-level-level2')).toBeInTheDocument();
      expect(screen.getByTestId('compact-toggle-level-level3')).toBeInTheDocument();
    });

    it('should not render detailed controls in compact mode', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          compact={true}
        />
      );

      expect(screen.queryByText('レベル別表示制御')).not.toBeInTheDocument();
      expect(screen.queryByText('個別項目制御')).not.toBeInTheDocument();
    });

    it('should call toggleShowAll when compact toggle is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          compact={true}
        />
      );

      const compactToggle = screen.getByTestId('compact-toggle-show-all');
      await user.click(compactToggle);

      expect(mockActions.toggleShowAll).toHaveBeenCalledTimes(1);
    });

    it('should call updateLevelSettings when compact level toggle is clicked', async () => {
      const user = userEvent.setup();

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
          compact={true}
        />
      );

      const levelToggle = screen.getByTestId('compact-toggle-level-level1');
      await user.click(levelToggle);

      expect(mockActions.updateLevelSettings).toHaveBeenCalledWith({
        level1: false, // 現在trueなのでfalseに変更
        level2: false,
        level3: true
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const container = screen.getByTestId('redaction-toggle');
      expect(container).toHaveAttribute('role', 'toolbar');
      expect(container).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('should have proper button states', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={mockElements}
        />
      );

      const toggleButton = screen.getByTestId('toggle-show-all');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle empty elements array', () => {
      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={[]}
        />
      );

      expect(screen.getByText('0/0 表示中')).toBeInTheDocument();
      expect(screen.queryByText(/個の項目が非表示/)).not.toBeInTheDocument();
    });

    it('should handle elements with missing properties', () => {
      const incompleteElements = [
        {
          id: 'incomplete-1',
          level: 'level1' as RedactionLevel,
          content: 'test',
          isVisible: true
        }
      ];

      render(
        <RedactionToggle
          state={mockState}
          actions={mockActions}
          elements={incompleteElements}
        />
      );

      expect(screen.getByTestId('redaction-toggle')).toBeInTheDocument();
    });
  });
});
