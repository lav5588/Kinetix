import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PersistentMiniPlayer } from '@features/audioPlayer/components/PersistentMiniPlayer';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { audioPlaybackService } from '@features/audioPlayer/services/AudioPlaybackService';
import type { AudioTrack } from '@features/audioPlayer/types';
import type { MediaFileRow } from '@core/storage/types';

jest.mock('@features/audioPlayer/services/AudioPlaybackService', () => ({
  audioPlaybackService: {
    togglePlayPause: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockTrack: AudioTrack = {
  id: 'track_1',
  url: 'file:///storage/emulated/0/Music/Song.mp3',
  title: 'Cyber Anthem',
  artist: 'Synthwave Artist',
  album: 'Retro Future',
  duration: 240,
  artwork: 'https://example.com/artwork.jpg',
  originalFile: {
    id: 'track_1',
    file_path: '/storage/emulated/0/Music/Song.mp3',
    file_name: 'Song.mp3',
    extension: 'mp3',
    mime_type: 'audio/mpeg',
    category: 'AUDIO',
    folder_path: '/storage/emulated/0/Music',
    folder_name: 'Music',
    size_bytes: 5000000,
    duration_ms: 240000,
    width: null,
    height: null,
    artist: 'Synthwave Artist',
    album: 'Retro Future',
    date_modified: 1600000000,
    date_added: 1600000000,
    is_hidden: 0,
    is_messenger_media: 0,
    is_favorite: 0,
    is_vaulted: 0,
  } as MediaFileRow,
};

describe('PersistentMiniPlayer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAudioPlayerStore.getState().resetPlayback();
    useAudioControlsStore.getState().setFullPlayerVisible(false);
  });

  it('renders null when activeTrack is null', () => {
    const { queryByTestId } = render(<PersistentMiniPlayer />);
    expect(queryByTestId('persistent-mini-player')).toBeNull();
  });

  it('renders mini-player with track details when activeTrack is present', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);
    useAudioPlayerStore.getState().setPlaybackState('paused');

    const { getByTestId, getByText } = render(<PersistentMiniPlayer />);
    expect(getByTestId('persistent-mini-player')).toBeTruthy();
    expect(getByText('Cyber Anthem')).toBeTruthy();
    expect(getByText('Synthwave Artist')).toBeTruthy();
    expect(getByTestId('mini-player-artwork-image')).toBeTruthy();
  });

  it('renders fallback icon when track has no artwork', () => {
    const noArtTrack: AudioTrack = {
      ...mockTrack,
      artwork: undefined,
    };
    useAudioPlayerStore.getState().setActiveTrack(noArtTrack, 0);

    const { getByTestId } = render(<PersistentMiniPlayer />);
    expect(getByTestId('mini-player-artwork-fallback')).toBeTruthy();
  });

  it('calculates and displays live progress percentage', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);
    useAudioPlayerStore.getState().setProgress(120000, 240000, 180000); // 50%

    const { getByTestId } = render(<PersistentMiniPlayer />);
    const progressBar = getByTestId('mini-player-progress-bar');
    expect(progressBar.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '50%' })]),
    );
  });

  it('calls audioPlaybackService.togglePlayPause when play/pause button is pressed', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);
    useAudioPlayerStore.getState().setPlaybackState('paused');

    const { getByTestId } = render(<PersistentMiniPlayer />);
    const playPauseBtn = getByTestId('mini-player-play-pause-btn');

    fireEvent.press(playPauseBtn);
    await waitFor(() => {
      expect(audioPlaybackService.togglePlayPause).toHaveBeenCalledTimes(1);
    });
  });

  it('calls audioPlaybackService.skipToNext when next button is pressed', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);

    const { getByTestId } = render(<PersistentMiniPlayer />);
    const nextBtn = getByTestId('mini-player-next-btn');

    fireEvent.press(nextBtn);
    await waitFor(() => {
      expect(audioPlaybackService.skipToNext).toHaveBeenCalledTimes(1);
    });
  });

  it('opens FullAudioPlayerSheet when mini-player body is pressed', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);

    const { getByTestId } = render(<PersistentMiniPlayer />);
    const content = getByTestId('mini-player-content-pressable');

    fireEvent.press(content);
    expect(useAudioControlsStore.getState().isFullPlayerVisible).toBe(true);
  });

  it('has responder handlers configured for upward swipe gesture', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack, 0);
    useAudioControlsStore.getState().setFullPlayerVisible(false);

    const { getByTestId } = render(<PersistentMiniPlayer />);
    const miniPlayer = getByTestId('persistent-mini-player');

    expect(miniPlayer.props.onMoveShouldSetResponder).toBeDefined();
    expect(miniPlayer.props.onResponderRelease).toBeDefined();
  });
});
