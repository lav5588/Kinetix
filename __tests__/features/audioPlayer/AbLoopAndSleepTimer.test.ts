import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { audioPlaybackService } from '@features/audioPlayer/services/AudioPlaybackService';
import TrackPlayer from 'react-native-track-player';

describe('A-B Loop Logic and Sleep Timer Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAudioControlsStore.getState().clearAbLoop();
    useAudioControlsStore.getState().clearSleepTimer();
    useAudioPlayerStore.getState().resetPlayback();
  });

  describe('A-B Loop Repeat Logic', () => {
    it('sets Point A and Point B correctly and activates loop', () => {
      const store = useAudioControlsStore.getState();
      store.setPointA(15000); // 15s
      expect(useAudioControlsStore.getState().pointAMs).toBe(15000);
      expect(useAudioControlsStore.getState().isAbLoopActive).toBe(false);

      store.setPointB(45000); // 45s
      expect(useAudioControlsStore.getState().pointBMs).toBe(45000);
      expect(useAudioControlsStore.getState().isAbLoopActive).toBe(true);
    });

    it('automatically seeks back to Point A when playback position reaches Point B', () => {
      const seekSpy = jest.spyOn(audioPlaybackService, 'seekTo').mockResolvedValue(undefined);
      const store = useAudioControlsStore.getState();

      store.setPointA(20000);
      store.setPointB(50000);

      // Position before Point B: should not seek
      audioPlaybackService.handleAbLoop(35000);
      expect(seekSpy).not.toHaveBeenCalled();

      // Position reaches or exceeds Point B: should seek to Point A
      audioPlaybackService.handleAbLoop(50000);
      expect(seekSpy).toHaveBeenCalledWith(20000);

      audioPlaybackService.handleAbLoop(52000);
      expect(seekSpy).toHaveBeenCalledWith(20000);

      seekSpy.mockRestore();
    });

    it('does not seek if A-B loop is cleared or inactive', () => {
      const seekSpy = jest.spyOn(audioPlaybackService, 'seekTo').mockResolvedValue(undefined);
      const store = useAudioControlsStore.getState();

      store.setPointA(20000);
      store.setPointB(50000);
      store.clearAbLoop();

      expect(useAudioControlsStore.getState().isAbLoopActive).toBe(false);
      expect(useAudioControlsStore.getState().pointAMs).toBeNull();
      expect(useAudioControlsStore.getState().pointBMs).toBeNull();

      audioPlaybackService.handleAbLoop(55000);
      expect(seekSpy).not.toHaveBeenCalled();

      seekSpy.mockRestore();
    });
  });

  describe('Sleep Timer Countdown & End-of-Track Logic', () => {
    it('configures sleep timer presets and custom minutes correctly', () => {
      const store = useAudioControlsStore.getState();

      store.setSleepTimer('15M');
      expect(useAudioControlsStore.getState().sleepTimerRemainingSeconds).toBe(15 * 60);
      expect(useAudioControlsStore.getState().isSleepTimerActive).toBe(true);

      store.setSleepTimer('30M');
      expect(useAudioControlsStore.getState().sleepTimerRemainingSeconds).toBe(30 * 60);

      store.setSleepTimer('60M');
      expect(useAudioControlsStore.getState().sleepTimerRemainingSeconds).toBe(60 * 60);

      store.setSleepTimer('CUSTOM', 45);
      expect(useAudioControlsStore.getState().sleepTimerRemainingSeconds).toBe(45 * 60);

      store.clearSleepTimer();
      expect(useAudioControlsStore.getState().isSleepTimerActive).toBe(false);
      expect(useAudioControlsStore.getState().sleepTimerRemainingSeconds).toBe(0);
    });

    it('ticks down every second and signals expiration when counter reaches zero', () => {
      const store = useAudioControlsStore.getState();
      store.setSleepTimer('CUSTOM', 2 / 60); // 2 seconds

      expect(useAudioControlsStore.getState().sleepTimerRemainingSeconds).toBe(2);

      const expired1 = store.tickSleepTimer();
      expect(expired1).toBe(false);
      expect(useAudioControlsStore.getState().sleepTimerRemainingSeconds).toBe(1);

      const expired2 = store.tickSleepTimer();
      expect(expired2).toBe(true);
      expect(useAudioControlsStore.getState().isSleepTimerActive).toBe(false);
      expect(useAudioControlsStore.getState().sleepTimerRemainingSeconds).toBe(0);
    });

    it('pauses playback when sleep timer expires via fake timers', async () => {
      jest.useFakeTimers();
      const pauseSpy = jest.spyOn(audioPlaybackService, 'pause').mockResolvedValue(undefined);

      const store = useAudioControlsStore.getState();
      store.setSleepTimer('15M'); // 15 minutes = 900 seconds
      audioPlaybackService.startSleepTimerMonitoring();

      // Advance by 14 minutes and 59 seconds: should not pause yet
      jest.advanceTimersByTime(14 * 60 * 1000 + 59 * 1000);
      expect(pauseSpy).not.toHaveBeenCalled();

      // Advance by 1 more second (15 minutes reached): pauses
      jest.advanceTimersByTime(1000);
      expect(pauseSpy).toHaveBeenCalledTimes(1);

      audioPlaybackService.stopSleepTimerMonitoring();
      pauseSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
