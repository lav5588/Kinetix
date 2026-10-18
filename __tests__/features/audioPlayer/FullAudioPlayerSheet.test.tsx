import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FullAudioPlayerSheet } from '@features/audioPlayer/components/FullAudioPlayerSheet';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { audioPlaybackService } from '@features/audioPlayer/services/AudioPlaybackService';
import type { AudioTrack } from '@features/audioPlayer/types';
import type { MediaFileRow } from '@core/storage/types';

jest.mock('@features/audioPlayer/services/AudioPlaybackService', () => ({
  audioPlaybackService: {
    togglePlayPause: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    skipToPrevious: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    toggleShuffle: jest.fn().mockResolvedValue(undefined),
    setRepeatMode: jest.fn().mockResolvedValue(undefined),
    setPlaybackRate: jest.fn().mockResolvedValue(undefined),
    skipToIndex: jest.fn().mockResolvedValue(undefined),
    reorderQueue: jest.fn().mockResolvedValue(undefined),
    removeFromQueue: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockTrack1: AudioTrack = {
  id: 'track_1',
  url: 'file:///storage/emulated/0/Music/Track1.mp3',
  title: 'Epic Track One',
  artist: 'Epic Artist',
  album: 'Soundtrack',
  duration: 200,
  originalFile: {
    id: 'track_1',
    file_path: '/storage/emulated/0/Music/Track1.mp3',
    file_name: 'Track1.mp3',
    extension: 'mp3',
    mime_type: 'audio/mpeg',
    category: 'AUDIO',
    folder_path: '/storage/emulated/0/Music',
    folder_name: 'Soundtrack',
    size_bytes: 4000000,
    duration_ms: 200000,
    width: null,
    height: null,
    artist: 'Epic Artist',
    album: 'Soundtrack',
    date_modified: 1000,
    date_added: 1000,
    is_hidden: 0,
    is_messenger_media: 0,
    is_favorite: 0,
    is_vaulted: 0,
  } as MediaFileRow,
};

const mockTrack2: AudioTrack = {
  ...mockTrack1,
  id: 'track_2',
  title: 'Epic Track Two',
};

describe('FullAudioPlayerSheet Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAudioPlayerStore.getState().resetPlayback();
    useAudioControlsStore.getState().setFullPlayerVisible(true);
    useAudioControlsStore.getState().clearAbLoop();
    useAudioControlsStore.getState().clearSleepTimer();
  });

  it('renders full player modal with track details when activeTrack exists and isVisible is true', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);
    useAudioPlayerStore.getState().setProgress(60000, 200000);

    const { getByTestId, getByText } = render(<FullAudioPlayerSheet />);
    expect(getByTestId('full-audio-player-modal')).toBeTruthy();
    expect(getByText('Epic Track One')).toBeTruthy();
    expect(getByText('Epic Artist')).toBeTruthy();
    expect(getByTestId('full-player-position-text')).toBeTruthy();
    expect(getByTestId('full-player-duration-text')).toBeTruthy();
  });

  it('closes full player when collapse button is pressed', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    const collapseBtn = getByTestId('full-player-collapse-btn');

    fireEvent.press(collapseBtn);
    expect(useAudioControlsStore.getState().isFullPlayerVisible).toBe(false);
  });

  it('toggles play/pause when main control button is pressed', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    const playPauseBtn = getByTestId('full-player-play-pause-btn');

    fireEvent.press(playPauseBtn);
    await waitFor(() => {
      expect(audioPlaybackService.togglePlayPause).toHaveBeenCalledTimes(1);
    });
  });

  it('skips 10 seconds backward and forward when buttons are pressed', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);
    useAudioPlayerStore.getState().setProgress(30000, 200000);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    const skipBackBtn = getByTestId('full-player-skip-back-10-btn');
    const skipFwdBtn = getByTestId('full-player-skip-fwd-10-btn');

    fireEvent.press(skipBackBtn);
    expect(audioPlaybackService.seekTo).toHaveBeenCalledWith(20000);

    fireEvent.press(skipFwdBtn);
    expect(audioPlaybackService.seekTo).toHaveBeenCalledWith(40000);
  });

  it('does not render removed features (repeat, bookmarks, ab loop)', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);

    const { queryByTestId } = render(<FullAudioPlayerSheet />);
    expect(queryByTestId('full-player-repeat-btn')).toBeNull();
    expect(queryByTestId('full-player-bookmark-btn')).toBeNull();
    expect(queryByTestId('ab-loop-container')).toBeNull();
  });

  it('toggles shuffle when shuffle button is pressed', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    const shuffleBtn = getByTestId('full-player-shuffle-btn');

    fireEvent.press(shuffleBtn);
    await waitFor(() => {
      expect(audioPlaybackService.toggleShuffle).toHaveBeenCalledTimes(1);
    });
  });

  it('opens Speed Selector modal and changes playback rate', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    const speedBtn = getByTestId('full-player-speed-btn');

    fireEvent.press(speedBtn);
    expect(useAudioControlsStore.getState().isSpeedSelectorVisible).toBe(true);

    const speedChip = getByTestId('speed-option-1.5x');
    fireEvent.press(speedChip);

    await waitFor(() => {
      expect(audioPlaybackService.setPlaybackRate).toHaveBeenCalledWith(1.5);
      expect(useAudioControlsStore.getState().isSpeedSelectorVisible).toBe(false);
    });
  });

  it('opens Sleep Timer modal and selects 30 minutes preset', async () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    const sleepBtn = getByTestId('full-player-sleep-btn');

    fireEvent.press(sleepBtn);
    expect(useAudioControlsStore.getState().isSleepTimerModalVisible).toBe(true);

    const option30m = getByTestId('sleep-timer-option-30M');
    fireEvent.press(option30m);

    await waitFor(() => {
      expect(useAudioControlsStore.getState().sleepTimerMode).toBe('30M');
      expect(useAudioControlsStore.getState().isSleepTimerActive).toBe(true);
      expect(useAudioControlsStore.getState().isSleepTimerModalVisible).toBe(false);
    });
  });

  it('opens Queue Sheet and displays up-next items', () => {
    useAudioPlayerStore.getState().setQueue([mockTrack1, mockTrack2], 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    const queueBtn = getByTestId('full-player-queue-btn');

    fireEvent.press(queueBtn);
    expect(useAudioControlsStore.getState().isQueueVisible).toBe(true);

    expect(getByTestId('queue-item-0')).toBeTruthy();
    expect(getByTestId('queue-item-1')).toBeTruthy();
  });

  it('renders swipe container and scrubber touch bar', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    expect(getByTestId('full-player-swipe-container')).toBeTruthy();
    expect(getByTestId('scrubber-touch-bar')).toBeTruthy();
    expect(getByTestId('scrubber-progress-fill')).toBeTruthy();
    expect(getByTestId('scrubber-thumb')).toBeTruthy();
  });

  it('renders continuous carousel with adjacent track previews when available in queue', () => {
    useAudioPlayerStore.getState().setQueue([mockTrack1, mockTrack2], 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    // Active track is rendered in center
    expect(getByTestId('full-player-track-title')).toBeTruthy();
    // Next track is rendered simultaneously in the adjacent slot (preventing empty screen during swipe)
    expect(getByTestId('next-track-title')).toBeTruthy();
  });

  it('configures pan responder handlers on swipe container for horizontal and downward gestures', () => {
    useAudioPlayerStore.getState().setActiveTrack(mockTrack1, 0);

    const { getByTestId } = render(<FullAudioPlayerSheet />);
    const swipeContainer = getByTestId('full-player-swipe-container');

    expect(swipeContainer.props.onMoveShouldSetResponder).toBeDefined();
    expect(swipeContainer.props.onResponderMove).toBeDefined();
    expect(swipeContainer.props.onResponderRelease).toBeDefined();
  });
});
