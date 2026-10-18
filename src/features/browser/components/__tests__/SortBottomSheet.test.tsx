import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SortBottomSheet, SORT_OPTIONS, type SortBottomSheetRef } from '../SortBottomSheet';
import { useBrowserFilterStore } from '@core/store/useBrowserFilterStore';
import { sortFilterStorage } from '@core/storage/mmkv';

describe('Task 8 Subtask 7: SortBottomSheet', () => {
  beforeEach(() => {
    sortFilterStorage.clearAll();
    useBrowserFilterStore.getState().resetAllPreferences();
  });

  it('defines all 8 required sort choices across four fields and two directions', () => {
    expect(SORT_OPTIONS).toHaveLength(8);

    const ids = SORT_OPTIONS.map((o) => o.id);
    expect(ids).toEqual([
      'NAME_ASC',
      'NAME_DESC',
      'DATE_DESC',
      'DATE_ASC',
      'SIZE_DESC',
      'SIZE_ASC',
      'DURATION_DESC',
      'DURATION_ASC',
    ]);
  });

  describe('Option mapping and store updates', () => {
    it.each(SORT_OPTIONS)(
      'maps $id to field: $field, direction: $direction and updates store on selection',
      (option) => {
        const onSelectMock = jest.fn();
        const onDismissMock = jest.fn();

        render(
          <SortBottomSheet
            category="AUDIO"
            isOpen
            onDismiss={onDismissMock}
            onSelectSort={onSelectMock}
          />,
        );

        const optionButton = screen.getByTestId(`sort-option-${option.id.toLowerCase()}`);
        expect(optionButton).toBeTruthy();

        fireEvent.press(optionButton);

        // 1. Callback called with mapped field and direction
        expect(onSelectMock).toHaveBeenCalledWith(option.field, option.direction);

        // 2. Persisted store updated for AUDIO
        const audioPref = useBrowserFilterStore.getState().getPreferences('AUDIO');
        expect(audioPref.sortField).toBe(option.field);
        expect(audioPref.sortDirection).toBe(option.direction);

        // 3. Dismiss callback called
        expect(onDismissMock).toHaveBeenCalled();
      },
    );

    it('preserves VIDEO and PHOTO preferences independently when AUDIO sorting changes', () => {
      render(<SortBottomSheet category="AUDIO" isOpen />);

      // Select Size (Largest) for AUDIO
      fireEvent.press(screen.getByTestId('sort-option-size_desc'));

      const audioPref = useBrowserFilterStore.getState().getPreferences('AUDIO');
      expect(audioPref.sortField).toBe('SIZE');
      expect(audioPref.sortDirection).toBe('DESC');

      // VIDEO remains at default (DATE, DESC)
      const videoPref = useBrowserFilterStore.getState().getPreferences('VIDEO');
      expect(videoPref.sortField).toBe('DATE');
      expect(videoPref.sortDirection).toBe('DESC');

      // PHOTO remains at default
      const photoPref = useBrowserFilterStore.getState().getPreferences('PHOTO');
      expect(photoPref.sortField).toBe('DATE');
    });
  });

  describe('Active choice visual marking', () => {
    it('marks the currently selected sort option as selected', () => {
      render(
        <SortBottomSheet
          category="AUDIO"
          currentSortDirection="DESC"
          currentSortField="SIZE"
          isOpen
        />,
      );

      const sizeDescOption = screen.getByTestId('sort-option-size_desc');
      expect(sizeDescOption.props.accessibilityState?.selected).toBe(true);

      const nameAscOption = screen.getByTestId('sort-option-name_asc');
      expect(nameAscOption.props.accessibilityState?.selected).toBe(false);
    });
  });

  describe('Dismiss and Ref API', () => {
    it('calls onDismiss when close button is pressed', () => {
      const onDismissMock = jest.fn();
      render(<SortBottomSheet category="AUDIO" isOpen onDismiss={onDismissMock} />);

      fireEvent.press(screen.getByTestId('sort-sheet-close-button'));
      expect(onDismissMock).toHaveBeenCalledTimes(1);
    });

    it('exposes imperative ref methods (present, dismiss, expand, close)', () => {
      const ref = React.createRef<SortBottomSheetRef>();
      const onDismissMock = jest.fn();

      render(<SortBottomSheet category="AUDIO" onDismiss={onDismissMock} ref={ref} />);

      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.present).toBe('function');
      expect(typeof ref.current?.dismiss).toBe('function');
      expect(typeof ref.current?.expand).toBe('function');
      expect(typeof ref.current?.close).toBe('function');

      // Calling dismiss triggers onDismiss
      ref.current?.dismiss();
      expect(onDismissMock).toHaveBeenCalled();
    });
  });
});
