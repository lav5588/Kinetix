import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { permissionManager } from '@core/permissions/PermissionManager';
import {
  FolderExplorerScreen,
  getCategoryTitle,
} from '@features/browser/FolderExplorerScreen';
import { FolderExplorerService } from '@features/browser/services/FolderExplorerService';
import type { FolderItemViewModel } from '@features/browser/types';

describe('FolderExplorerScreen', () => {
  const audioFolders: FolderItemViewModel[] = [
    {
      id: 'AUDIO:/storage/emulated/0/Music',
      folderPath: '/storage/emulated/0/Music',
      folderName: 'Music',
      category: 'AUDIO',
      itemCount: 42,
      totalSizeBytes: 150 * 1024 * 1024,
      thumbnailUri: null,
      lastModified: 1700000000000,
      isExcluded: false,
      isMessengerFolder: false,
      hasUnfinishedResume: true,
    },
    {
      id: 'AUDIO:/storage/emulated/0/WhatsApp/Media/WhatsApp Audio',
      folderPath: '/storage/emulated/0/WhatsApp/Media/WhatsApp Audio',
      folderName: 'WhatsApp Audio',
      category: 'AUDIO',
      itemCount: 18,
      totalSizeBytes: 50 * 1024 * 1024,
      thumbnailUri: null,
      lastModified: 1700001000000,
      isExcluded: false,
      isMessengerFolder: true,
      hasUnfinishedResume: false,
    },
  ];

  const videoFolders: FolderItemViewModel[] = [
    {
      id: 'VIDEO:/storage/emulated/0/Movies',
      folderPath: '/storage/emulated/0/Movies',
      folderName: 'Movies',
      category: 'VIDEO',
      itemCount: 8,
      totalSizeBytes: 1200 * 1024 * 1024,
      thumbnailUri: '/storage/emulated/0/Movies/sample.mp4',
      lastModified: 1700002000000,
      isExcluded: false,
      isMessengerFolder: false,
      hasUnfinishedResume: false,
    },
  ];

  let mockGetFolders: jest.Mock;
  let mockGetHideMessengerPreference: jest.Mock;
  let mockSetHideMessengerPreference: jest.Mock;
  let mockService: FolderExplorerService;
  let mockNavigation: { goBack: jest.Mock; canGoBack: jest.Mock; navigate: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetFolders = jest.fn(async (category) => {
      if (category === 'AUDIO') return audioFolders;
      if (category === 'VIDEO') return videoFolders;
      return [];
    });
    mockGetHideMessengerPreference = jest.fn(() => false);
    mockSetHideMessengerPreference = jest.fn();

    mockService = {
      getFolders: mockGetFolders,
      getHideMessengerPreference: mockGetHideMessengerPreference,
      setHideMessengerPreference: mockSetHideMessengerPreference,
      getViewModePreference: jest.fn(() => 'list'),
      setViewModePreference: jest.fn(),
    } as unknown as FolderExplorerService;

    mockNavigation = {
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      navigate: jest.fn(),
    };

    jest.spyOn(permissionManager, 'getPermissionSnapshot').mockResolvedValue({
      mediaPermissionsReady: true,
      audioGranted: true,
      videoGranted: true,
      imagesGranted: true,
      allFilesAccessRequired: false,
      allFilesAccessEnabled: false,
      needsRationale: false,
      systemSettingsRequired: false,
      scope: 'granular',
    });
  });

  describe('Category Binding and Titles', () => {
    it('renders AUDIO category with correct title and queried data', async () => {
      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Music')).toBeTruthy();
      });

      expect(screen.getByTestId('folder-explorer-title')).toHaveTextContent('Audio Folders');
      expect(screen.getByTestId('folder-explorer-category')).toHaveTextContent('Category: AUDIO');
      expect(mockGetFolders).toHaveBeenCalledWith('AUDIO');
      expect(screen.getByText('WhatsApp Audio')).toBeTruthy();
    });

    it('renders VIDEO category with correct title and queried data', async () => {
      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'VIDEO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Movies')).toBeTruthy();
      });

      expect(screen.getByTestId('folder-explorer-title')).toHaveTextContent('Video Folders');
      expect(screen.getByTestId('folder-explorer-category')).toHaveTextContent('Category: VIDEO');
      expect(mockGetFolders).toHaveBeenCalledWith('VIDEO');
    });

    it('provides correct category titles for all supported media types', () => {
      expect(getCategoryTitle('AUDIO')).toBe('Audio Folders');
      expect(getCategoryTitle('VIDEO')).toBe('Video Folders');
      expect(getCategoryTitle('PHOTO')).toBe('Photo Folders');
      expect(getCategoryTitle('PDF')).toBe('PDF Folders');
      expect(getCategoryTitle('OTHER_DOC')).toBe('Document Folders');
    });
  });

  describe('Hide WhatsApp/Telegram Toggle Chip', () => {
    it('immediately hides messenger folders when toggled on, and restores them when toggled off', async () => {
      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('WhatsApp Audio')).toBeTruthy();
      });

      const menuButton = screen.getByTestId('folder-explorer-menu-button');

      // Open menu and toggle ON (hide messenger folders)
      fireEvent.press(menuButton);
      const chip = screen.getByTestId('hide-messenger-toggle-chip');
      fireEvent.press(chip);

      expect(mockSetHideMessengerPreference).toHaveBeenCalledWith(true);
      expect(screen.queryByText('WhatsApp Audio')).toBeNull();
      expect(screen.getByText('Music')).toBeTruthy();

      // Open menu and toggle OFF (show messenger folders again)
      fireEvent.press(menuButton);
      const chipToggleOff = screen.getByTestId('hide-messenger-toggle-chip');
      fireEvent.press(chipToggleOff);

      expect(mockSetHideMessengerPreference).toHaveBeenCalledWith(false);
      expect(screen.getByText('WhatsApp Audio')).toBeTruthy();
      expect(screen.getByText('Music')).toBeTruthy();

      // Does not re-query database unnecessarily
      expect(mockGetFolders).toHaveBeenCalledTimes(1);
    });
  });

  describe('View Mode (List / Grid) Toggle in Overflow Menu', () => {
    it('switches between List View and Grid View when toggled from overflow menu', async () => {
      const mockSetViewModePreference = jest.fn();
      mockService.getViewModePreference = jest.fn(() => 'list');
      mockService.setViewModePreference = mockSetViewModePreference;

      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Music')).toBeTruthy();
      });

      // Default is list view: folder-list-item is rendered
      expect(screen.getByTestId(`folder-list-item-${audioFolders[0].id}`)).toBeTruthy();
      expect(screen.queryByTestId(`folder-grid-item-${audioFolders[0].id}`)).toBeNull();

      const menuButton = screen.getByTestId('folder-explorer-menu-button');

      // Open menu and switch to Grid View
      fireEvent.press(menuButton);
      const toggleViewMode = screen.getByTestId('toggle-view-mode-menu-item');
      expect(screen.getByText('Switch to Grid View')).toBeTruthy();
      fireEvent.press(toggleViewMode);

      expect(mockSetViewModePreference).toHaveBeenCalledWith('grid');

      // Now grid view: folder-grid-item is rendered
      await waitFor(() => {
        expect(screen.getByTestId(`folder-grid-item-${audioFolders[0].id}`)).toBeTruthy();
      });
      expect(screen.queryByTestId(`folder-list-item-${audioFolders[0].id}`)).toBeNull();

      // Open menu and switch back to List View
      fireEvent.press(menuButton);
      expect(screen.getByText('Switch to List View')).toBeTruthy();
      fireEvent.press(screen.getByTestId('toggle-view-mode-menu-item'));

      expect(mockSetViewModePreference).toHaveBeenCalledWith('list');

      await waitFor(() => {
        expect(screen.getByTestId(`folder-list-item-${audioFolders[0].id}`)).toBeTruthy();
      });
    });
  });

  describe('UI States', () => {
    it('renders loading state initially while querying folders', () => {
      // Return a pending promise to inspect loading state
      mockService.getFolders = jest.fn(() => new Promise(() => {}));

      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      expect(screen.getByTestId('folder-explorer-loading')).toBeTruthy();
      expect(screen.getByText('Loading folders...')).toBeTruthy();
    });

    it('renders empty state when no folders are found', async () => {
      mockService.getFolders = jest.fn(async () => []);

      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('folder-explorer-empty')).toBeTruthy();
        expect(screen.getByText('No Folders Found')).toBeTruthy();
      });
    });

    it('renders error state when database query fails, and allows retry', async () => {
      mockService.getFolders = jest
        .fn()
        .mockRejectedValueOnce(new Error('Disk I/O error'))
        .mockResolvedValueOnce(audioFolders);

      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('folder-explorer-error')).toBeTruthy();
        expect(screen.getByText('Disk I/O error')).toBeTruthy();
      });

      // Press Retry button
      const retryBtn = screen.getByTestId('folder-explorer-retry-button');
      fireEvent.press(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('Music')).toBeTruthy();
        expect(screen.queryByTestId('folder-explorer-error')).toBeNull();
      });
    });

    it('renders permission-required state when permissions are missing', async () => {
      jest.spyOn(permissionManager, 'getPermissionSnapshot').mockResolvedValue({
        mediaPermissionsReady: false,
        audioGranted: false,
        videoGranted: false,
        imagesGranted: false,
        allFilesAccessRequired: false,
        allFilesAccessEnabled: false,
        needsRationale: true,
        systemSettingsRequired: false,
        scope: 'granular',
      });

      render(
        <FolderExplorerScreen
          checkPermissionsOnInit
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('folder-explorer-permission-required')).toBeTruthy();
        expect(screen.getByText('Permission Required')).toBeTruthy();
      });

      // Press Grant Permission button
      const grantBtn = screen.getByTestId('grant-permission-button');
      fireEvent.press(grantBtn);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PermissionGatekeeper');
    });
  });

  describe('Interactions and Navigation', () => {
    it('calls navigation.goBack() when pressing the back button', async () => {
      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('folder-explorer-back-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('folder-explorer-back-button'));
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('forwards folder press to onFolderPress callback', async () => {
      const onFolderPress = jest.fn();

      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          onFolderPress={onFolderPress}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Music')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId(`folder-list-item-${audioFolders[0].id}`));

      expect(onFolderPress).toHaveBeenCalledTimes(1);
      expect(onFolderPress).toHaveBeenCalledWith(audioFolders[0]);
    });

    it('navigates to FileListScreen with folderId, folderPath, folderName, and category when a folder item is pressed', async () => {
      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'AUDIO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Music')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId(`folder-list-item-${audioFolders[0].id}`));

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('FileListScreen', {
        folderId: audioFolders[0].id,
        folderPath: audioFolders[0].folderPath,
        folderName: audioFolders[0].folderName,
        category: 'AUDIO',
      });
    });

    it('navigates to FileListScreen with correct params when a folder item is pressed in Grid View', async () => {
      mockService.getViewModePreference = jest.fn(() => 'grid');

      render(
        <FolderExplorerScreen
          folderService={mockService}
          navigation={mockNavigation as never}
          route={{ params: { category: 'VIDEO' } } as never}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Movies')).toBeTruthy();
      });

      const gridItem = screen.getByTestId(`folder-grid-item-${videoFolders[0].id}`);
      fireEvent.press(gridItem);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('FileListScreen', {
        folderId: videoFolders[0].id,
        folderPath: videoFolders[0].folderPath,
        folderName: videoFolders[0].folderName,
        category: 'VIDEO',
      });
    });
  });
});

