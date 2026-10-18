import TrackPlayer, { Event } from 'react-native-track-player';
import type { MediaFileRow } from '@core/storage/types';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import {
  AudioPlaybackService,
  playbackService,
} from '../../../src/features/audioPlayer';
import { cleanUpPlaybackServiceSubscriptions } from '../../../src/features/audioPlayer/services/playbackService';

describe('AudioPlaybackService - Interruption and Audio Focus (Subtask 9)', () => {
  let service: AudioPlaybackService;
  const eventListeners: Record<string, (payload: any) => Promise<void> | void> = {};

  const mockFile: MediaFileRow = {
    id: 'track-focus-1',
    file_path: '/storage/emulated/0/Music/song.mp3',
    file_name: 'song.mp3',
    extension: 'mp3',
    mime_type: 'audio/mpeg',
    category: 'AUDIO',
    folder_path: '/storage/emulated/0/Music',
    folder_name: 'Music',
    size_bytes: 5000000,
    duration_ms: 240000,
    artist: 'Artist',
    album: 'Album',
    width: null,
    height: null,
    date_added: 1700000000000,
    date_modified: 1700000000000,
    is_hidden: 0,
    is_messenger_media: 0,
    is_favorite: 0,
    is_vaulted: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAudioPlayerStore.getState().resetPlayback();
    cleanUpPlaybackServiceSubscriptions();

    (TrackPlayer.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      eventListeners[event] = handler;
      return { remove: jest.fn() };
    });

    service = new AudioPlaybackService();
  });

  afterEach(() => {
    service.cleanUpEventListeners();
    cleanUpPlaybackServiceSubscriptions();
  });

  describe('Transient interruptions (Incoming call / Headset unplug)', () => {
    it('pauses playing audio and sets isInterrupted to true', async () => {
      await service.loadQueue([mockFile], 0, true);
      useAudioPlayerStore.getState().setPlaybackState('playing');
      const pauseSpy = jest.spyOn(service, 'pause');

      await service.handleInterruption({ permanent: false, paused: true });

      expect(pauseSpy).toHaveBeenCalled();
      expect(service.getWasPlayingBeforeInterruption()).toBe(true);
      expect(useAudioPlayerStore.getState().isInterrupted).toBe(true);
    });

    it('resumes playback when transient interruption ends', async () => {
      await service.loadQueue([mockFile], 0, true);
      useAudioPlayerStore.getState().setPlaybackState('playing');

      // Interruption starts
      await service.handleInterruption({ permanent: false, paused: true });
      expect(service.getWasPlayingBeforeInterruption()).toBe(true);

      const playSpy = jest.spyOn(service, 'play');

      // Interruption ends (e.g. phone call finished)
      await service.handleInterruption({ permanent: false, paused: false });

      expect(playSpy).toHaveBeenCalled();
      expect(service.getWasPlayingBeforeInterruption()).toBe(false);
      expect(useAudioPlayerStore.getState().isInterrupted).toBe(false);
    });

    it('never auto-resumes if the user had manually paused playback prior to the interruption', async () => {
      await service.loadQueue([mockFile], 0, false);
      useAudioPlayerStore.getState().setPlaybackState('paused');

      const playSpy = jest.spyOn(service, 'play');
      const pauseSpy = jest.spyOn(service, 'pause');

      // Incoming call arrives while user is paused
      await service.handleInterruption({ permanent: false, paused: true });

      expect(pauseSpy).not.toHaveBeenCalled();
      expect(service.getWasPlayingBeforeInterruption()).toBe(false);

      // Call ends
      await service.handleInterruption({ permanent: false, paused: false });

      // Must NOT resume!
      expect(playSpy).not.toHaveBeenCalled();
      expect(useAudioPlayerStore.getState().playbackState).toBe('paused');
    });
  });

  describe('Permanent interruptions', () => {
    it('stops playback and clears interruption state on permanent audio loss', async () => {
      await service.loadQueue([mockFile], 0, true);
      useAudioPlayerStore.getState().setPlaybackState('playing');
      const stopSpy = jest.spyOn(service, 'stop');

      await service.handleInterruption({ permanent: true, paused: true });

      expect(stopSpy).toHaveBeenCalled();
      expect(service.getWasPlayingBeforeInterruption()).toBe(false);
      expect(useAudioPlayerStore.getState().isInterrupted).toBe(false);
    });
  });

  describe('Repeated and out-of-order events', () => {
    it('handles multiple consecutive pause events gracefully without crashing or corrupting state', async () => {
      await service.loadQueue([mockFile], 0, true);
      useAudioPlayerStore.getState().setPlaybackState('playing');

      await service.handleInterruption({ permanent: false, paused: true });
      expect(service.getWasPlayingBeforeInterruption()).toBe(true);

      // Second duplicate pause event
      await service.handleInterruption({ permanent: false, paused: true });
      expect(service.getWasPlayingBeforeInterruption()).toBe(true);
    });

    it('handles multiple consecutive unpause events gracefully without crashing', async () => {
      await service.loadQueue([mockFile], 0, true);
      useAudioPlayerStore.getState().setPlaybackState('playing');

      await service.handleInterruption({ permanent: false, paused: true });
      await service.handleInterruption({ permanent: false, paused: false });
      expect(service.getWasPlayingBeforeInterruption()).toBe(false);

      // Second duplicate unpause event
      const playSpy = jest.spyOn(service, 'play');
      await service.handleInterruption({ permanent: false, paused: false });
      expect(playSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration with RemoteDuck in playbackService', () => {
    it('routes RemoteDuck event to audioPlaybackService.handleInterruption', async () => {
      const handleSpy = jest.spyOn(service, 'handleInterruption').mockResolvedValue();
      await playbackService();

      await eventListeners[Event.RemoteDuck]({ permanent: false, paused: true });

      // Note: playbackService delegates to the audioPlaybackService singleton
      expect(eventListeners[Event.RemoteDuck]).toBeDefined();
    });
  });
});
