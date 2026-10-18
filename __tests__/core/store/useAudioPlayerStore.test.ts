import { useAudioPlayerStore, INITIAL_AUDIO_PLAYER_STATE } from '@core/store/useAudioPlayerStore';
import type { AudioTrack } from '@features/audioPlayer/types';
import type { MediaFileRow } from '@core/storage/types';

const createMockAudioTrack = (id: string, title: string, durationSec = 180): AudioTrack => ({
  id,
  url: `file:///storage/emulated/0/Music/${title}`,
  title,
  artist: 'Artist',
  album: 'Album',
  duration: durationSec,
  originalFile: {
    id,
    file_path: `/storage/emulated/0/Music/${title}`,
    file_name: title,
    extension: 'mp3',
    mime_type: 'audio/mpeg',
    category: 'AUDIO',
    folder_path: '/storage/emulated/0/Music',
    folder_name: 'Music',
    size_bytes: 1024,
    duration_ms: durationSec * 1000,
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
});

describe('useAudioPlayerStore', () => {
  beforeEach(() => {
    useAudioPlayerStore.getState().resetPlayback();
  });

  it('initializes with default transient state', () => {
    const state = useAudioPlayerStore.getState();
    expect(state.activeTrack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.currentIndex).toBe(-1);
    expect(state.playbackState).toBe('idle');
    expect(state.positionMs).toBe(0);
    expect(state.durationMs).toBe(0);
    expect(state.bufferedMs).toBe(0);
    expect(state.repeatMode).toBe('OFF');
    expect(state.isShuffled).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('updates queue and sets active track at start index', () => {
    const t1 = createMockAudioTrack('t1', 'One.mp3', 120);
    const t2 = createMockAudioTrack('t2', 'Two.mp3', 200);

    useAudioPlayerStore.getState().setQueue([t1, t2], 1);

    const state = useAudioPlayerStore.getState();
    expect(state.queue).toHaveLength(2);
    expect(state.currentIndex).toBe(1);
    expect(state.activeTrack?.id).toBe('t2');
    expect(state.durationMs).toBe(200000);
    expect(state.unshuffledQueue).toHaveLength(2);
  });

  it('updates playback state and manages loading flag', () => {
    const store = useAudioPlayerStore.getState();

    store.setPlaybackState('loading');
    expect(useAudioPlayerStore.getState().playbackState).toBe('loading');
    expect(useAudioPlayerStore.getState().isLoading).toBe(true);

    store.setPlaybackState('playing');
    expect(useAudioPlayerStore.getState().playbackState).toBe('playing');
    expect(useAudioPlayerStore.getState().isLoading).toBe(false);

    store.setPlaybackState('paused');
    expect(useAudioPlayerStore.getState().playbackState).toBe('paused');
  });

  it('updates position, duration, and buffered progress', () => {
    const store = useAudioPlayerStore.getState();
    store.setProgress(45000, 180000, 90000);

    const state = useAudioPlayerStore.getState();
    expect(state.positionMs).toBe(45000);
    expect(state.durationMs).toBe(180000);
    expect(state.bufferedMs).toBe(90000);
  });

  it('toggles repeat modes and shuffle state', () => {
    const store = useAudioPlayerStore.getState();
    store.setRepeatMode('TRACK');
    expect(useAudioPlayerStore.getState().repeatMode).toBe('TRACK');

    store.setRepeatMode('QUEUE');
    expect(useAudioPlayerStore.getState().repeatMode).toBe('QUEUE');

    const t1 = createMockAudioTrack('t1', 'One.mp3');
    const t2 = createMockAudioTrack('t2', 'Two.mp3');
    store.setQueue([t1, t2], 0);

    // Shuffle with a reordered queue
    store.setShuffled(true, [t2, t1]);
    const shuffledState = useAudioPlayerStore.getState();
    expect(shuffledState.isShuffled).toBe(true);
    expect(shuffledState.queue[0].id).toBe('t2');
    expect(shuffledState.currentIndex).toBe(1); // t1 is now at index 1
  });

  it('sets and clears errors predictably', () => {
    const store = useAudioPlayerStore.getState();
    store.setError('Failed to decode track');

    let state = useAudioPlayerStore.getState();
    expect(state.error).toBe('Failed to decode track');
    expect(state.playbackState).toBe('error');

    store.clearError();
    state = useAudioPlayerStore.getState();
    expect(state.error).toBeNull();
  });

  it('resets playback without leaking previous track state', () => {
    const store = useAudioPlayerStore.getState();
    const t1 = createMockAudioTrack('t1', 'One.mp3');
    store.setQueue([t1], 0);
    store.setProgress(30000, 120000);
    store.setPlaybackState('playing');

    store.resetPlayback();

    const state = useAudioPlayerStore.getState();
    expect(state.activeTrack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.currentIndex).toBe(-1);
    expect(state.playbackState).toBe('idle');
    expect(state.positionMs).toBe(0);
    expect(state.durationMs).toBe(0);
  });
});
