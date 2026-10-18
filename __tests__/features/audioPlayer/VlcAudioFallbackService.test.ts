import TrackPlayer, { Event } from 'react-native-track-player';
import type { MediaFileRow } from '@core/storage/types';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import {
  AudioPlaybackService,
  mapMediaFileToTrack,
} from '../../../src/features/audioPlayer';
import {
  VlcAudioFallbackService,
  vlcAudioFallbackService,
  type VlcNativeDriver,
} from '../../../src/features/audioPlayer/services/VlcAudioFallbackService';

function createMockAudioFile(id: string, name: string, ext: string): MediaFileRow {
  return {
    id,
    file_path: `/storage/emulated/0/Music/${name}`,
    file_name: name,
    extension: ext,
    mime_type: `audio/${ext}`,
    category: 'AUDIO',
    folder_path: '/storage/emulated/0/Music',
    folder_name: 'Music',
    size_bytes: 5000000,
    duration_ms: 120000,
    artist: 'Fallback Artist',
    album: 'Fallback Album',
    width: null,
    height: null,
    date_added: 1700000000000,
    date_modified: 1700000000000,
    is_hidden: 0,
    is_messenger_media: 0,
    is_favorite: 0,
    is_vaulted: 0,
  };
}

describe('VlcAudioFallbackService', () => {
  let mockDriver: jest.Mocked<VlcNativeDriver>;
  let service: VlcAudioFallbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    useAudioPlayerStore.getState().resetPlayback();

    mockDriver = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      seekTo: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    };

    service = new VlcAudioFallbackService(mockDriver);
  });

  describe('Candidate Detection and Retry Loop Prevention', () => {
    it('identifies .ape, .wma, and .mpc as candidate extensions', () => {
      expect(service.isCandidateExtension('ape')).toBe(true);
      expect(service.isCandidateExtension('APE')).toBe(true);
      expect(service.isCandidateExtension('wma')).toBe(true);
      expect(service.isCandidateExtension('mpc')).toBe(true);

      // Ordinary formats are NOT candidates
      expect(service.isCandidateExtension('mp3')).toBe(false);
      expect(service.isCandidateExtension('flac')).toBe(false);
      expect(service.isCandidateExtension('wav')).toBe(false);
      expect(service.isCandidateExtension('m4a')).toBe(false);
    });

    it('identifies unsupported codec error patterns', () => {
      expect(service.isCodecError('MEDIA_ERROR_UNSUPPORTED')).toBe(true);
      expect(service.isCodecError('UnrecognizedInputFormatException: None of the available extractors')).toBe(true);
      expect(service.isCodecError('ParserException: Error parsing media stream')).toBe(true);
      expect(service.isCodecError('ExtractorException: Cannot decode stream')).toBe(true);
      expect(service.isCodecError('Decoder init failed: unsupported codec')).toBe(true);
      expect(service.isCodecError('Format not supported by ExoPlayer')).toBe(true);

      expect(service.isCodecError('File not found')).toBe(false);
      expect(service.isCodecError('')).toBe(false);
    });

    it('canHandle evaluates track extension and codec errors', () => {
      const apeTrack = mapMediaFileToTrack(createMockAudioFile('t-1', 'track.ape', 'ape'));
      const mp3Track = mapMediaFileToTrack(createMockAudioFile('t-2', 'track.mp3', 'mp3'));

      expect(service.canHandle(apeTrack)).toBe(true);
      expect(service.canHandle(mp3Track)).toBe(false);

      // Ordinary file with codec error can be handled
      expect(service.canHandle(mp3Track, 'UnrecognizedInputFormatException')).toBe(true);
      // Ordinary file with unrelated error is NOT handled
      expect(service.canHandle(mp3Track, 'Network timeout')).toBe(false);
    });

    it('prevents retry loops by rejecting tracks already attempted', async () => {
      const apeTrack = mapMediaFileToTrack(createMockAudioFile('t-loop', 'track.ape', 'ape'));

      expect(service.canHandle(apeTrack)).toBe(true);
      await service.play(apeTrack);

      // Subsequent attempt for the same track ID is rejected to avoid retry loops
      expect(service.canHandle(apeTrack)).toBe(false);
    });
  });

  describe('Playback Controls and State with Native Driver', () => {
    it('plays track through native driver and updates store state', async () => {
      const wmaTrack = mapMediaFileToTrack(createMockAudioFile('t-wma', 'track.wma', 'wma'));

      const result = await service.play(wmaTrack, 5000);
      expect(result).toBe(true);
      expect(mockDriver.play).toHaveBeenCalledWith(wmaTrack.url, 5000);
      expect(service.getState()).toBe('playing');
      expect(useAudioPlayerStore.getState().playbackState).toBe('playing');
      expect(service.getActiveTrack()?.id).toBe('t-wma');
    });

    it('pause, resume, seekTo, stop invoke driver and update store', async () => {
      const mpcTrack = mapMediaFileToTrack(createMockAudioFile('t-mpc', 'track.mpc', 'mpc'));
      await service.play(mpcTrack);

      await service.pause();
      expect(mockDriver.pause).toHaveBeenCalled();
      expect(service.getState()).toBe('paused');
      expect(useAudioPlayerStore.getState().playbackState).toBe('paused');

      await service.resume();
      expect(mockDriver.resume).toHaveBeenCalled();
      expect(service.getState()).toBe('playing');
      expect(useAudioPlayerStore.getState().playbackState).toBe('playing');

      await service.seekTo(12000);
      expect(mockDriver.seekTo).toHaveBeenCalledWith(12000);
      expect(useAudioPlayerStore.getState().positionMs).toBe(12000);

      await service.stop();
      expect(mockDriver.stop).toHaveBeenCalled();
      expect(service.getState()).toBe('stopped');
      expect(useAudioPlayerStore.getState().playbackState).toBe('stopped');

      await service.reset();
      expect(service.getActiveTrack()).toBeNull();
      expect(service.getState()).toBe('idle');
    });

    it('surfaces driver errors as recoverable store errors without throwing unhandled rejections', async () => {
      mockDriver.play.mockRejectedValueOnce(new Error('LibVLC JNI decoding failure'));
      const apeTrack = mapMediaFileToTrack(createMockAudioFile('t-err', 'track.ape', 'ape'));

      const result = await service.play(apeTrack);
      expect(result).toBe(false);
      expect(service.getState()).toBe('error');
      expect(useAudioPlayerStore.getState().error).toBe('LibVLC JNI decoding failure');
      expect(useAudioPlayerStore.getState().playbackState).toBe('error');
    });

    it('surfaces recoverable error when native driver is unavailable', async () => {
      service.setDriver(null);
      const apeTrack = mapMediaFileToTrack(createMockAudioFile('t-nodriver', 'track.ape', 'ape'));

      const result = await service.play(apeTrack);
      expect(result).toBe(false);
      expect(service.getState()).toBe('error');
      expect(useAudioPlayerStore.getState().error).toContain('Native VLC audio driver is unavailable for .APE');
      expect(useAudioPlayerStore.getState().playbackState).toBe('error');
    });
  });

  describe('Integration with AudioPlaybackService', () => {
    let audioService: AudioPlaybackService;
    const eventListeners: Record<string, (payload: any) => Promise<void>> = {};

    beforeEach(() => {
      (TrackPlayer.addEventListener as jest.Mock).mockImplementation((event: string, handler: any) => {
        eventListeners[event] = handler;
        return { remove: jest.fn() };
      });

      audioService = new AudioPlaybackService();
      vlcAudioFallbackService.setDriver(mockDriver);
    });

    afterEach(async () => {
      await vlcAudioFallbackService.reset();
    });

    it('triggers VLC fallback when primary engine emits PlaybackError for eligible file', async () => {
      const apeFile = createMockAudioFile('ape-1', 'test.ape', 'ape');
      await audioService.loadQueue([apeFile], 0, false);
      await audioService.initialize();

      // Simulate ExoPlayer rejecting the codec with PlaybackError
      await eventListeners[Event.PlaybackError]({
        message: 'UnrecognizedInputFormatException: None of the available extractors could read the stream',
      });

      // Primary TrackPlayer must be stopped first
      expect(TrackPlayer.stop).toHaveBeenCalled();
      // VLC fallback driver must play the candidate track
      expect(mockDriver.play).toHaveBeenCalledWith(
        expect.stringContaining('test.ape'),
        expect.any(Number),
      );
      expect(vlcAudioFallbackService.getActiveTrack()?.id).toBe('ape-1');
    });

    it('does NOT trigger VLC fallback for ordinary supported files with unrelated errors', async () => {
      const mp3File = createMockAudioFile('mp3-1', 'test.mp3', 'mp3');
      await audioService.loadQueue([mp3File], 0, false);
      await audioService.initialize();

      await eventListeners[Event.PlaybackError]({
        message: 'IO Error: Read permission denied',
      });

      expect(mockDriver.play).not.toHaveBeenCalled();
      expect(useAudioPlayerStore.getState().error).toBe('IO Error: Read permission denied');
    });

    it('routes play, pause, seekTo, and stop through VLC when fallback is active', async () => {
      const wmaFile = createMockAudioFile('wma-1', 'test.wma', 'wma');
      await audioService.loadQueue([wmaFile], 0, false);
      await audioService.initialize();

      // Trigger fallback
      await eventListeners[Event.PlaybackError]({ message: 'MEDIA_ERROR_UNSUPPORTED' });
      expect(vlcAudioFallbackService.getActiveTrack()).not.toBeNull();

      // Pause via AudioPlaybackService should delegate to VLC
      await audioService.pause();
      expect(mockDriver.pause).toHaveBeenCalled();

      // Resume via AudioPlaybackService should delegate to VLC
      await audioService.play();
      expect(mockDriver.resume).toHaveBeenCalled();

      // Seek via AudioPlaybackService should delegate to VLC
      await audioService.seekTo(30000);
      expect(mockDriver.seekTo).toHaveBeenCalledWith(30000);

      // Stop via AudioPlaybackService should stop VLC
      await audioService.stop();
      expect(mockDriver.stop).toHaveBeenCalled();
    });
  });
});
