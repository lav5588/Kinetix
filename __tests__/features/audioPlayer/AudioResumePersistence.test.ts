import TrackPlayer, { Event } from 'react-native-track-player';
import { appSettingsStorage } from '@core/storage/mmkv';
import { ResumeRepository } from '@core/storage/repositories/ResumeRepository';
import type { MediaFileRow } from '@core/storage/types';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { AudioPlaybackService } from '../../../src/features/audioPlayer/services/AudioPlaybackService';

describe('AudioPlaybackService - Resume Persistence (Subtask 8)', () => {
  let service: AudioPlaybackService;
  const eventListeners: Record<string, (payload: any) => Promise<void> | void> = {};

  const longAudioFile: MediaFileRow = {
    id: 'long-audio-1',
    file_path: '/storage/emulated/0/Podcasts/episode1.mp3',
    file_name: 'episode1.mp3',
    extension: 'mp3',
    mime_type: 'audio/mpeg',
    category: 'AUDIO',
    folder_path: '/storage/emulated/0/Podcasts',
    folder_name: 'Podcasts',
    size_bytes: 45000000,
    duration_ms: 1800000, // 30 minutes (> 10 mins)
    artist: 'Podcast Host',
    album: 'Tech Talks',
    width: null,
    height: null,
    date_added: 1700000000000,
    date_modified: 1700000000000,
    is_hidden: 0,
    is_messenger_media: 0,
    is_favorite: 0,
    is_vaulted: 0,
  };

  const shortAudioFile: MediaFileRow = {
    id: 'short-audio-1',
    file_path: '/storage/emulated/0/Music/short_song.mp3',
    file_name: 'short_song.mp3',
    extension: 'mp3',
    mime_type: 'audio/mpeg',
    category: 'AUDIO',
    folder_path: '/storage/emulated/0/Music',
    folder_name: 'Music',
    size_bytes: 4000000,
    duration_ms: 180000, // 3 minutes (< 10 mins)
    artist: 'Short Artist',
    album: 'Short Album',
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
    ResumeRepository.clearAll();
    appSettingsStorage.delete('audio_resume_min_duration_sec');

    (TrackPlayer.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      eventListeners[event] = handler;
      return { remove: jest.fn() };
    });

    service = new AudioPlaybackService();
  });

  afterEach(() => {
    service.cleanUpEventListeners();
    ResumeRepository.clearAll();
  });

  describe('shouldPersistResume', () => {
    it('returns false for audio shorter than default 600s (10 min)', async () => {
      await service.loadQueue([shortAudioFile], 0, false);
      const activeTrack = useAudioPlayerStore.getState().activeTrack;

      expect(service.shouldPersistResume(activeTrack, shortAudioFile.duration_ms!)).toBe(false);
    });

    it('returns true for audio longer than default 600s', async () => {
      await service.loadQueue([longAudioFile], 0, false);
      const activeTrack = useAudioPlayerStore.getState().activeTrack;

      expect(service.shouldPersistResume(activeTrack, longAudioFile.duration_ms!)).toBe(true);
    });

    it('returns true for any audio when audio_resume_min_duration_sec is set to 0', async () => {
      appSettingsStorage.set('audio_resume_min_duration_sec', 0);
      await service.loadQueue([shortAudioFile], 0, false);
      const activeTrack = useAudioPlayerStore.getState().activeTrack;

      expect(service.shouldPersistResume(activeTrack, shortAudioFile.duration_ms!)).toBe(true);
    });
  });

  describe('Throttled Persistence during playback', () => {
    it('throttles progress persistence to approximately every 2 seconds', async () => {
      const saveSpy = jest.spyOn(ResumeRepository, 'saveState');
      await service.loadQueue([longAudioFile], 0, false);
      await service.initialize();

      const startTime = 1000000;
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      // 1st tick at 1 second (1000ms elapsed since last save 0 -> saves)
      eventListeners[Event.PlaybackProgressUpdated]({
        position: 1,
        duration: 1800,
        buffered: 10,
      });
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filePath: longAudioFile.file_path,
          positionMs: 1000,
        }),
      );

      // Rapid high-frequency tick 500ms later (1500ms total -> should be throttled/ignored)
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 500);
      eventListeners[Event.PlaybackProgressUpdated]({
        position: 1.5,
        duration: 1800,
        buffered: 10,
      });
      expect(saveSpy).toHaveBeenCalledTimes(1);

      // Another rapid tick at 1200ms elapsed (still < 2000ms -> should be throttled)
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 1200);
      eventListeners[Event.PlaybackProgressUpdated]({
        position: 2.2,
        duration: 1800,
        buffered: 10,
      });
      expect(saveSpy).toHaveBeenCalledTimes(1);

      // After 2100ms and meaningful position shift -> should save
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 2100);
      eventListeners[Event.PlaybackProgressUpdated]({
        position: 3.5,
        duration: 1800,
        buffered: 10,
      });
      expect(saveSpy).toHaveBeenCalledTimes(2);
      expect(saveSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filePath: longAudioFile.file_path,
          positionMs: 3500,
        }),
      );
    });

    it('does NOT write when track duration is below minimum preference', async () => {
      const saveSpy = jest.spyOn(ResumeRepository, 'saveState');
      await service.loadQueue([shortAudioFile], 0, false);
      await service.initialize();

      eventListeners[Event.PlaybackProgressUpdated]({
        position: 10,
        duration: 180,
        buffered: 15,
      });

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('Completion Threshold', () => {
    it('marks completed and resets positionMs to 0 when >= 97% of duration is reached', async () => {
      await service.loadQueue([longAudioFile], 0, false);
      await service.initialize();

      // 98% of 1800s = 1764s
      eventListeners[Event.PlaybackProgressUpdated]({
        position: 1765,
        duration: 1800,
        buffered: 1800,
      });

      const saved = ResumeRepository.getState(longAudioFile.file_path);
      expect(saved).not.toBeNull();
      expect(saved?.isCompleted).toBe(true);
      expect(saved?.positionMs).toBe(0);
    });
  });

  describe('Lifecycle flush triggers', () => {
    beforeEach(async () => {
      await service.loadQueue([longAudioFile], 0, false);
      await service.initialize();
    });

    it('flushes resume state on pause()', async () => {
      const saveSpy = jest.spyOn(ResumeRepository, 'saveState');
      useAudioPlayerStore.getState().setProgress(45000, 1800000);

      await service.pause();
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: longAudioFile.file_path,
          positionMs: 45000,
        }),
      );
    });

    it('flushes resume state on stop()', async () => {
      const saveSpy = jest.spyOn(ResumeRepository, 'saveState');
      useAudioPlayerStore.getState().setProgress(62000, 1800000);

      await service.stop();
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: longAudioFile.file_path,
          positionMs: 62000,
        }),
      );
    });

    it('flushes previous track resume state when active track changes', async () => {
      const saveSpy = jest.spyOn(ResumeRepository, 'saveState');
      useAudioPlayerStore.getState().setProgress(120000, 1800000);

      const nextLongFile: MediaFileRow = {
        ...longAudioFile,
        id: 'long-audio-2',
        file_path: '/storage/emulated/0/Podcasts/episode2.mp3',
        file_name: 'episode2.mp3',
      };

      eventListeners[Event.PlaybackActiveTrackChanged]({
        track: { id: 'long-audio-2' },
        index: 1,
      });

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: longAudioFile.file_path,
          positionMs: 120000,
        }),
      );
    });
  });
});
