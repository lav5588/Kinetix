import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useMediaScannerStore } from '@core/store';
import { useResumeHistoryStore } from '@core/storage';
import { CategoryDashboardScreen } from '@features/dashboard/CategoryDashboardScreen';

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

describe('CategoryDashboardScreen', () => {
  beforeEach(() => {
    useMediaScannerStore.getState().reset();
    useResumeHistoryStore.setState({ items: [] });
  });

  describe('Live category counts & Zero / Large file states', () => {
    it('renders all 5 cards with 0 items initially', () => {
      render(<CategoryDashboardScreen initDatabaseOnMount={false} />);

      expect(screen.getByText('Audio')).toBeTruthy();
      expect(screen.getByText('Video')).toBeTruthy();
      expect(screen.getByText('Photos')).toBeTruthy();
      expect(screen.getByText('PDF')).toBeTruthy();
      expect(screen.getByText('Other Docs')).toBeTruthy();

      const zeroItemElements = screen.getAllByText('0 items');
      expect(zeroItemElements.length).toBe(5);
    });

    it('renders live category counts mapped from useMediaScannerStore', () => {
      useMediaScannerStore.setState({
        categoryCounts: {
          AUDIO: 12,
          VIDEO: 8,
          PHOTO: 120,
          PDF: 4,
          OTHER_DOC: 25,
        },
      });

      render(<CategoryDashboardScreen initDatabaseOnMount={false} />);

      expect(screen.getByText('12 items')).toBeTruthy();
      expect(screen.getByText('8 items')).toBeTruthy();
      expect(screen.getByText('120 items')).toBeTruthy();
      expect(screen.getByText('4 items')).toBeTruthy();
      expect(screen.getByText('25 items')).toBeTruthy();
    });

    it('handles very large counts gracefully', () => {
      useMediaScannerStore.setState({
        categoryCounts: {
          AUDIO: 50000,
          VIDEO: 10000,
          PHOTO: 250000,
          PDF: 1500,
          OTHER_DOC: 8000,
        },
      });

      render(<CategoryDashboardScreen initDatabaseOnMount={false} />);

      expect(screen.getByText('50000 items')).toBeTruthy();
      expect(screen.getByText('250000 items')).toBeTruthy();
    });
  });

  describe('Navigation & Category selection', () => {
    it('dispatches onSelectCategory and navigates to FolderExplorer with typed category', () => {
      const navigate = jest.fn();
      const onSelectCategory = jest.fn();

      render(
        <CategoryDashboardScreen initDatabaseOnMount={false}
          navigation={{ navigate }}
          onSelectCategory={onSelectCategory}
        />,
      );

      const audioCard = screen.getByTestId('category-card-audio');
      fireEvent.press(audioCard);

      expect(onSelectCategory).toHaveBeenCalledWith('AUDIO');
      expect(navigate).toHaveBeenCalledWith('FolderExplorer', { category: 'AUDIO' });

      const videoCard = screen.getByTestId('category-card-video');
      fireEvent.press(videoCard);

      expect(onSelectCategory).toHaveBeenCalledWith('VIDEO');
      expect(navigate).toHaveBeenCalledWith('FolderExplorer', { category: 'VIDEO' });
    });
  });

  describe('Progress indicator & Scan state', () => {
    it('shows non-blocking progress indicator while scanning or indexing', () => {
      useMediaScannerStore.setState({
        status: 'scanning',
        phase: 'discovering',
      });

      const { rerender } = render(<CategoryDashboardScreen initDatabaseOnMount={false} />);
      expect(screen.getByTestId('scanner-progress-indicator')).toBeTruthy();
      expect(screen.getByText('Scanning device for media files...')).toBeTruthy();

      act(() => {
        useMediaScannerStore.setState({
          status: 'indexing',
          phase: 'indexing',
          progressPercent: 75,
        });
      });

      rerender(<CategoryDashboardScreen initDatabaseOnMount={false} />);
      expect(screen.getByTestId('scanner-progress-indicator')).toBeTruthy();
      expect(screen.getByText('Indexing media files... 75%')).toBeTruthy();

      act(() => {
        useMediaScannerStore.setState({
          status: 'idle',
          phase: null,
        });
      });

      rerender(<CategoryDashboardScreen initDatabaseOnMount={false} />);
      expect(screen.queryByTestId('scanner-progress-indicator')).toBeNull();
    });
  });

  describe('Pull-to-refresh & concurrent scan prevention', () => {
    it('triggers pull-to-refresh scan via scannerService', async () => {
      const mockScan = jest.fn().mockResolvedValue({
        status: 'completed',
        errors: [],
      });

      const scannerService = {
        startScan: mockScan,
      };

      render(<CategoryDashboardScreen initDatabaseOnMount={false} scannerService={scannerService} />);

      const scroll = screen.getByTestId('category-dashboard-screen');
      const { refreshControl } = scroll.props;

      expect(refreshControl).toBeDefined();

      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      expect(mockScan).toHaveBeenCalledTimes(1);
    });

    it('prevents overlapping scans when refreshed repeatedly or while active', async () => {
      let resolveScan: (val: unknown) => void;
      const deferredScan = new Promise((resolve) => {
        resolveScan = resolve;
      });

      const mockScan = jest.fn().mockImplementation(() => deferredScan);

      const scannerService = {
        startScan: mockScan,
      };

      render(<CategoryDashboardScreen initDatabaseOnMount={false} scannerService={scannerService} />);

      const scroll = screen.getByTestId('category-dashboard-screen');
      const { refreshControl } = scroll.props;

      // Trigger first refresh and second refresh concurrently
      await act(async () => {
        const p1 = refreshControl.props.onRefresh();
        const p2 = refreshControl.props.onRefresh();
        resolveScan!({ status: 'completed', errors: [] });
        await Promise.all([p1, p2]);
      });

      expect(mockScan).toHaveBeenCalledTimes(1);
    });

    it('displays error notice without crashing when scan fails', async () => {
      const mockScan = jest.fn().mockResolvedValue({
        status: 'failed',
        errors: [{ message: 'Disk read failed during discovery' }],
      });

      const scannerService = {
        startScan: mockScan,
      };

      render(<CategoryDashboardScreen initDatabaseOnMount={false} scannerService={scannerService} />);

      const scroll = screen.getByTestId('category-dashboard-screen');
      await act(async () => {
        await scroll.props.refreshControl.props.onRefresh();
      });

      expect(await screen.findByTestId('scanner-error-banner')).toBeTruthy();
      expect(screen.getByText('Disk read failed during discovery')).toBeTruthy();
    });
  });

  describe('Permission gatekeeper guidance', () => {
    it('guides user to gatekeeper when scan reports permission_required', async () => {
      const navigate = jest.fn();
      const onRequirePermission = jest.fn();

      const mockScan = jest.fn().mockResolvedValue({
        status: 'permission_required',
        errors: [],
      });

      const scannerService = {
        startScan: mockScan,
      };

      render(
        <CategoryDashboardScreen initDatabaseOnMount={false}
          navigation={{ navigate }}
          onRequirePermission={onRequirePermission}
          scannerService={scannerService}
        />,
      );

      const scroll = screen.getByTestId('category-dashboard-screen');
      await act(async () => {
        await scroll.props.refreshControl.props.onRefresh();
      });

      expect(onRequirePermission).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('PermissionGatekeeper');
    });

    it('displays permission notice banner when lastScanStatus is permission_required and navigates on button tap', () => {
      const navigate = jest.fn();
      const onRequirePermission = jest.fn();

      useMediaScannerStore.setState({
        lastScanStatus: 'permission_required',
      });

      render(
        <CategoryDashboardScreen initDatabaseOnMount={false}
          navigation={{ navigate }}
          onRequirePermission={onRequirePermission}
        />,
      );

      expect(screen.getByTestId('permission-required-banner')).toBeTruthy();
      expect(screen.getByText('Storage Permission Needed')).toBeTruthy();

      const button = screen.getByTestId('grant-permission-button');
      fireEvent.press(button);

      expect(onRequirePermission).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('PermissionGatekeeper');
    });
  });

  describe('Embedded widgets & resume carousel', () => {
    it('embeds StorageAnalyzerWidget and ContinueWatchingCarousel cleanly', () => {
      useResumeHistoryStore.setState({
        items: [
          {
            filePath: '/storage/video.mp4',
            fileName: 'video.mp4',
            category: 'video',
            lastOpenedAt: Date.now(),
          },
        ],
      });

      render(<CategoryDashboardScreen initDatabaseOnMount={false} />);

      expect(screen.getByTestId('storage-analyzer-widget')).toBeTruthy();
      expect(screen.getByTestId('continue-watching-carousel')).toBeTruthy();
      expect(screen.getByText('video.mp4')).toBeTruthy();
    });
  });
});
