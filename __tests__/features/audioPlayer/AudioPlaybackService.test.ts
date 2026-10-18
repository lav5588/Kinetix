import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
  State,
} from 'react-native-track-player';
import type { MediaFileRow } from '@core/storage/types';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import {
  AudioPlaybackService,
  audioPlaybackService,
  mapNativePlaybackState,
  mapRepeatModeToNative,
} from '../../../src/features/audioPlayer/services/AudioPlaybackService';

describe('AudioPlaybackService', () => {
  const mockFiles: MediaFileRow[] = [
    {
      id: 'track-1',
      file_path: '/storage/emulated/0/Music/song1.mp3',
      file_name: 'song1.mp3',
      extension: 'mp3',
      mime_type: 'audio/mpeg',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music',
      folder_name: 'Music',
      size_bytes: 5000000,
      duration_ms: 240000,
      artist: 'Artist A',
      album: 'Album One',
      width: null,
      height: null,
      date_added: 1700000000000,
      date_modified: 1700000000000,
      is_hidden: 0,
      is_messenger_media: 0,
      is_favorite: 0,
      is_vaulted: 0,
    },
    {
      id: 'track-2',
      file_path: '/storage/emulated/0/Music/song2.flac',
      file_name: 'song2.flac',
      extension: 'flac',
      mime_type: 'audio/flac',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music',
      folder_name: 'Music',
      size_bytes: 15000000,
      duration_ms: 180000,
      artist: 'Artist B',
      album: 'Album Two',
      width: null,
      height: null,
      date_added: 1700000001000,
      date_modified: 1700000001000,
      is_hidden: 0,
      is_messenger_media: 0,
      is_favorite: 0,
      is_vaulted: 0,
    },
    {
      id: 'track-3',
      file_path: '/storage/emulated/0/Music/song3.wav',
      file_name: 'song3.wav',
      extension: 'wav',
      mime_type: 'audio/wav',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music',
      folder_name: 'Music',
      size_bytes: 25000000,
      duration_ms: 120000,
      artist: 'Artist C',
      album: 'Album Three',
      width: null,
      height: null,
      date_added: 1700000002000,
      date_modified: 1700000002000,
      is_hidden: 0,
      is_messenger_media: 0,
      is_favorite: 0,
      is_vaulted: 0,
    },
  ];

  let service: AudioPlaybackService;
  const eventListeners: Record<string, (payload: any) => void> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    useAudioPlayerStore.getState().resetPlayback();

    // Capture event listeners
    (TrackPlayer.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      eventListeners[event] = handler;
      return {
        remove: jest.fn(() => {
          delete eventListeners[event];
        }),
      };
    });

    service = new AudioPlaybackService();
  });

  describe('mapNativePlaybackState', () => {
    it('maps all native playback states correctly', () => {
      expect(mapNativePlaybackState(State.Playing)).toBe('playing');
      expect(mapNativePlaybackState('playing')).toBe('playing');
      expect(mapNativePlaybackState(State.Paused)).toBe('paused');
      expect(mapNativePlaybackState('paused')).toBe('paused');
      expect(mapNativePlaybackState(State.Stopped)).toBe('stopped');
      expect(mapNativePlaybackState('stopped')).toBe('stopped');
      expect(mapNativePlaybackState(State.Buffering)).toBe('buffering');
      expect(mapNativePlaybackState('buffering')).toBe('buffering');
      expect(mapNativePlaybackState(State.Loading)).toBe('loading');
      expect(mapNativePlaybackState('loading')).toBe('loading');
      expect(mapNativePlaybackState(State.Ready)).toBe('ready');
      expect(mapNativePlaybackState('ready')).toBe('ready');
      expect(mapNativePlaybackState(State.Ended)).toBe('ended');
      expect(mapNativePlaybackState('ended')).toBe('ended');
      expect(mapNativePlaybackState(State.Error)).toBe('error');
      expect(mapNativePlaybackState('error')).toBe('error');
      expect(mapNativePlaybackState(State.None)).toBe('idle');
      expect(mapNativePlaybackState('unknown-state')).toBe('idle');
    });
  });

  describe('mapRepeatModeToNative', () => {
    it('maps repeat modes accurately', () => {
      expect(mapRepeatModeToNative('OFF')).toBe(RepeatMode.Off);
      expect(mapRepeatModeToNative('TRACK')).toBe(RepeatMode.Track);
      expect(mapRepeatModeToNative('QUEUE')).toBe(RepeatMode.Queue);
    });
  });

  describe('initialization', () => {
    it('sets up TrackPlayer and updates options once', async () => {
      await service.initialize();

      expect(TrackPlayer.setupPlayer).toHaveBeenCalledWith({
        autoHandleInterruptions: true,
      });
      expect(TrackPlayer.updateOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
            Capability.Stop,
          ],
        }),
      );

      // Calling initialize a second time should no-op
      await service.initialize();
      expect(TrackPlayer.setupPlayer).toHaveBeenCalledTimes(1);
    });

    it('sets error in store if setupPlayer fails', async () => {
      (TrackPlayer.setupPlayer as jest.Mock).mockRejectedValueOnce(new Error('Player setup failed'));

      await service.initialize();

      expect(useAudioPlayerStore.getState().error).toBe('Player setup failed');
    });
  });

  describe('loadQueue', () => {
    it('loads tracks and starts playing at startIndex', async () => {
      await service.loadQueue(mockFiles, 1, true);

      const store = useAudioPlayerStore.getState();
      expect(store.queue).toHaveLength(3);
      expect(store.currentIndex).toBe(1);
      expect(store.activeTrack?.id).toBe('track-2');

      expect(TrackPlayer.reset).toHaveBeenCalled();
      expect(TrackPlayer.add).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'track-1' }),
        expect.objectContaining({ id: 'track-2' }),
        expect.objectContaining({ id: 'track-3' }),
      ]));
      expect(TrackPlayer.skip).toHaveBeenCalledWith(1);
      expect(TrackPlayer.play).toHaveBeenCalled();
    });

    it('loads tracks without autoplaying when autoPlay is false', async () => {
      await service.loadQueue(mockFiles, 0, false);

      expect(TrackPlayer.play).not.toHaveBeenCalled();
      expect(useAudioPlayerStore.getState().currentIndex).toBe(0);
    });

    it('resets when queue is empty', async () => {
      await service.loadQueue([], 0);

      expect(useAudioPlayerStore.getState().queue).toEqual([]);
      expect(useAudioPlayerStore.getState().activeTrack).toBeNull();
    });

    it('records error in store if TrackPlayer.add rejects', async () => {
      (TrackPlayer.add as jest.Mock).mockRejectedValueOnce(new Error('Queue add failed'));

      await service.loadQueue(mockFiles, 0);

      expect(useAudioPlayerStore.getState().error).toBe('Queue add failed');
    });
  });

  describe('playback controls', () => {
    beforeEach(async () => {
      await service.loadQueue(mockFiles, 0, false);
    });

    it('play, pause, stop, reset work as expected', async () => {
      await service.play();
      expect(TrackPlayer.play).toHaveBeenCalled();
      expect(useAudioPlayerStore.getState().playbackState).toBe('playing');

      await service.pause();
      expect(TrackPlayer.pause).toHaveBeenCalled();
      expect(useAudioPlayerStore.getState().playbackState).toBe('paused');

      await service.stop();
      expect(TrackPlayer.stop).toHaveBeenCalled();
      expect(useAudioPlayerStore.getState().playbackState).toBe('stopped');

      await service.reset();
      expect(TrackPlayer.reset).toHaveBeenCalled();
      expect(useAudioPlayerStore.getState().activeTrack).toBeNull();
    });

    it('togglePlayPause switches between play and pause', async () => {
      useAudioPlayerStore.getState().setPlaybackState('playing');
      await service.togglePlayPause();
      expect(TrackPlayer.pause).toHaveBeenCalled();

      useAudioPlayerStore.getState().setPlaybackState('paused');
      await service.togglePlayPause();
      expect(TrackPlayer.play).toHaveBeenCalled();
    });

    it('seekTo clamps negative positions to 0 and invokes TrackPlayer.seekTo in seconds', async () => {
      await service.seekTo(-500);
      expect(TrackPlayer.seekTo).toHaveBeenCalledWith(0);
      expect(useAudioPlayerStore.getState().positionMs).toBe(0);

      await service.seekTo(45000);
      expect(TrackPlayer.seekTo).toHaveBeenCalledWith(45);
      expect(useAudioPlayerStore.getState().positionMs).toBe(45000);
    });

    it('setRepeatMode updates native repeat and store', async () => {
      await service.setRepeatMode('TRACK');
      expect(TrackPlayer.setRepeatMode).toHaveBeenCalledWith(RepeatMode.Track);
      expect(useAudioPlayerStore.getState().repeatMode).toBe('TRACK');

      await service.setRepeatMode('QUEUE');
      expect(TrackPlayer.setRepeatMode).toHaveBeenCalledWith(RepeatMode.Queue);
      expect(useAudioPlayerStore.getState().repeatMode).toBe('QUEUE');
    });

    it('setPlaybackRate and setVolume update native and store', async () => {
      await service.setPlaybackRate(1.5);
      expect(TrackPlayer.setRate).toHaveBeenCalledWith(1.5);
      expect(useAudioPlayerStore.getState().playbackRate).toBe(1.5);

      await service.setVolume(0.8);
      expect(TrackPlayer.setVolume).toHaveBeenCalledWith(0.8);
      expect(useAudioPlayerStore.getState().volume).toBe(0.8);
    });

    it('toggleShuffle reorders queue and keeps active track at current index', async () => {
      expect(useAudioPlayerStore.getState().isShuffled).toBe(false);

      await service.toggleShuffle();
      expect(useAudioPlayerStore.getState().isShuffled).toBe(true);
      expect(useAudioPlayerStore.getState().queue[0].id).toBe('track-1');

      await service.toggleShuffle();
      expect(useAudioPlayerStore.getState().isShuffled).toBe(false);
      expect(useAudioPlayerStore.getState().queue[0].id).toBe('track-1');
      expect(useAudioPlayerStore.getState().queue[1].id).toBe('track-2');
      expect(useAudioPlayerStore.getState().queue[2].id).toBe('track-3');
    });
  });

  describe('skipping behavior', () => {
    beforeEach(async () => {
      await service.loadQueue(mockFiles, 0, false);
      (TrackPlayer.skip as jest.Mock).mockClear();
    });

    it('skipToIndex skips within bounds and ignores out of bounds', async () => {
      await service.skipToIndex(2);
      expect(TrackPlayer.skip).toHaveBeenCalledWith(2);
      expect(useAudioPlayerStore.getState().activeTrack?.id).toBe('track-3');

      // Out of bounds
      await service.skipToIndex(10);
      expect(TrackPlayer.skip).toHaveBeenCalledTimes(1);
    });

    it('skipToNext advances to the next track', async () => {
      await service.skipToNext();
      expect(TrackPlayer.skip).toHaveBeenCalledWith(1);
      expect(useAudioPlayerStore.getState().activeTrack?.id).toBe('track-2');
    });

    it('skipToNext at queue end stops if repeatMode is OFF', async () => {
      await service.skipToIndex(2);
      await service.skipToNext();
      expect(TrackPlayer.stop).toHaveBeenCalled();
    });

    it('skipToPrevious restarts track when position > 3000ms', async () => {
      useAudioPlayerStore.getState().setProgress(5000, 240000);

      await service.skipToPrevious();
      expect(TrackPlayer.seekTo).toHaveBeenCalledWith(0);
      expect(TrackPlayer.skip).not.toHaveBeenCalled();
    });

    it('skipToPrevious goes to previous track when position <= 3000ms', async () => {
      await service.skipToIndex(1);
      useAudioPlayerStore.getState().setProgress(1500, 180000);

      await service.skipToPrevious();
      expect(TrackPlayer.skip).toHaveBeenCalledWith(0);
      expect(useAudioPlayerStore.getState().activeTrack?.id).toBe('track-1');
    });

    it('skipToPrevious(true) forces previous track even when position > 3000ms', async () => {
      await service.skipToIndex(1);
      useAudioPlayerStore.getState().setProgress(15000, 180000);

      await service.skipToPrevious(true);
      expect(TrackPlayer.skip).toHaveBeenCalledWith(0);
      expect(useAudioPlayerStore.getState().activeTrack?.id).toBe('track-1');
    });

    it('skipToPrevious at track 0 with position <= 3000ms seeks to 0 if repeatMode is OFF', async () => {
      useAudioPlayerStore.getState().setProgress(1000, 240000);

      await service.skipToPrevious();
      expect(TrackPlayer.seekTo).toHaveBeenCalledWith(0);
    });
  });

  describe('event listeners', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('PlaybackState event updates store playbackState', () => {
      eventListeners[Event.PlaybackState]({ state: State.Playing });
      expect(useAudioPlayerStore.getState().playbackState).toBe('playing');

      eventListeners[Event.PlaybackState]({ state: State.Paused });
      expect(useAudioPlayerStore.getState().playbackState).toBe('paused');
    });

    it('PlaybackActiveTrackChanged updates store active track', async () => {
      await service.loadQueue(mockFiles, 0, false);

      eventListeners[Event.PlaybackActiveTrackChanged]({
        track: { id: 'track-2' },
        index: 1,
      });

      expect(useAudioPlayerStore.getState().activeTrack?.id).toBe('track-2');
      expect(useAudioPlayerStore.getState().currentIndex).toBe(1);
    });

    it('PlaybackActiveTrackChanged resolves track from index when track payload is undefined', async () => {
      await service.loadQueue(mockFiles, 0, false);

      await eventListeners[Event.PlaybackActiveTrackChanged]({
        index: 2,
      });

      expect(useAudioPlayerStore.getState().activeTrack?.id).toBe('track-3');
      expect(useAudioPlayerStore.getState().currentIndex).toBe(2);
    });

    it('PlaybackProgressUpdated updates store progress', () => {
      eventListeners[Event.PlaybackProgressUpdated]({
        position: 12.5,
        duration: 180,
        buffered: 40,
      });

      expect(useAudioPlayerStore.getState().positionMs).toBe(12500);
      expect(useAudioPlayerStore.getState().durationMs).toBe(180000);
      expect(useAudioPlayerStore.getState().bufferedMs).toBe(40000);
    });

    it('PlaybackQueueEnded restarts at index 0 if repeatMode is QUEUE', async () => {
      await service.loadQueue(mockFiles, 2, false);
      await service.setRepeatMode('QUEUE');

      const skipSpy = jest.spyOn(service, 'skipToIndex').mockResolvedValue();

      await eventListeners[Event.PlaybackQueueEnded]({});

      expect(skipSpy).toHaveBeenCalledWith(0);
    });

    it('PlaybackQueueEnded sets state to ended if repeatMode is OFF', async () => {
      await service.loadQueue(mockFiles, 2, false);
      await service.setRepeatMode('OFF');

      await eventListeners[Event.PlaybackQueueEnded]({});

      expect(useAudioPlayerStore.getState().playbackState).toBe('ended');
    });

    it('PlaybackError updates error in store', () => {
      eventListeners[Event.PlaybackError]({ message: 'Playback codec error' });
      expect(useAudioPlayerStore.getState().error).toBe('Playback codec error');
    });

    it('cleanUpEventListeners removes all registered subscriptions', () => {
      service.cleanUpEventListeners();
      expect(Object.keys(eventListeners).length).toBe(0);
    });
  });

  describe('singleton export', () => {
    it('exports default singleton instance', () => {
      expect(audioPlaybackService).toBeInstanceOf(AudioPlaybackService);
    });
  });
});
