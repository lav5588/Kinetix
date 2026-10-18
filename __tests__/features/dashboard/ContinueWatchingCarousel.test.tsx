import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  appSettingsStorage,
  useResumeHistoryStore,
  type ResumeRecord,
} from '@core/storage';
import {
  ContinueWatchingCarousel,
  formatDuration,
} from '@features/dashboard/components/ContinueWatchingCarousel';

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
    },
    colors: {
      primary: '#2563eb',
    },
  }),
}));

const mockItems: ResumeRecord[] = [
  {
    filePath: '/storage/emulated/0/Movies/Inception.mp4',
    fileName: 'Inception.mp4',
    category: 'video',
    lastOpenedAt: 1700000000000,
    positionMs: 60000,
    durationMs: 120000,
  },
  {
    filePath: '/storage/emulated/0/Music/Song.mp3',
    fileName: 'Song.mp3',
    category: 'audio',
    lastOpenedAt: 1699999000000,
    positionMs: 30000,
    durationMs: 180000,
  },
  {
    filePath: '/storage/emulated/0/Documents/Book.pdf',
    fileName: 'Book.pdf',
    category: 'pdf',
    lastOpenedAt: 1699998000000,
    pdfPage: 15,
    pdfTotalPages: 30,
  },
  {
    filePath: '/storage/emulated/0/Movies/Finished.mp4',
    fileName: 'Finished.mp4',
    category: 'video',
    lastOpenedAt: 1699997000000,
    isCompleted: true,
  },
  {
    filePath: '/storage/emulated/0/Pictures/Photo.jpg',
    fileName: '',
    category: 'photo',
    lastOpenedAt: 1699996000000,
  },
];

describe('ContinueWatchingCarousel', () => {
  beforeEach(() => {
    appSettingsStorage.clearAll();
    useResumeHistoryStore.setState({ items: [] });
  });

  describe('formatDuration helper', () => {
    it('formats milliseconds correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(45000)).toBe('0:45');
      expect(formatDuration(65000)).toBe('1:05');
      expect(formatDuration(3665000)).toBe('1:01:05');
      expect(formatDuration(null)).toBe('0:00');
      expect(formatDuration(-100)).toBe('0:00');
    });
  });

  describe('Empty and Hidden States', () => {
    it('returns null when resume history is empty', () => {
      useResumeHistoryStore.setState({ items: [] });

      const { toJSON } = render(<ContinueWatchingCarousel />);
      expect(toJSON()).toBeNull();
    });

    it('returns null when disabled via appSettingsStorage show_continue_carousel = false', () => {
      useResumeHistoryStore.setState({ items: mockItems });
      appSettingsStorage.set('show_continue_carousel', false);

      const { toJSON } = render(<ContinueWatchingCarousel />);
      expect(toJSON()).toBeNull();
    });

    it('returns null when disabled via enabled prop', () => {
      useResumeHistoryStore.setState({ items: mockItems });

      const { toJSON } = render(<ContinueWatchingCarousel enabled={false} />);
      expect(toJSON()).toBeNull();
    });

    it('returns null when disabled via showContinueCarousel prop', () => {
      useResumeHistoryStore.setState({ items: mockItems });

      const { toJSON } = render(<ContinueWatchingCarousel showContinueCarousel={false} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('Populated History Rendering', () => {
    beforeEach(() => {
      useResumeHistoryStore.setState({ items: mockItems });
    });

    it('renders the carousel header and items', () => {
      render(<ContinueWatchingCarousel />);

      expect(screen.getByTestId('continue-watching-carousel')).toBeTruthy();
      expect(screen.getByText('Continue Watching')).toBeTruthy();

      // Video item
      expect(screen.getByText('Inception.mp4')).toBeTruthy();
      expect(screen.getByText('1:00 / 2:00 (50%)')).toBeTruthy();

      // Audio item
      expect(screen.getByText('Song.mp3')).toBeTruthy();
      expect(screen.getByText('0:30 / 3:00 (17%)')).toBeTruthy();

      // PDF item
      expect(screen.getByText('Book.pdf')).toBeTruthy();
      expect(screen.getByText('Page 15 of 30 (50%)')).toBeTruthy();

      // Completed item
      expect(screen.getByText('Finished.mp4')).toBeTruthy();
      expect(screen.getByText('Completed')).toBeTruthy();

      // Missing fileName fallback
      expect(screen.getByText('Photo.jpg')).toBeTruthy();
    });

    it('handles items without optional metadata gracefully', () => {
      const minimalItem: ResumeRecord = {
        filePath: '/storage/emulated/0/Test/UnknownFile',
        fileName: '',
        category: 'video',
        lastOpenedAt: 12345,
      };

      useResumeHistoryStore.setState({ items: [minimalItem] });

      render(<ContinueWatchingCarousel />);

      expect(screen.getByText('UnknownFile')).toBeTruthy();
      expect(screen.getByText('Video')).toBeTruthy();
    });

    it('triggers onItemPress when an item is tapped', () => {
      const onItemPress = jest.fn();

      render(<ContinueWatchingCarousel onItemPress={onItemPress} />);

      const firstCard = screen.getByTestId(
        `continue-card-${mockItems[0].filePath}`,
      );
      expect(firstCard).toBeTruthy();

      fireEvent.press(firstCard);
      expect(onItemPress).toHaveBeenCalledTimes(1);
      expect(onItemPress).toHaveBeenCalledWith(mockItems[0]);
    });

    it('respects the limit prop', () => {
      render(<ContinueWatchingCarousel limit={2} />);

      expect(screen.getByText('Inception.mp4')).toBeTruthy();
      expect(screen.getByText('Song.mp3')).toBeTruthy();
      expect(screen.queryByText('Book.pdf')).toBeNull();
    });

    it('provides accessible accessibilityRole and label', () => {
      render(<ContinueWatchingCarousel />);

      const firstCard = screen.getByTestId(
        `continue-card-${mockItems[0].filePath}`,
      );
      expect(firstCard.props.accessibilityRole).toBe('button');
      expect(firstCard.props.accessibilityLabel).toContain('Inception.mp4');
      expect(firstCard.props.accessibilityLabel).toContain('Video');
      expect(firstCard.props.accessibilityLabel).toContain('50%');
    });
  });
});
