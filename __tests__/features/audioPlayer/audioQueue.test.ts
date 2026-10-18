import type { MediaFileRow } from '@core/storage/types';
import {
  buildAudioQueue,
  findTrackIndexById,
  getNextTrackIndex,
  getPreviousTrackIndex,
  mapMediaFileToTrack,
  shuffleQueue,
} from '@features/audioPlayer';

const createMockFile = (id: string, name: string, durationMs = 180000): MediaFileRow => ({
  id,
  file_path: `/storage/emulated/0/Music/${name}`,
  file_name: name,
  extension: 'mp3',
  mime_type: 'audio/mpeg',
  category: 'AUDIO',
  folder_path: '/storage/emulated/0/Music',
  folder_name: 'Music',
  size_bytes: 4096000,
  duration_ms: durationMs,
  width: null,
  height: null,
  artist: 'Sample Artist',
  album: 'Sample Album',
  date_modified: 1700000000,
  date_added: 1700000000,
  is_hidden: 0,
  is_messenger_media: 0,
  is_favorite: 0,
  is_vaulted: 0,
});

describe('audioQueue utilities', () => {
  describe('mapMediaFileToTrack', () => {
    it('correctly maps MediaFileRow fields into an AudioTrack', () => {
      const file = createMockFile('file-123', 'Song.mp3', 240000);
      const track = mapMediaFileToTrack(file);

      expect(track.id).toBe('file-123');
      expect(track.url).toBe('file:///storage/emulated/0/Music/Song.mp3');
      expect(track.title).toBe('Song.mp3');
      expect(track.artist).toBe('Sample Artist');
      expect(track.album).toBe('Sample Album');
      expect(track.duration).toBe(240);
      expect(track.contentType).toBe('audio/mpeg');
      expect(track.originalFile).toBe(file);
    });

    it('preserves existing file:// prefix on file_path', () => {
      const file = {
        ...createMockFile('file-prefixed', 'Prefixed.mp3'),
        file_path: 'file:///storage/emulated/0/Music/Prefixed.mp3',
      };
      const track = mapMediaFileToTrack(file);
      expect(track.url).toBe('file:///storage/emulated/0/Music/Prefixed.mp3');
    });

    it('handles files with missing duration gracefully', () => {
      const file = {
        ...createMockFile('file-nodur', 'NoDuration.mp3'),
        duration_ms: null,
      };
      const track = mapMediaFileToTrack(file);
      expect(track.duration).toBeUndefined();
    });
  });

  describe('buildAudioQueue', () => {
    it('handles empty files array safely', () => {
      const result = buildAudioQueue([]);
      expect(result.queue).toEqual([]);
      expect(result.currentIndex).toBe(-1);
    });

    it('builds a single-track queue with clamped index', () => {
      const file = createMockFile('file-1', 'Single.mp3');
      const result = buildAudioQueue([file], 5);
      expect(result.queue).toHaveLength(1);
      expect(result.queue[0].id).toBe('file-1');
      expect(result.currentIndex).toBe(0);
    });

    it('builds a multi-track queue with requested start index', () => {
      const files = [
        createMockFile('f-1', 'Track1.mp3'),
        createMockFile('f-2', 'Track2.mp3'),
        createMockFile('f-3', 'Track3.mp3'),
      ];
      const result = buildAudioQueue(files, 2);
      expect(result.queue).toHaveLength(3);
      expect(result.queue[2].id).toBe('f-3');
      expect(result.currentIndex).toBe(2);
    });
  });

  describe('getNextTrackIndex', () => {
    it('returns null for an empty queue', () => {
      expect(getNextTrackIndex(0, 0, 'OFF')).toBeNull();
      expect(getNextTrackIndex(0, 0, 'QUEUE')).toBeNull();
      expect(getNextTrackIndex(0, 0, 'TRACK')).toBeNull();
    });

    it('handles repeat mode TRACK by returning current index', () => {
      expect(getNextTrackIndex(1, 3, 'TRACK')).toBe(1);
      expect(getNextTrackIndex(2, 3, 'TRACK')).toBe(2);
    });

    describe('repeat mode OFF', () => {
      it('advances to next index within queue bounds', () => {
        expect(getNextTrackIndex(0, 3, 'OFF')).toBe(1);
        expect(getNextTrackIndex(1, 3, 'OFF')).toBe(2);
      });

      it('returns null when end of queue is reached', () => {
        expect(getNextTrackIndex(2, 3, 'OFF')).toBeNull();
      });
    });

    describe('repeat mode QUEUE', () => {
      it('advances to next index within queue bounds', () => {
        expect(getNextTrackIndex(0, 3, 'QUEUE')).toBe(1);
        expect(getNextTrackIndex(1, 3, 'QUEUE')).toBe(2);
      });

      it('wraps to 0 when end of queue is reached', () => {
        expect(getNextTrackIndex(2, 3, 'QUEUE')).toBe(0);
      });
    });
  });

  describe('getPreviousTrackIndex', () => {
    it('returns null for an empty queue', () => {
      expect(getPreviousTrackIndex(0, 0, 'OFF')).toBeNull();
      expect(getPreviousTrackIndex(0, 0, 'QUEUE')).toBeNull();
      expect(getPreviousTrackIndex(0, 0, 'TRACK')).toBeNull();
    });

    it('handles repeat mode TRACK by returning current index', () => {
      expect(getPreviousTrackIndex(1, 3, 'TRACK')).toBe(1);
    });

    describe('repeat mode OFF', () => {
      it('decrements index within bounds', () => {
        expect(getPreviousTrackIndex(2, 3, 'OFF')).toBe(1);
        expect(getPreviousTrackIndex(1, 3, 'OFF')).toBe(0);
      });

      it('clamps to index 0 at start of queue', () => {
        expect(getPreviousTrackIndex(0, 3, 'OFF')).toBe(0);
      });
    });

    describe('repeat mode QUEUE', () => {
      it('decrements index within bounds', () => {
        expect(getPreviousTrackIndex(2, 3, 'QUEUE')).toBe(1);
      });

      it('wraps to last track when at index 0', () => {
        expect(getPreviousTrackIndex(0, 3, 'QUEUE')).toBe(2);
      });
    });
  });

  describe('shuffleQueue', () => {
    it('does not mutate the original queue array', () => {
      const files = [
        createMockFile('f-1', 'A.mp3'),
        createMockFile('f-2', 'B.mp3'),
        createMockFile('f-3', 'C.mp3'),
      ];
      const { queue } = buildAudioQueue(files);
      const originalIds = queue.map((t) => t.id);

      const shuffled = shuffleQueue(queue);

      expect(queue.map((t) => t.id)).toEqual(originalIds);
      expect(shuffled).toHaveLength(3);
      expect(shuffled).not.toBe(queue);
    });

    it('safely handles empty and 1-item queues', () => {
      expect(shuffleQueue([])).toEqual([]);

      const single = [mapMediaFileToTrack(createMockFile('f-1', 'Single.mp3'))];
      const shuffledSingle = shuffleQueue(single);
      expect(shuffledSingle).toHaveLength(1);
      expect(shuffledSingle[0].id).toBe('f-1');
    });

    it('preserves the active track at index 0 when currentTrackId is specified', () => {
      const files = [
        createMockFile('t-1', 'First.mp3'),
        createMockFile('t-2', 'Second.mp3'),
        createMockFile('t-3', 'Third.mp3'),
        createMockFile('t-4', 'Fourth.mp3'),
      ];
      const { queue } = buildAudioQueue(files);

      const shuffled = shuffleQueue(queue, 't-3');

      expect(shuffled[0].id).toBe('t-3');
      expect(shuffled).toHaveLength(4);
      // Ensure all 4 unique tracks are present
      const ids = new Set(shuffled.map((t) => t.id));
      expect(ids.size).toBe(4);
      expect(ids.has('t-1')).toBe(true);
      expect(ids.has('t-2')).toBe(true);
      expect(ids.has('t-3')).toBe(true);
      expect(ids.has('t-4')).toBe(true);
    });
  });

  describe('findTrackIndexById', () => {
    it('locates track by stable id rather than filename', () => {
      const files = [
        createMockFile('id-alpha', 'DuplicateName.mp3'),
        createMockFile('id-beta', 'DuplicateName.mp3'),
      ];
      const { queue } = buildAudioQueue(files);

      expect(findTrackIndexById(queue, 'id-beta')).toBe(1);
      expect(findTrackIndexById(queue, 'id-alpha')).toBe(0);
      expect(findTrackIndexById(queue, 'id-unknown')).toBe(-1);
    });
  });
});
