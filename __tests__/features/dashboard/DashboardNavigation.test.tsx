import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AppNavigator } from '@app/AppNavigator';
import { useMediaScannerStore } from '@core/store';
import { useResumeHistoryStore } from '@core/storage';
import type { MediaCategory } from '@core/storage/types';

jest.mock('@core/theme', () => ({
  __esModule: true,
  CATEGORY_ACCENT_COLORS: {
    audio: '#8B5CF6',
    video: '#F97316',
    photo: '#10B981',
    pdf: '#EF4444',
    doc: '#3B82F6',
  },
  useAppTheme: () => ({
    appColors: {
      background: '#F8FAFC',
      surface: '#ffffff',
      surfaceVariant: '#F1F5F9',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      primary: '#2563eb',
      onPrimary: '#FFFFFF',
      error: '#EF4444',
    },
    colors: {
      primary: '#2563eb',
    },
  }),
}));

describe('Dashboard Category Navigation to FolderExplorer', () => {
  beforeEach(() => {
    useMediaScannerStore.getState().reset();
    useResumeHistoryStore.setState({ items: [] });
  });

  const categories: Array<{
    cardKey: string;
    cardTitle: string;
    expectedCategory: MediaCategory;
  }> = [
    { cardKey: 'audio', cardTitle: 'Audio', expectedCategory: 'AUDIO' },
    { cardKey: 'video', cardTitle: 'Video', expectedCategory: 'VIDEO' },
    { cardKey: 'photo', cardTitle: 'Photos', expectedCategory: 'PHOTO' },
    { cardKey: 'pdf', cardTitle: 'PDF', expectedCategory: 'PDF' },
    { cardKey: 'doc', cardTitle: 'Other Docs', expectedCategory: 'OTHER_DOC' },
  ];

  it.each(categories)(
    'taps $cardTitle ($cardKey) and navigates to FolderExplorer with typed param: $expectedCategory',
    async ({ cardKey, expectedCategory }) => {
      render(<AppNavigator />);

      expect(screen.getByTestId('category-dashboard-screen')).toBeTruthy();

      const card = screen.getByTestId(`category-card-${cardKey}`);
      expect(card).toBeTruthy();

      act(() => {
        fireEvent.press(card);
      });

      await waitFor(() => {
        expect(screen.getByTestId('folder-explorer-screen')).toBeTruthy();
        expect(screen.getByTestId('folder-explorer-category')).toBeTruthy();
        expect(screen.getByText(`Category: ${expectedCategory}`)).toBeTruthy();
      });
    },
  );
});
