import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AudioBookmarksModal } from '@features/audioPlayer/components/AudioBookmarksModal';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { BookmarkRepository } from '@core/storage/repositories/BookmarkRepository';
import { audioPlaybackService } from '@features/audioPlayer/services/AudioPlaybackService';
import type { AudioTrack } from '@features/audioPlayer/types';
import type { MediaFileRow } from '@core/storage/types';

jest.mock('@core/storage/repositories/BookmarkRepository', () => ({
  BookmarkRepository: {
    getBookmarks: jest.fn().mockResolvedValue([
      {
        id: 1,
        file_path: '/storage/emulated/0/Music/Song.mp3',
        timestamp_ms: 30000,
        title: 'Guitar Solo',
        created_at: 1000,
      },
    ]),
    addBookmark: jest.fn().mockImplementation((path, timestamp, title) =>
      Promise.resolve({
        id: 2,
        file_path: path,
        timestamp_ms: timestamp,
        title,
        created_at: 2000,
      }),
    ),
    removeBookmark: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@features/audioPlayer/services/AudioPlaybackService', () => ({
  audioPlaybackService: {
    seekTo: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockTrack: AudioTrack = {
  id: 'track_1',
  url: 'file:///storage/emulated/0/Music/Song.mp3',
  title: 'Song.mp3',
  artist: 'Artist',
  album: 'Album',
  duration: 180,
  originalFile: {
    id: 'track_1',
    file_path: '/storage/emulated/0/Music/Song.mp3',
    file_name: 'Song.mp3',
    extension: 'mp3',
    mime_type: 'audio/mpeg',
    category: 'AUDIO',
    folder_path: '/storage/emulated/0/Music',
    folder_name: 'Music',
    size_bytes: 1000,
    duration_ms: 180000,
    width: null,
    height: null,
    artist: 'Artist',
    album: 'Album',
    date_modified: 1000,
    date_added: 1000,
    is_hidden: 0,
    is_messenger_media: 0,
    is_favorite: 0,
    is_vaulted: 0,
  } as MediaFileRow,
};

describe('AudioBookmarksModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAudioControlsStore.getState().setBookmarksVisible(false);
    useAudioPlayerStore.getState().resetPlayback();
  });

  it('renders bookmarks list for active track when visible', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);
    useAudioPlayerStore.getState().setProgress(45000, 180000);
    useAudioControlsStore.getState().setBookmarksVisible(true);

    const { getByTestId, getByText } = render(<AudioBookmarksModal />);
    expect(getByTestId('audio-bookmarks-modal')).toBeTruthy();
    expect(getByText('Track Bookmarks')).toBeTruthy();

    await waitFor(() => {
      expect(BookmarkRepository.getBookmarks).toHaveBeenCalledWith(
        '/storage/emulated/0/Music/Song.mp3',
      );
      expect(getByText('Guitar Solo')).toBeTruthy();
    });
  });

  it('seeks to bookmark timestamp when a bookmark item is tapped', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);
    useAudioControlsStore.getState().setBookmarksVisible(true);

    const { getByTestId } = render(<AudioBookmarksModal />);
    await waitFor(() => {
      expect(getByTestId('seek-bookmark-1')).toBeTruthy();
    });

    const itemPress = getByTestId('seek-bookmark-1');
    fireEvent.press(itemPress);

    await waitFor(() => {
      expect(audioPlaybackService.seekTo).toHaveBeenCalledWith(30000);
      expect(useAudioControlsStore.getState().isBookmarksVisible).toBe(false);
    });
  });

  it('adds a new bookmark at the current playback position', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);
    useAudioPlayerStore.getState().setProgress(75000, 180000);
    useAudioControlsStore.getState().setBookmarksVisible(true);

    const { getByTestId } = render(<AudioBookmarksModal />);
    const pinBtn = getByTestId('pin-current-time-btn');
    fireEvent.press(pinBtn);

    expect(getByTestId('add-bookmark-form')).toBeTruthy();
    const titleInput = getByTestId('bookmark-title-input');
    fireEvent.changeText(titleInput, 'Drum Break');

    const saveBtn = getByTestId('save-bookmark-btn');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(BookmarkRepository.addBookmark).toHaveBeenCalledWith(
        '/storage/emulated/0/Music/Song.mp3',
        75000,
        'Drum Break',
      );
    });
  });
});
