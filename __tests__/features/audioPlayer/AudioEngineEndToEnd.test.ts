import TrackPlayer, { Event, RepeatMode, State } from 'react-native-track-player';
import { appSettingsStorage } from '@core/storage/mmkv';
import { ResumeRepository } from '@core/storage/repositories/ResumeRepository';
import type { MediaFileRow } from '@core/storage/types';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import {
  AudioPlaybackService,
  audioPlaybackService,
  vlcAudioFallbackService,
} from '../../../src/features/audioPlayer';

describe('Audio Engine End-to-End Validation (Task 9 Subtask 10)', () => {
  const eventListeners: Record<string, (payload: any) => Promise<void> | void> = {};

  const mockAlbumFiles: MediaFileRow[] = [
    {
      id: 'song-01',
      file_path: '/storage/emulated/0/Music/Album/01_Intro.mp3',
      file_name: '01_Intro.mp3',
      extension: 'mp3',
      mime_type: 'audio/mpeg',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music/Album',
      folder_name: 'Album',
      size_bytes: 4000000,
      duration_ms: 120000, // 2 mins (< 10 min default)
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
    },
    {
      id: 'song-02',
      file_path: '/storage/emulated/0/Music/Album/02_EpicTrack.flac',
      file_name: '02_EpicTrack.flac',
      extension: 'flac',
      mime_type: 'audio/flac',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music/Album',
      folder_name: 'Album',
      size_bytes: 35000000,
      duration_ms: 900000, // 15 mins (> 10 min default)
      artist: 'Artist',
      album: 'Album',
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
      id: 'song-03',
      file_path: '/storage/emulated/0/Music/Album/03_RareCodec.ape',
      file_name: '03_RareCodec.ape',
      extension: 'ape',
      mime_type: 'audio/x-monkeys-audio',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/Music/Album',
      folder_name: 'Album',
      size_bytes: 22000000,
      duration_ms: 200000,
      artist: 'Artist',
      album: 'Album',
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

  beforeEach(() => {
    jest.clearAllMocks();
    useAudioPlayerStore.getState().resetPlayback();
    ResumeRepository.clearAll();
    appSettingsStorage.delete('audio_resume_min_duration_sec');

    (TrackPlayer.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
      eventListeners[event] = handler;
      return { remove: jest.fn() };
    });
  });

  afterEach(async () => {
    audioPlaybackService.cleanUpEventListeners();
    await vlcAudioFallbackService.reset();
    ResumeRepository.clearAll();
  });

  it('validates queue loading, play, pause, seek, and skip lifecycle', async () => {
    // 1. Load Queue
    await audioPlaybackService.loadQueue(mockAlbumFiles, 0, true);
    expect(TrackPlayer.add).toHaveBeenCalled();
    expect(TrackPlayer.play).toHaveBeenCalled();
    expect(useAudioPlayerStore.getState().activeTrack?.id).toBe('song-01');

    // 2. Pause
    await audioPlaybackService.pause();
    expect(TrackPlayer.pause).toHaveBeenCalled();
    expect(useAudioPlayerStore.getState().playbackState).toBe('paused');

    // 3. Seek
    await audioPlaybackService.seekTo(45000);
    expect(TrackPlayer.seekTo).toHaveBeenCalledWith(45);
    expect(useAudioPlayerStore.getState().positionMs).toBe(45000);

    // 4. Skip to Next
    await audioPlaybackService.skipToNext();
    expect(TrackPlayer.skip).toHaveBeenCalledWith(1);
    expect(useAudioPlayerStore.getState().activeTrack?.id).toBe('song-02');
  });

  it('validates repeat modes (OFF, TRACK, QUEUE) and shuffle toggling', async () => {
    await audioPlaybackService.loadQueue(mockAlbumFiles, 0, false);

    // Repeat TRACK
    await audioPlaybackService.setRepeatMode('TRACK');
    expect(TrackPlayer.setRepeatMode).toHaveBeenCalledWith(RepeatMode.Track);
    expect(useAudioPlayerStore.getState().repeatMode).toBe('TRACK');

    // Repeat QUEUE
    await audioPlaybackService.setRepeatMode('QUEUE');
    expect(TrackPlayer.setRepeatMode).toHaveBeenCalledWith(RepeatMode.Queue);
    expect(useAudioPlayerStore.getState().repeatMode).toBe('QUEUE');

    // Shuffle Toggle ON
    await audioPlaybackService.toggleShuffle();
    expect(useAudioPlayerStore.getState().isShuffled).toBe(true);
    expect(useAudioPlayerStore.getState().queue[0].id).toBe('song-01');

    // Shuffle Toggle OFF (restores original order)
    await audioPlaybackService.toggleShuffle();
    expect(useAudioPlayerStore.getState().isShuffled).toBe(false);
    expect(useAudioPlayerStore.getState().queue[0].id).toBe('song-01');
    expect(useAudioPlayerStore.getState().queue[1].id).toBe('song-02');
    expect(useAudioPlayerStore.getState().queue[2].id).toBe('song-03');
  });

  it('validates unsupported codec (.ape) fallback to VLC engine', async () => {
    const mockVlcDriver = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      seekTo: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    vlcAudioFallbackService.setDriver(mockVlcDriver);

    await audioPlaybackService.loadQueue(mockAlbumFiles, 2, false);
    await audioPlaybackService.initialize();

    // Simulate primary engine rejecting .ape codec
    await eventListeners[Event.PlaybackError]({
      message: 'UnrecognizedInputFormatException: None of the available extractors could read the stream',
    });

    // Primary engine must be stopped first
    expect(TrackPlayer.stop).toHaveBeenCalled();
    // VLC driver starts playback of candidate
    expect(mockVlcDriver.play).toHaveBeenCalledWith(
      expect.stringContaining('03_RareCodec.ape'),
      expect.any(Number),
    );
    expect(vlcAudioFallbackService.getActiveTrack()?.id).toBe('song-03');
  });

  it('validates throttled resume persistence and minimum duration preferences', async () => {
    const saveSpy = jest.spyOn(ResumeRepository, 'saveState');
    await audioPlaybackService.loadQueue(mockAlbumFiles, 1, true); // song-02 is 15 mins (> 10 mins)
    await audioPlaybackService.initialize();

    const t0 = 1000000;
    jest.spyOn(Date, 'now').mockReturnValue(t0);

    // Initial tick saves
    eventListeners[Event.PlaybackProgressUpdated]({
      position: 10,
      duration: 900,
      buffered: 50,
    });
    expect(saveSpy).toHaveBeenCalledTimes(1);

    // 1 second later (too soon, < 2000ms -> ignored)
    jest.spyOn(Date, 'now').mockReturnValue(t0 + 1000);
    eventListeners[Event.PlaybackProgressUpdated]({
      position: 11,
      duration: 900,
      buffered: 50,
    });
    expect(saveSpy).toHaveBeenCalledTimes(1);

    // 2.5 seconds later with position shift -> saved
    jest.spyOn(Date, 'now').mockReturnValue(t0 + 2500);
    eventListeners[Event.PlaybackProgressUpdated]({
      position: 13,
      duration: 900,
      buffered: 50,
    });
    expect(saveSpy).toHaveBeenCalledTimes(2);

    // Short song (2 mins) does NOT trigger save when default min duration is 600s
    await audioPlaybackService.loadQueue(mockAlbumFiles, 0, false);
    eventListeners[Event.PlaybackProgressUpdated]({
      position: 30,
      duration: 120,
      buffered: 50,
    });
    // Call count remains 2
    expect(saveSpy).toHaveBeenCalledTimes(2);
  });

  it('validates completion threshold (>= 97%) resetting position and marking isCompleted', async () => {
    await audioPlaybackService.loadQueue(mockAlbumFiles, 1, false);
    await audioPlaybackService.initialize();

    // 98% of 900s = 882s
    eventListeners[Event.PlaybackProgressUpdated]({
      position: 885,
      duration: 900,
      buffered: 900,
    });

    const record = ResumeRepository.getState(mockAlbumFiles[1].file_path);
    expect(record).not.toBeNull();
    expect(record?.isCompleted).toBe(true);
    expect(record?.positionMs).toBe(0);
  });
});
