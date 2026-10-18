import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { AppNavigator } from '@app/AppNavigator';
import { mediaRepository } from '@core/storage/mediaRepository';
import { resumeManager } from '@core/storage/resumeManager';
import { folderPrefsStorage } from '@core/storage/mmkv';
import { permissionManager } from '@core/permissions/PermissionManager';
import { useMediaScannerStore } from '@core/store';
import { useResumeHistoryStore } from '@core/storage';
import type { FolderIndexRow, MediaCategory } from '@core/storage/types';

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

describe('Folder Explorer End-to-End Integration Flow', () => {
  const seededAudioFolders: FolderIndexRow[] = [
    {
      folder_path: '/storage/emulated/0/Music',
      folder_name: 'Music',
      category: 'AUDIO',
      item_count: 42,
      total_size_bytes: 150 * 1024 * 1024,
      thumbnail_uri: null,
      last_modified: 1700000000000,
      is_excluded: 0,
    },
    {
      folder_path: '/storage/emulated/0/WhatsApp/Media/WhatsApp Audio',
      folder_name: 'WhatsApp Audio',
      category: 'AUDIO',
      item_count: 18,
      total_size_bytes: 50 * 1024 * 1024,
      thumbnail_uri: null,
      last_modified: 1700001000000,
      is_excluded: 0,
    },
  ];

  const seededVideoFolders: FolderIndexRow[] = [
    {
      folder_path: '/storage/emulated/0/Movies',
      folder_name: 'Movies',
      category: 'VIDEO',
      item_count: 8,
      total_size_bytes: 1200 * 1024 * 1024,
      thumbnail_uri: '/storage/emulated/0/Movies/sample.mp4',
      last_modified: 1700002000000,
      is_excluded: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useMediaScannerStore.getState().reset();
    useResumeHistoryStore.setState({ items: [] });
    folderPrefsStorage.clearAll();

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

    jest.spyOn(mediaRepository, 'getFoldersByCategory').mockImplementation(async (category: MediaCategory) => {
      if (category === 'AUDIO') {
        return seededAudioFolders;
      }
      if (category === 'VIDEO') {
        return seededVideoFolders;
      }
      return [];
    });

    jest.spyOn(mediaRepository, 'getFolderPathsForFiles').mockImplementation(async (category: MediaCategory) => {
      if (category === 'AUDIO') {
        return new Set(['/storage/emulated/0/Music']);
      }
      return new Set();
    });

    jest.spyOn(resumeManager, 'getUnfinishedRecords').mockReturnValue([
      {
        fileId: 'audio-track-1',
        filePath: '/storage/emulated/0/Music/song.mp3',
        category: 'AUDIO',
        positionMs: 45000,
        durationMs: 180000,
        lastPlayedTimestamp: 1700000000000,
        isCompleted: false,
      },
    ]);
  });

  it('completes the full journey: Dashboard -> FolderExplorer -> FileListScreen with category isolation and messenger filtering', async () => {
    render(<AppNavigator />);

    // 1. Verify Category Dashboard is rendered
    expect(screen.getByTestId('category-dashboard-screen')).toBeTruthy();

    // 2. Tap Audio card on Dashboard
    const audioCard = screen.getByTestId('category-card-audio');
    expect(audioCard).toBeTruthy();

    act(() => {
      fireEvent.press(audioCard);
    });

    // 3. Verify FolderExplorerScreen is displayed with AUDIO category
    await waitFor(() => {
      expect(screen.getByTestId('folder-explorer-screen')).toBeTruthy();
      expect(screen.getByTestId('folder-explorer-title')).toHaveTextContent('Audio Folders');
      expect(screen.getByTestId('folder-explorer-category')).toHaveTextContent('Category: AUDIO');
    });

    // 4. Verify only AUDIO folders are present; VIDEO folder "Movies" must NOT appear
    await waitFor(() => {
      expect(screen.getByText('Music')).toBeTruthy();
      expect(screen.getByText('WhatsApp Audio')).toBeTruthy();
    });
    expect(screen.queryByText('Movies')).toBeNull();

    // 5. Verify folder metadata, badges, and fallback icon on "Music"
    expect(screen.getByText('42 Audios • 150 MB')).toBeTruthy();
    const musicItem = screen.getByTestId('folder-list-item-AUDIO:/storage/emulated/0/Music');
    expect(musicItem).toBeTruthy();
    // Music has unfinished progress: active indicator must be visible
    expect(screen.getByTestId('folder-active-indicator')).toBeTruthy();
    // Music has no thumbnail: category fallback icon must be visible
    expect(screen.getAllByTestId('folder-fallback-icon').length).toBeGreaterThan(0);

    // 6. Verify Messenger badge on WhatsApp folder
    const whatsappBadge = screen.getByTestId('folder-messenger-badge');
    expect(whatsappBadge).toBeTruthy();
    expect(screen.getByText('Messenger')).toBeTruthy();
    expect(screen.getByText('18 Audios • 50 MB')).toBeTruthy();

    // 7. Toggle "Hide WhatsApp/Telegram Folders" in overflow menu
    const menuButton = screen.getAllByTestId('folder-explorer-menu-button')[0];
    act(() => {
      fireEvent.press(menuButton);
    });

    const hideMessengerChip = screen.getByTestId('hide-messenger-toggle-chip');
    act(() => {
      fireEvent.press(hideMessengerChip);
    });

    // WhatsApp folder is now filtered out immediately
    expect(screen.queryByText('WhatsApp Audio')).toBeNull();
    expect(screen.getByText('Music')).toBeTruthy();

    // Reopen menu and uncheck "Hide WhatsApp/Telegram Folders"
    const reopenMenu = screen.getAllByTestId('folder-explorer-menu-button')[0];
    act(() => {
      fireEvent.press(reopenMenu);
    });
    const chipToggleOff = screen.getByTestId('hide-messenger-toggle-chip');
    act(() => {
      fireEvent.press(chipToggleOff);
    });

    // WhatsApp folder is restored
    expect(screen.getByText('WhatsApp Audio')).toBeTruthy();

    // 8. Tap "Music" folder and verify navigation to FileListScreen with correct params
    act(() => {
      fireEvent.press(musicItem);
    });

    await waitFor(() => {
      expect(screen.getByTestId('file-list-screen-placeholder')).toBeTruthy();
      expect(screen.getByTestId('file-list-folder-id')).toHaveTextContent(
        'AUDIO:/storage/emulated/0/Music',
      );
      expect(screen.getByTestId('file-list-title')).toHaveTextContent('Music');
      expect(screen.getByTestId('file-list-folder-path')).toHaveTextContent(
        '/storage/emulated/0/Music',
      );
      expect(screen.getByTestId('file-list-category')).toHaveTextContent('AUDIO');
    });
  });

  it('supports List / Grid view toggling and navigates from Grid View', async () => {
    render(<AppNavigator />);

    // Tap Audio card on Dashboard
    act(() => {
      fireEvent.press(screen.getByTestId('category-card-audio'));
    });

    await waitFor(() => {
      expect(screen.getByText('Music')).toBeTruthy();
    });

    // Switch to Grid View
    const menuButton = screen.getAllByTestId('folder-explorer-menu-button')[0];
    act(() => {
      fireEvent.press(menuButton);
    });
    const toggleViewMode = screen.getByTestId('toggle-view-mode-menu-item');
    act(() => {
      fireEvent.press(toggleViewMode);
    });

    // Verify grid cards render
    await waitFor(() => {
      expect(screen.getByTestId('folder-grid-item-AUDIO:/storage/emulated/0/Music')).toBeTruthy();
    });
    expect(screen.queryByTestId('folder-list-item-AUDIO:/storage/emulated/0/Music')).toBeNull();

    // Tap grid card to navigate to FileListScreen
    act(() => {
      fireEvent.press(screen.getByTestId('folder-grid-item-AUDIO:/storage/emulated/0/Music'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('file-list-screen-placeholder')).toBeTruthy();
      expect(screen.getByTestId('file-list-folder-path')).toHaveTextContent(
        '/storage/emulated/0/Music',
      );
    });
  });
});
