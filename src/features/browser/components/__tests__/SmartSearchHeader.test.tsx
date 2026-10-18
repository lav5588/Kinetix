import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import {
  SmartSearchHeader,
  SEARCH_DEBOUNCE_MS,
  QUICK_FILTER_CHIPS,
  MAX_PLACEHOLDER_CHARS,
  truncatePlaceholder,
} from '../SmartSearchHeader';
import { useBrowserFilterStore } from '@core/store/useBrowserFilterStore';
import { sortFilterStorage } from '@core/storage/mmkv';

describe('Task 8 Subtask 6: SmartSearchHeader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sortFilterStorage.clearAll();
    useBrowserFilterStore.getState().resetAllPreferences();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('verifies debounce constant is exactly 150 ms', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(150);
  });

  describe('Placeholder fixed length formatting with dots', () => {
    it('truncates long placeholder text to MAX_PLACEHOLDER_CHARS (24) ending with ...', () => {
      expect(MAX_PLACEHOLDER_CHARS).toBe(24);
      expect(truncatePlaceholder('Search files...')).toBe('Search files...');
      expect(truncatePlaceholder('Search in WhatsApp Animated Gifs...')).toBe(
        'Search in WhatsApp Anima...',
      );
    });

    it('renders truncated placeholder in TextInput when long placeholder is passed', () => {
      render(<SmartSearchHeader placeholder="Search in WhatsApp Animated Gifs..." />);
      const input = screen.getByTestId('smart-search-input');
      expect(input.props.placeholder).toBe('Search in WhatsApp Anima...');
    });
  });

  describe('Debounced search query typing', () => {
    it('debounces rapid typing and invokes callback only after exactly 150 ms with the latest query', () => {
      const onSearchMock = jest.fn();
      render(<SmartSearchHeader onSearchQueryChange={onSearchMock} />);

      const input = screen.getByTestId('smart-search-input');

      // User types 'm', 'mu', 'musi', 'music' rapidly within 100 ms
      fireEvent.changeText(input, 'm');
      act(() => {
        jest.advanceTimersByTime(30);
      });

      fireEvent.changeText(input, 'mu');
      act(() => {
        jest.advanceTimersByTime(30);
      });

      fireEvent.changeText(input, 'musi');
      act(() => {
        jest.advanceTimersByTime(40);
      });

      fireEvent.changeText(input, 'music');

      // At 100 ms after the first keystroke (and 0 ms after 'music'), callback should not have been called
      expect(onSearchMock).not.toHaveBeenCalled();

      // Advance by 149 ms (just before debounce threshold)
      act(() => {
        jest.advanceTimersByTime(149);
      });
      expect(onSearchMock).not.toHaveBeenCalled();

      // Advance 1 ms further to reach 150 ms
      act(() => {
        jest.advanceTimersByTime(1);
      });

      // Now callback should have been called exactly once with 'music'
      expect(onSearchMock).toHaveBeenCalledTimes(1);
      expect(onSearchMock).toHaveBeenCalledWith('music');
    });

    it('cleans up pending debounce timer when unmounted before 150 ms', () => {
      const onSearchMock = jest.fn();
      const { unmount } = render(<SmartSearchHeader onSearchQueryChange={onSearchMock} />);

      const input = screen.getByTestId('smart-search-input');
      fireEvent.changeText(input, 'abandoned query');

      act(() => {
        jest.advanceTimersByTime(80);
      });

      // Component unmounts while timer is pending
      unmount();

      // Timer completes after unmount
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(onSearchMock).not.toHaveBeenCalled();
    });
  });

  describe('Clear query button behavior', () => {
    it('does not render clear button when input is empty', () => {
      render(<SmartSearchHeader />);
      expect(screen.queryByTestId('search-clear-button')).toBeNull();
    });

    it('renders clear button when text is entered and immediately resets on press', () => {
      const onSearchMock = jest.fn();
      render(<SmartSearchHeader onSearchQueryChange={onSearchMock} />);

      const input = screen.getByTestId('smart-search-input');
      fireEvent.changeText(input, 'hello');

      // Clear button is now visible
      const clearBtn = screen.getByTestId('search-clear-button');
      expect(clearBtn).toBeTruthy();

      // Press clear button
      fireEvent.press(clearBtn);

      // Input value is immediately reset to empty
      expect(input.props.value).toBe('');

      // Callback immediately called with empty string without waiting for debounce
      expect(onSearchMock).toHaveBeenCalledWith('');

      // Clear button disappears
      expect(screen.queryByTestId('search-clear-button')).toBeNull();
    });
  });

  describe('Quick filter chips', () => {
    it('renders all 5 specified quick-filter chips', () => {
      render(<SmartSearchHeader />);

      expect(QUICK_FILTER_CHIPS).toHaveLength(5);
      expect(QUICK_FILTER_CHIPS.map((c) => c.id)).toEqual([
        'ALL',
        'IN_PROGRESS',
        'UNWATCHED',
        'FAVORITES',
        'LARGE_FILES',
      ]);

      expect(screen.getByTestId('filter-chip-all')).toBeTruthy();
      expect(screen.getByTestId('filter-chip-in_progress')).toBeTruthy();
      expect(screen.getByTestId('filter-chip-unwatched')).toBeTruthy();
      expect(screen.getByTestId('filter-chip-favorites')).toBeTruthy();
      expect(screen.getByTestId('filter-chip-large_files')).toBeTruthy();
    });

    it('handles quick filter selection and notifies parent callback', () => {
      const onFilterMock = jest.fn();
      render(<SmartSearchHeader onQuickFilterChange={onFilterMock} selectedQuickFilter="ALL" />);

      // Tap 'In Progress'
      fireEvent.press(screen.getByTestId('filter-chip-in_progress'));
      expect(onFilterMock).toHaveBeenCalledWith('IN_PROGRESS');

      // Tap 'Large Files > 100MB'
      fireEvent.press(screen.getByTestId('filter-chip-large_files'));
      expect(onFilterMock).toHaveBeenCalledWith('LARGE_FILES');

      // Tap 'Unwatched'
      fireEvent.press(screen.getByTestId('filter-chip-unwatched'));
      expect(onFilterMock).toHaveBeenCalledWith('UNWATCHED');

      // Tap 'Favorites'
      fireEvent.press(screen.getByTestId('filter-chip-favorites'));
      expect(onFilterMock).toHaveBeenCalledWith('FAVORITES');
    });

    it('updates useBrowserFilterStore when category is supplied', () => {
      render(<SmartSearchHeader category="AUDIO" />);

      fireEvent.press(screen.getByTestId('filter-chip-in_progress'));

      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').quickFilter).toBe(
        'IN_PROGRESS',
      );
      // VIDEO remains unchanged
      expect(useBrowserFilterStore.getState().getPreferences('VIDEO').quickFilter).toBe('ALL');
    });

    it('marks the currently selected chip with selected accessibility state', () => {
      const { rerender } = render(<SmartSearchHeader selectedQuickFilter="IN_PROGRESS" />);

      const inProgressChip = screen.getByTestId('filter-chip-in_progress');
      expect(inProgressChip.props.accessibilityState?.selected).toBe(true);

      const unwatchedChip = screen.getByTestId('filter-chip-unwatched');
      expect(unwatchedChip.props.accessibilityState?.selected).toBe(false);

      rerender(<SmartSearchHeader selectedQuickFilter="UNWATCHED" />);
      expect(screen.getByTestId('filter-chip-unwatched').props.accessibilityState?.selected).toBe(
        true,
      );
      expect(screen.getByTestId('filter-chip-in_progress').props.accessibilityState?.selected).toBe(
        false,
      );
    });
  });

  describe('Accessibility and Back Button', () => {
    it('provides accessible labels for input, clear button, and chips', () => {
      render(<SmartSearchHeader searchQuery="test" showBackButton onBackPress={jest.fn()} />);

      expect(screen.getByLabelText('Search files')).toBeTruthy();
      expect(screen.getByLabelText('Clear search text')).toBeTruthy();
      expect(screen.getByLabelText('Go back')).toBeTruthy();
      expect(screen.getByLabelText('All')).toBeTruthy();
      expect(screen.getByLabelText('In Progress')).toBeTruthy();
      expect(screen.getByLabelText('Unwatched')).toBeTruthy();
      expect(screen.getByLabelText('Favorites')).toBeTruthy();
      expect(screen.getByLabelText('Large Files > 100MB')).toBeTruthy();
    });

    it('calls onBackPress when back button is pressed', () => {
      const onBackMock = jest.fn();
      render(<SmartSearchHeader onBackPress={onBackMock} showBackButton />);

      fireEvent.press(screen.getByTestId('search-back-button'));
      expect(onBackMock).toHaveBeenCalledTimes(1);
    });
  });
});
