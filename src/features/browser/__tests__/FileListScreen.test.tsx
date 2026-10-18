import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { FileListScreen } from '../FileListScreen';
import { fileRepository } from '@core/storage/repositories/FileRepository';
import { useBrowserFilterStore } from '@core/store/useBrowserFilterStore';
import { useResumeHistoryStore } from '@core/storage/useResumeStore';
import { sortFilterStorage } from '@core/storage/mmkv';
import type { MediaFileRow, ResumeRecord } from '@core/storage/types';

jest.mock('@core/storage/repositories/FileRepository', () => ({
  fileRepository: {
    getFilesByFolder: jest.fn(),
    searchFilesFts: jest.fn(),
  },
}));

describe('Task 8 Subtask 8: FileListScreen', () => {
  const mockAudioFiles: MediaFileRow[] = [
    {
      id: 'audio-001',
      file_path: '/storage/emulated/0/Music/SongA.mp3',
      file_name: 'Alpha Song.mp3',
      extension: 'mp3',
      mime_type: 'audio/mpeg',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music',
      folder_name: 'Music',
      size_bytes: 5 * 1024 * 1024, // 5 MB
      duration_ms: 180000, // 3:00
      width: null,
      height: null,
      artist: 'Artist A',
      album: 'Album 1',
      date_modified: 1700000000000,
      date_added: 1700000000000,
      is_hidden: 0,
      is_messenger_media: 0,
      is_favorite: 1,
      is_vaulted: 0,
    },
    {
      id: 'audio-002',
      file_path: '/storage/emulated/0/Music/SongB.flac',
      file_name: 'Beta Song.flac',
      extension: 'flac',
      mime_type: 'audio/flac',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music',
      folder_name: 'Music',
      size_bytes: 120 * 1024 * 1024, // 120 MB (> 100 MB Large File)
      duration_ms: 360000, // 6:00
      width: null,
      height: null,
      artist: 'Artist B',
      album: 'Album 2',
      date_modified: 1705000000000,
      date_added: 1705000000000,
      is_hidden: 0,
      is_messenger_media: 0,
      is_favorite: 0,
      is_vaulted: 0,
    },
    {
      id: 'audio-003',
      file_path: '/storage/emulated/0/Music/Podcast.mp3',
      file_name: 'Gamma Podcast.mp3',
      extension: 'mp3',
      mime_type: 'audio/mpeg',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music',
      folder_name: 'Music',
      size_bytes: 30 * 1024 * 1024,
      duration_ms: 3600000,
      width: null,
      height: null,
      artist: 'Host',
      album: 'Show',
      date_modified: 1708000000000,
      date_added: 1708000000000,
      is_hidden: 0,
      is_messenger_media: 0,
      is_favorite: 0,
      is_vaulted: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    sortFilterStorage.clearAll();
    useBrowserFilterStore.getState().resetAllPreferences();
    useResumeHistoryStore.setState({ items: [] });
    (fileRepository.getFilesByFolder as jest.Mock).mockResolvedValue(mockAudioFiles);
    (fileRepository.searchFilesFts as jest.Mock).mockResolvedValue([]);
  });

  describe('Scoped files loading & rendering', () => {
    it('queries fileRepository.getFilesByFolder with folderPath and category', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(fileRepository.getFilesByFolder).toHaveBeenCalledWith(
          expect.objectContaining({
            folderPath: '/storage/emulated/0/Music',
            category: 'AUDIO',
          }),
        );
      });

      expect(screen.getByTestId('flash-list-files')).toBeTruthy();
      expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      expect(screen.getByText('Beta Song.flac')).toBeTruthy();
      expect(screen.getByText('Gamma Podcast.mp3')).toBeTruthy();
    });

    it('invokes onFilePress when a file card is pressed', async () => {
      const onFilePressMock = jest.fn();
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
          onFilePress={onFilePressMock}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('file-list-item-audio-001')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('file-list-item-audio-001'));
      expect(onFilePressMock).toHaveBeenCalledWith(mockAudioFiles[0]);
    });
  });

  describe('View Mode toggling (List / Grid)', () => {
    it('toggles view mode between LIST and GRID and updates per-category preferences', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('flash-list-files')).toBeTruthy();
      });

      // Default is LIST
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').viewMode).toBe('LIST');

      const toggleButton = screen.getByTestId('view-mode-toggle');
      fireEvent.press(toggleButton);

      // Now GRID
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').viewMode).toBe('GRID');

      // Toggling again returns to LIST
      fireEvent.press(toggleButton);
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').viewMode).toBe('LIST');
    });

    it('preserves separate view mode preferences across categories', async () => {
      useBrowserFilterStore.getState().setViewMode('AUDIO', 'GRID');
      useBrowserFilterStore.getState().setViewMode('VIDEO', 'LIST');

      const { unmount } = render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('flash-list-files')).toBeTruthy();
      });

      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').viewMode).toBe('GRID');
      expect(useBrowserFilterStore.getState().getPreferences('VIDEO').viewMode).toBe('LIST');

      unmount();
    });
  });

  describe('Debounced live search with FTS', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
    });

    it('triggers FTS search after 150 ms debounce when typing in search input', async () => {
      const searchResults: MediaFileRow[] = [mockAudioFiles[1]]; // Beta Song
      (fileRepository.searchFilesFts as jest.Mock).mockResolvedValue(searchResults);

      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      // Initial folder load
      await act(async () => {
        jest.runAllTicks();
      });

      const searchInput = screen.getByTestId('smart-search-input');
      fireEvent.changeText(searchInput, 'Beta');

      // Before 150 ms, search has not triggered
      expect(fileRepository.searchFilesFts).not.toHaveBeenCalled();

      // Advance by 150 ms
      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      expect(fileRepository.searchFilesFts).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Beta',
          folderPath: '/storage/emulated/0/Music',
          category: 'AUDIO',
        }),
      );
    });

    it('filters files in folder by substring query and restores on clear', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await act(async () => {
        jest.runAllTicks();
      });

      // Initially all 3 files are present
      expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      expect(screen.getByText('Beta Song.flac')).toBeTruthy();
      expect(screen.getByText('Gamma Podcast.mp3')).toBeTruthy();

      const searchInput = screen.getByTestId('smart-search-input');
      fireEvent.changeText(searchInput, 'Podcast');

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      // Only Gamma Podcast matches
      expect(screen.getByText('Gamma Podcast.mp3')).toBeTruthy();
      expect(screen.queryByText('Alpha Song.mp3')).toBeNull();
      expect(screen.queryByText('Beta Song.flac')).toBeNull();

      // Clear search query
      const clearButton = screen.getByTestId('search-clear-button');
      fireEvent.press(clearButton);

      await act(async () => {
        jest.advanceTimersByTime(150);
      });

      // All files restored
      expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      expect(screen.getByText('Beta Song.flac')).toBeTruthy();
      expect(screen.getByText('Gamma Podcast.mp3')).toBeTruthy();
    });
  });

  describe('Search placeholder formatting with fixed length and dots', () => {
    it('truncates long folder name in search placeholder to a fixed length ending with ...', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="WhatsApp Audio Very Long Name"
          folderPath="/storage/emulated/0/WhatsApp/Media"
        />,
      );

      await waitFor(() => {
        const searchInput = screen.getByTestId('smart-search-input');
        // Folder name is truncated after 14 chars: "WhatsApp Audio" -> "Search in WhatsApp Audio..."
        expect(searchInput.props.placeholder).toBe('Search in WhatsApp Audio...');
      });
    });
  });

  describe('Quick filter chips', () => {
    it('filters files to LARGE_FILES (> 100 MB)', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      });

      // Press Large Files chip (> 100MB)
      fireEvent.press(screen.getByTestId('filter-chip-large_files'));

      // Beta Song (120 MB) is visible, others are filtered out
      expect(screen.getByText('Beta Song.flac')).toBeTruthy();
      expect(screen.queryByText('Alpha Song.mp3')).toBeNull();
      expect(screen.queryByText('Gamma Podcast.mp3')).toBeNull();
    });

    it('filters files to FAVORITES', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      });

      // Press Favorites chip
      fireEvent.press(screen.getByTestId('filter-chip-favorites'));

      // Alpha Song has is_favorite: 1
      expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      expect(screen.queryByText('Beta Song.flac')).toBeNull();
      expect(screen.queryByText('Gamma Podcast.mp3')).toBeNull();
    });

    it('filters files to IN_PROGRESS based on resume records', async () => {
      const resumeRecord: ResumeRecord = {
        filePath: mockAudioFiles[2].file_path, // Gamma Podcast
        fileName: mockAudioFiles[2].file_name,
        category: 'audio',
        lastOpenedAt: Date.now(),
        positionMs: 600000,
        durationMs: 3600000,
        isCompleted: false,
      };

      useResumeHistoryStore.setState({ items: [resumeRecord] });

      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      });

      // Press In Progress chip
      fireEvent.press(screen.getByTestId('filter-chip-in_progress'));

      expect(screen.getByText('Gamma Podcast.mp3')).toBeTruthy();
      expect(screen.queryByText('Alpha Song.mp3')).toBeNull();
      expect(screen.queryByText('Beta Song.flac')).toBeNull();
    });

    it('filters files to UNWATCHED (excluding in-progress files) and restores with ALL', async () => {
      const resumeRecord: ResumeRecord = {
        filePath: mockAudioFiles[0].file_path, // Alpha Song is in-progress
        fileName: mockAudioFiles[0].file_name,
        category: 'audio',
        lastOpenedAt: Date.now(),
        positionMs: 30000,
        durationMs: 60000,
        isCompleted: false,
      };

      useResumeHistoryStore.setState({ items: [resumeRecord] });

      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      });

      // Press Unwatched chip
      fireEvent.press(screen.getByTestId('filter-chip-unwatched'));

      // Alpha Song is in progress, so only Beta and Gamma should be visible
      expect(screen.queryByText('Alpha Song.mp3')).toBeNull();
      expect(screen.getByText('Beta Song.flac')).toBeTruthy();
      expect(screen.getByText('Gamma Podcast.mp3')).toBeTruthy();

      // Press All chip
      fireEvent.press(screen.getByTestId('filter-chip-all'));

      // All 3 files are visible again
      expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      expect(screen.getByText('Beta Song.flac')).toBeTruthy();
      expect(screen.getByText('Gamma Podcast.mp3')).toBeTruthy();
    });
  });

  describe('Sorting integration', () => {
    it('sorts files by NAME DESC when sort direction changes', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('flash-list-files')).toBeTruthy();
      });

      // Update sort to NAME DESC
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'NAME', 'DESC');
      });

      // FlashList data should now be sorted Gamma, Beta, Alpha
      const flashList = screen.getByTestId('flash-list-files');
      const items = flashList.props.data as MediaFileRow[];
      expect(items.map((f) => f.file_name)).toEqual([
        'Gamma Podcast.mp3',
        'Beta Song.flac',
        'Alpha Song.mp3',
      ]);
    });

    it('opens SortBottomSheet when sort button is pressed and updates sorting', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('flash-list-files')).toBeTruthy();
      });

      // Open sort sheet
      fireEvent.press(screen.getByTestId('sort-button'));

      // Select Size (Largest)
      const sizeDescOption = screen.getByTestId('sort-option-size_desc');
      fireEvent.press(sizeDescOption);

      // Verify category preference updated
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').sortField).toBe('SIZE');
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').sortDirection).toBe('DESC');

      // Verify list is sorted by size DESC: Beta (120MB), Gamma (30MB), Alpha (5MB)
      const flashList = screen.getByTestId('flash-list-files');
      const items = flashList.props.data as MediaFileRow[];
      expect(items.map((f) => f.file_name)).toEqual([
        'Beta Song.flac',
        'Gamma Podcast.mp3',
        'Alpha Song.mp3',
      ]);
    });

    it('sorts 20 mock files accurately across all 4 fields and both directions', async () => {
      const mock20Files: MediaFileRow[] = Array.from({ length: 20 }, (_, i) => ({
        id: `file-${String(i + 1).padStart(2, '0')}`,
        file_path: `/storage/emulated/0/Music/Track_${String(i + 1).padStart(2, '0')}.mp3`,
        file_name: `Track ${String(20 - i).padStart(2, '0')}.mp3`, // Reverse name order
        extension: 'mp3',
        mime_type: 'audio/mpeg',
        category: 'AUDIO',
        folder_path: '/storage/emulated/0/Music',
        folder_name: 'Music',
        size_bytes: (i + 1) * 10 * 1024 * 1024, // 10MB to 200MB
        duration_ms: (20 - i) * 60000, // 20m down to 1m
        width: null,
        height: null,
        artist: `Artist ${i + 1}`,
        album: `Album ${i + 1}`,
        date_modified: 1700000000000 + i * 86400000,
        date_added: 1700000000000 + i * 86400000,
        is_hidden: 0,
        is_messenger_media: 0,
        is_favorite: i % 2 === 0 ? 1 : 0,
        is_vaulted: 0,
      }));

      (fileRepository.getFilesByFolder as jest.Mock).mockResolvedValue(mock20Files);

      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('flash-list-files')).toBeTruthy();
      });

      // 1. NAME ASC: Track 01 -> Track 20
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'NAME', 'ASC');
      });
      let flashList = screen.getByTestId('flash-list-files');
      let data = flashList.props.data as MediaFileRow[];
      expect(data[0].file_name).toBe('Track 01.mp3');
      expect(data[19].file_name).toBe('Track 20.mp3');

      // 2. NAME DESC: Track 20 -> Track 01
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'NAME', 'DESC');
      });
      flashList = screen.getByTestId('flash-list-files');
      data = flashList.props.data as MediaFileRow[];
      expect(data[0].file_name).toBe('Track 20.mp3');
      expect(data[19].file_name).toBe('Track 01.mp3');

      // 3. SIZE ASC: file-01 (10MB) -> file-20 (200MB)
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'SIZE', 'ASC');
      });
      flashList = screen.getByTestId('flash-list-files');
      data = flashList.props.data as MediaFileRow[];
      expect(data[0].id).toBe('file-01');
      expect(data[19].id).toBe('file-20');

      // 4. SIZE DESC: file-20 (200MB) -> file-01 (10MB)
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'SIZE', 'DESC');
      });
      flashList = screen.getByTestId('flash-list-files');
      data = flashList.props.data as MediaFileRow[];
      expect(data[0].id).toBe('file-20');
      expect(data[19].id).toBe('file-01');

      // 5. DATE ASC: oldest file-01 -> newest file-20
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'DATE', 'ASC');
      });
      flashList = screen.getByTestId('flash-list-files');
      data = flashList.props.data as MediaFileRow[];
      expect(data[0].id).toBe('file-01');
      expect(data[19].id).toBe('file-20');

      // 6. DATE DESC: newest file-20 -> oldest file-01
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'DATE', 'DESC');
      });
      flashList = screen.getByTestId('flash-list-files');
      data = flashList.props.data as MediaFileRow[];
      expect(data[0].id).toBe('file-20');
      expect(data[19].id).toBe('file-01');

      // 7. DURATION ASC: file-20 (1 min) -> file-01 (20 min)
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'DURATION', 'ASC');
      });
      flashList = screen.getByTestId('flash-list-files');
      data = flashList.props.data as MediaFileRow[];
      expect(data[0].id).toBe('file-20');
      expect(data[19].id).toBe('file-01');

      // 8. DURATION DESC: file-01 (20 min) -> file-20 (1 min)
      act(() => {
        useBrowserFilterStore.getState().setSort('AUDIO', 'DURATION', 'DESC');
      });
      flashList = screen.getByTestId('flash-list-files');
      data = flashList.props.data as MediaFileRow[];
      expect(data[0].id).toBe('file-01');
      expect(data[19].id).toBe('file-20');
    });
  });

  describe('Resume progress display on file card', () => {
    it('shows 50% progress bar for file with 30s / 60s progress', async () => {
      const resumeRecord: ResumeRecord = {
        filePath: mockAudioFiles[0].file_path,
        fileName: mockAudioFiles[0].file_name,
        category: 'audio',
        lastOpenedAt: Date.now(),
        positionMs: 30000,
        durationMs: 60000,
        isCompleted: false,
      };

      useResumeHistoryStore.setState({ items: [resumeRecord] });

      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('file-progress-bar')).toBeTruthy();
      });

      expect(screen.getByTestId('file-progress-label')).toBeTruthy();
      expect(screen.getByText('50%')).toBeTruthy();
    });
  });

  describe('Loading, Empty, No Results, and Error states', () => {
    it('shows empty folder view when raw files array is empty', async () => {
      (fileRepository.getFilesByFolder as jest.Mock).mockResolvedValue([]);

      render(
        <FileListScreen
          category="AUDIO"
          folderName="EmptyFolder"
          folderPath="/storage/emulated/0/EmptyFolder"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('file-list-empty')).toBeTruthy();
      });

      expect(screen.getByText('Folder is empty')).toBeTruthy();
    });

    it('shows no-results view when filters eliminate all items and resets on button press', async () => {
      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      });

      // No resume records exist, so IN_PROGRESS should result in 0 items
      fireEvent.press(screen.getByTestId('filter-chip-in_progress'));

      expect(screen.getByTestId('file-list-no-results')).toBeTruthy();
      expect(screen.getByText('No matching files')).toBeTruthy();

      // Press Reset Filters button
      fireEvent.press(screen.getByTestId('reset-filters-button'));

      // Filter is reset to ALL, showing all files again
      await waitFor(() => {
        expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      });
      expect(screen.queryByTestId('file-list-no-results')).toBeNull();
    });

    it('shows error state when repository throws and retries on button press', async () => {
      (fileRepository.getFilesByFolder as jest.Mock).mockRejectedValueOnce(
        new Error('Disk I/O error'),
      );

      render(
        <FileListScreen
          category="AUDIO"
          folderName="Music"
          folderPath="/storage/emulated/0/Music"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('file-list-error')).toBeTruthy();
      });

      expect(screen.getByText('Disk I/O error')).toBeTruthy();

      // Prepare mock for retry
      (fileRepository.getFilesByFolder as jest.Mock).mockResolvedValueOnce(mockAudioFiles);

      fireEvent.press(screen.getByTestId('file-list-retry-button'));

      await waitFor(() => {
        expect(screen.getByText('Alpha Song.mp3')).toBeTruthy();
      });
      expect(screen.queryByTestId('file-list-error')).toBeNull();
    });
  });
});
