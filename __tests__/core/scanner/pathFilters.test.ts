import {
  DEFAULT_MIN_AUDIO_DURATION_MS,
  isHiddenPath,
  isLikelyMessengerPath,
  shouldIncludeAudioFile,
  shouldIncludeDiscoveredFile,
} from '@core/scanner';

describe('scanner path filters', () => {
  describe('isHiddenPath', () => {
    it('detects .nomedia entries and dot-prefixed path segments case-insensitively', () => {
      expect(isHiddenPath('/storage/emulated/0/DCIM/.NOMEDIA')).toBe(true);
      expect(isHiddenPath('/storage/emulated/0/.private/photo.jpg')).toBe(true);
      expect(isHiddenPath('/storage/emulated/0/DCIM/.hidden.jpg')).toBe(true);
    });

    it('does not treat ordinary or relative dot segments as hidden', () => {
      expect(isHiddenPath('/storage/emulated/0/DCIM/Camera/photo.jpg')).toBe(false);
      expect(isHiddenPath('/storage/emulated/0/../DCIM/photo.jpg')).toBe(false);
      expect(isHiddenPath(undefined)).toBe(false);
      expect(isHiddenPath(null)).toBe(false);
    });

    it('allows hidden paths to be included when configured', () => {
      expect(
        shouldIncludeDiscoveredFile(
          { filePath: '/storage/.private/voice.mp3', category: 'AUDIO', durationMs: 60_000 },
          { excludeHiddenPaths: false },
        ),
      ).toBe(true);
      expect(
        shouldIncludeDiscoveredFile({
          filePath: '/storage/.private/voice.mp3',
          category: 'AUDIO',
          durationMs: 60_000,
        }),
      ).toBe(false);
    });
  });

  describe('isLikelyMessengerPath', () => {
    it.each([
      ['/storage/emulated/0/WhatsApp/Media/voice.mp3', true],
      ['/storage/emulated/0/android/media/com.whatsapp/WhatsApp/Media', true],
      ['/storage/emulated/0/TELEGRAM/Telegram Images/photo.jpg', true],
      ['/storage/emulated/0/Android/media/org.telegram.messenger/files', true],
      ['/storage/emulated/0/NotWhatsAppBackup/file.jpg', false],
      ['/storage/emulated/0/TelegramBackup/file.jpg', false],
      ['/storage/emulated/0/DCIM/Camera/photo.jpg', false],
      [undefined, false],
    ])('detects likely messenger paths in %s', (path, expected) => {
      expect(isLikelyMessengerPath(path)).toBe(expected);
    });
  });

  describe('shouldIncludeAudioFile', () => {
    it('uses the 30-second default and includes the exact boundary', () => {
      expect(DEFAULT_MIN_AUDIO_DURATION_MS).toBe(30_000);
      expect(shouldIncludeAudioFile('AUDIO', 29_999)).toBe(false);
      expect(shouldIncludeAudioFile('AUDIO', 30_000)).toBe(true);
      expect(shouldIncludeAudioFile('AUDIO', 30_001)).toBe(true);
    });

    it('keeps missing durations and non-audio files', () => {
      expect(shouldIncludeAudioFile('AUDIO', null)).toBe(true);
      expect(shouldIncludeAudioFile('AUDIO', undefined)).toBe(true);
      expect(shouldIncludeAudioFile('VIDEO', 1)).toBe(true);
    });

    it('supports a custom threshold and bypassing the short-audio filter', () => {
      expect(shouldIncludeAudioFile('AUDIO', 9_999, { minAudioDurationMs: 10_000 })).toBe(false);
      expect(shouldIncludeAudioFile('AUDIO', 10_000, { minAudioDurationMs: 10_000 })).toBe(true);
      expect(shouldIncludeAudioFile('AUDIO', 1, { excludeShortAudio: false })).toBe(true);
    });

    it('rejects invalid configured thresholds explicitly', () => {
      expect(() => shouldIncludeAudioFile('AUDIO', 30_000, { minAudioDurationMs: -1 })).toThrow(
        RangeError,
      );
    });
  });
});
