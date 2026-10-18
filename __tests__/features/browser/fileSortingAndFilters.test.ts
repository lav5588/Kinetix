import {
  compareFiles,
  sortFiles,
  SortableFile,
} from '@features/browser/utils/fileSorting';
import {
  filterFiles,
  isFileLarge,
  isFileFavorite,
  isFileInProgress,
  isFileUnwatched,
  calculateResumeProgress,
  LARGE_FILE_THRESHOLD_BYTES,
  FilterableFile,
} from '@features/browser/utils/fileFilters';
import type { ResumeRecord } from '@core/storage/types';
import type { FileQuickFilter, FileSortDirection, FileSortField } from '@features/browser/types';

describe('Task 8 Subtask 2: File Sorting & Filter Utilities', () => {
  // 20+ representative mock files with diverse fields, missing values, ties, and edge cases
  const createMockFiles = (): FilterableFile[] => [
    { id: 'file-01', fileName: 'Acoustic Song.mp3', sizeBytes: 5 * 1024 * 1024, dateModified: 1000, durationMs: 180000, isFavorite: false },
    { id: 'file-02', fileName: 'Beethoven 5th.flac', sizeBytes: 45 * 1024 * 1024, dateModified: 5000, durationMs: 420000, isFavorite: true },
    { id: 'file-03', fileName: 'Camera Shot 01.jpg', sizeBytes: 2 * 1024 * 1024, dateModified: 3000, durationMs: null, isFavorite: false },
    { id: 'file-04', fileName: 'Document Alpha.pdf', sizeBytes: 15 * 1024 * 1024, dateModified: 8000, durationMs: 0, isFavorite: false },
    { id: 'file-05', fileName: 'Epic Movie 4K.mp4', sizeBytes: 250 * 1024 * 1024, dateModified: 9000, durationMs: 7200000, isFavorite: true },
    { id: 'file-06', fileName: 'Family Vacation.mp4', sizeBytes: 100 * 1024 * 1024, dateModified: 4000, durationMs: 600000, isFavorite: false }, // exactly 100 MB
    { id: 'file-07', fileName: 'Guitar Solo.wav', sizeBytes: 60 * 1024 * 1024, dateModified: 2000, durationMs: 120000, isFavorite: false },
    { id: 'file-08', fileName: 'High Res Scan.png', sizeBytes: 12 * 1024 * 1024, dateModified: null, durationMs: null, isFavorite: true }, // missing date and duration
    { id: 'file-09', fileName: 'Interview Audio.m4a', sizeBytes: 30 * 1024 * 1024, dateModified: 6000, durationMs: 3600000, isFavorite: false },
    { id: 'file-10', fileName: 'Jazz Trio.mp3', sizeBytes: 8 * 1024 * 1024, dateModified: 7000, durationMs: 240000, isFavorite: false },
    { id: 'file-11', fileName: 'Kinetix Demo.mp4', sizeBytes: 100 * 1024 * 1024 + 1, dateModified: 9500, durationMs: 90000, isFavorite: true }, // 100 MB + 1 byte
    { id: 'file-12', fileName: 'Live Concert.mkv', sizeBytes: 1500 * 1024 * 1024, dateModified: 11000, durationMs: 5400000, isFavorite: false },
    { id: 'file-13', fileName: 'Mountain View.raw', sizeBytes: 80 * 1024 * 1024, dateModified: 1500, durationMs: null, isFavorite: false },
    { id: 'file-14', fileName: 'Night Sky.jpg', sizeBytes: 4 * 1024 * 1024, dateModified: 3000, durationMs: null, isFavorite: false }, // same date as file-03
    { id: 'file-15', fileName: 'Opera Act 1.opus', sizeBytes: 25 * 1024 * 1024, dateModified: 4500, durationMs: 1800000, isFavorite: true },
    { id: 'file-16', fileName: 'Piano Concerto.flac', sizeBytes: 60 * 1024 * 1024, dateModified: 5000, durationMs: 180000, isFavorite: false }, // same size as file-07, same date as file-02
    { id: 'file-17', fileName: 'Quantum Physics.pdf', sizeBytes: null, dateModified: 2500, durationMs: null, isFavorite: false }, // missing size
    { id: 'file-18', fileName: 'Rock Anthem.mp3', sizeBytes: 7 * 1024 * 1024, dateModified: 10000, durationMs: 210000, isFavorite: true },
    { id: 'file-19', fileName: 'Sound Effect.wav', sizeBytes: 500 * 1024, dateModified: 500, durationMs: 5000, isFavorite: false },
    { id: 'file-20', fileName: 'Tutorial Walkthrough.mp4', sizeBytes: 85 * 1024 * 1024, dateModified: 8500, durationMs: 1200000, isFavorite: false },
    { id: 'file-21', fileName: 'Zebra Safari.mp4', sizeBytes: 90 * 1024 * 1024, dateModified: 12000, durationMs: 300000, isFavorite: false },
  ];

  describe('fileSorting utilities', () => {
    let mockFiles: FilterableFile[];

    beforeEach(() => {
      mockFiles = createMockFiles();
    });

    it('has at least 20 mock files for testing', () => {
      expect(mockFiles.length).toBeGreaterThanOrEqual(20);
    });

    describe('NAME sorting', () => {
      it('sorts files by NAME ASC (A-Z) deterministically', () => {
        const sorted = sortFiles(mockFiles, 'NAME', 'ASC');
        expect(sorted[0].fileName).toBe('Acoustic Song.mp3');
        expect(sorted[sorted.length - 1].fileName).toBe('Zebra Safari.mp4');

        // Check monotonicity
        for (let i = 0; i < sorted.length - 1; i++) {
          const cmp = (sorted[i].fileName ?? '').localeCompare(sorted[i + 1].fileName ?? '', undefined, {
            sensitivity: 'base',
            numeric: true,
          });
          expect(cmp).toBeLessThanOrEqual(0);
        }
      });

      it('sorts files by NAME DESC (Z-A) deterministically', () => {
        const sorted = sortFiles(mockFiles, 'NAME', 'DESC');
        expect(sorted[0].fileName).toBe('Zebra Safari.mp4');
        expect(sorted[sorted.length - 1].fileName).toBe('Acoustic Song.mp3');

        for (let i = 0; i < sorted.length - 1; i++) {
          const cmp = (sorted[i].fileName ?? '').localeCompare(sorted[i + 1].fileName ?? '', undefined, {
            sensitivity: 'base',
            numeric: true,
          });
          expect(cmp).toBeGreaterThanOrEqual(0);
        }
      });

      it('breaks ties deterministically on ID when filenames are equal', () => {
        const fileA = { id: 'id-1', fileName: 'Duplicate.mp3' };
        const fileB = { id: 'id-2', fileName: 'Duplicate.mp3' };

        const asc = sortFiles([fileB, fileA], 'NAME', 'ASC');
        expect(asc.map((f) => f.id)).toEqual(['id-1', 'id-2']);

        const desc = sortFiles([fileB, fileA], 'NAME', 'DESC');
        expect(desc.map((f) => f.id)).toEqual(['id-1', 'id-2']);
      });
    });

    describe('DATE sorting', () => {
      it('sorts files by DATE ASC (oldest first, missing dates treated as 0)', () => {
        const sorted = sortFiles(mockFiles, 'DATE', 'ASC');
        // file-08 has dateModified: null (treated as 0)
        expect(sorted[0].id).toBe('file-08');
        expect(sorted[1].id).toBe('file-19'); // dateModified: 500
        expect(sorted[sorted.length - 1].id).toBe('file-21'); // dateModified: 12000
      });

      it('sorts files by DATE DESC (newest first)', () => {
        const sorted = sortFiles(mockFiles, 'DATE', 'DESC');
        expect(sorted[0].id).toBe('file-21'); // dateModified: 12000
        expect(sorted[1].id).toBe('file-12'); // dateModified: 11000
        expect(sorted[sorted.length - 1].id).toBe('file-08'); // dateModified: null (0)
      });

      it('breaks equal date ties alphabetically by file name', () => {
        // file-03 and file-14 both have dateModified: 3000
        // 'Camera Shot 01.jpg' vs 'Night Sky.jpg'
        const sortedAsc = sortFiles(mockFiles, 'DATE', 'ASC');
        const cameraIdxAsc = sortedAsc.findIndex((f) => f.id === 'file-03');
        const nightIdxAsc = sortedAsc.findIndex((f) => f.id === 'file-14');
        expect(cameraIdxAsc).toBeLessThan(nightIdxAsc);

        const sortedDesc = sortFiles(mockFiles, 'DATE', 'DESC');
        const cameraIdxDesc = sortedDesc.findIndex((f) => f.id === 'file-03');
        const nightIdxDesc = sortedDesc.findIndex((f) => f.id === 'file-14');
        expect(cameraIdxDesc).toBeLessThan(nightIdxDesc);
      });
    });

    describe('SIZE sorting', () => {
      it('sorts files by SIZE ASC (smallest first, missing size treated as 0)', () => {
        const sorted = sortFiles(mockFiles, 'SIZE', 'ASC');
        // file-17 has sizeBytes: null (0)
        expect(sorted[0].id).toBe('file-17');
        expect(sorted[1].id).toBe('file-19'); // 500 KB
        expect(sorted[sorted.length - 1].id).toBe('file-12'); // 1500 MB
      });

      it('sorts files by SIZE DESC (largest first)', () => {
        const sorted = sortFiles(mockFiles, 'SIZE', 'DESC');
        expect(sorted[0].id).toBe('file-12'); // 1500 MB
        expect(sorted[1].id).toBe('file-05'); // 250 MB
        expect(sorted[sorted.length - 1].id).toBe('file-17'); // null (0)
      });

      it('breaks equal size ties alphabetically by file name', () => {
        // file-07 (Guitar Solo.wav, 60MB) and file-16 (Piano Concerto.flac, 60MB)
        const sortedAsc = sortFiles(mockFiles, 'SIZE', 'ASC');
        const guitarIdxAsc = sortedAsc.findIndex((f) => f.id === 'file-07');
        const pianoIdxAsc = sortedAsc.findIndex((f) => f.id === 'file-16');
        expect(guitarIdxAsc).toBeLessThan(pianoIdxAsc);

        const sortedDesc = sortFiles(mockFiles, 'SIZE', 'DESC');
        const guitarIdxDesc = sortedDesc.findIndex((f) => f.id === 'file-07');
        const pianoIdxDesc = sortedDesc.findIndex((f) => f.id === 'file-16');
        expect(guitarIdxDesc).toBeLessThan(pianoIdxDesc);
      });
    });

    describe('DURATION sorting', () => {
      it('sorts files by DURATION ASC (shortest first, null treated as 0)', () => {
        const sorted = sortFiles(mockFiles, 'DURATION', 'ASC');
        // Items with null duration come first (treated as 0)
        expect(sorted[0].durationMs == null || sorted[0].durationMs === 0).toBe(true);
        expect(sorted[sorted.length - 1].id).toBe('file-05'); // 7200000 ms
      });

      it('sorts files by DURATION DESC (longest first)', () => {
        const sorted = sortFiles(mockFiles, 'DURATION', 'DESC');
        expect(sorted[0].id).toBe('file-05'); // 7200000 ms (2 hours)
        expect(sorted[1].id).toBe('file-12'); // 5400000 ms (1.5 hours)
        // Null / 0 duration at the end
        const last = sorted[sorted.length - 1];
        expect(last.durationMs == null || last.durationMs === 0).toBe(true);
      });

      it('breaks equal duration ties alphabetically by file name', () => {
        // file-01 (Acoustic Song.mp3, 180000ms) and file-16 (Piano Concerto.flac, 180000ms)
        const sortedAsc = sortFiles(mockFiles, 'DURATION', 'ASC');
        const acousticIdx = sortedAsc.findIndex((f) => f.id === 'file-01');
        const pianoIdx = sortedAsc.findIndex((f) => f.id === 'file-16');
        expect(acousticIdx).toBeLessThan(pianoIdx);
      });
    });

    it('does not mutate the original array and returns a new array', () => {
      const originalCopy = [...mockFiles];
      const result = sortFiles(mockFiles, 'NAME', 'ASC');

      expect(result).not.toBe(mockFiles);
      expect(mockFiles).toEqual(originalCopy);
    });

    it('produces deterministic output across multiple repeated sorts', () => {
      const run1 = sortFiles(mockFiles, 'DATE', 'DESC');
      const run2 = sortFiles(mockFiles, 'DATE', 'DESC');

      expect(run1.map((f) => f.id)).toEqual(run2.map((f) => f.id));
    });

    it('handles empty and single-item arrays gracefully', () => {
      expect(sortFiles([], 'NAME', 'ASC')).toEqual([]);
      const single = [mockFiles[0]];
      const sortedSingle = sortFiles(single, 'NAME', 'ASC');
      expect(sortedSingle).toEqual(single);
      expect(sortedSingle).not.toBe(single);
    });

    it('supports database row naming conventions (file_name, size_bytes, date_modified, duration_ms)', () => {
      const dbRows = [
        { id: '1', file_name: 'B.mp3', size_bytes: 200, date_modified: 100, duration_ms: 50 },
        { id: '2', file_name: 'A.mp3', size_bytes: 100, date_modified: 200, duration_ms: 100 },
      ];

      const byName = sortFiles(dbRows, 'NAME', 'ASC');
      expect(byName.map((r) => r.file_name)).toEqual(['A.mp3', 'B.mp3']);

      const bySize = sortFiles(dbRows, 'SIZE', 'ASC');
      expect(bySize.map((r) => r.file_name)).toEqual(['A.mp3', 'B.mp3']);

      const byDate = sortFiles(dbRows, 'DATE', 'ASC');
      expect(byDate.map((r) => r.file_name)).toEqual(['B.mp3', 'A.mp3']);

      const byDur = sortFiles(dbRows, 'DURATION', 'DESC');
      expect(byDur.map((r) => r.file_name)).toEqual(['A.mp3', 'B.mp3']);
    });
  });

  describe('fileFilters utilities', () => {
    describe('calculateResumeProgress', () => {
      it('calculates 50% for position 30,000 ms and duration 60,000 ms', () => {
        expect(calculateResumeProgress(30000, 60000)).toBe(50);
      });

      it('returns 0 for 0 position or missing/nullish values', () => {
        expect(calculateResumeProgress(0, 60000)).toBe(0);
        expect(calculateResumeProgress(null, 60000)).toBe(0);
        expect(calculateResumeProgress(undefined, 60000)).toBe(0);
        expect(calculateResumeProgress(30000, null)).toBe(0);
        expect(calculateResumeProgress(30000, 0)).toBe(0);
        expect(calculateResumeProgress(-500, 60000)).toBe(0);
      });

      it('clamps progress to a maximum of 100%', () => {
        expect(calculateResumeProgress(70000, 60000)).toBe(100);
      });
    });

    describe('LARGE_FILES filter and boundary behavior', () => {
      it('has threshold set to exactly 100 MB in binary bytes (104,857,600)', () => {
        expect(LARGE_FILE_THRESHOLD_BYTES).toBe(100 * 1024 * 1024);
      });

      it('evaluates file size boundary: 100 MB - 1 byte is NOT large', () => {
        const file = { sizeBytes: 100 * 1024 * 1024 - 1 };
        expect(isFileLarge(file)).toBe(false);
      });

      it('evaluates file size boundary: exactly 100 MB is NOT large (must be greater than 100MB)', () => {
        const file = { sizeBytes: 100 * 1024 * 1024 };
        expect(isFileLarge(file)).toBe(false);
      });

      it('evaluates file size boundary: 100 MB + 1 byte IS large', () => {
        const file = { sizeBytes: 100 * 1024 * 1024 + 1 };
        expect(isFileLarge(file)).toBe(true);
      });

      it('identifies 250 MB file as large and 5 MB file as not large', () => {
        expect(isFileLarge({ sizeBytes: 250 * 1024 * 1024 })).toBe(true);
        expect(isFileLarge({ sizeBytes: 5 * 1024 * 1024 })).toBe(false);
      });
    });

    describe('FAVORITES filter', () => {
      it('identifies favorites from isFavorite boolean or is_favorite integer', () => {
        expect(isFileFavorite({ isFavorite: true })).toBe(true);
        expect(isFileFavorite({ is_favorite: 1 })).toBe(true);
        expect(isFileFavorite({ isFavorite: false })).toBe(false);
        expect(isFileFavorite({ is_favorite: 0 })).toBe(false);
      });

      it('matches favorites against an optional favoriteIds set', () => {
        const favoriteIds = new Set(['file-99']);
        expect(isFileFavorite({ id: 'file-99', isFavorite: false }, { favoriteIds })).toBe(true);
        expect(isFileFavorite({ id: 'file-01', isFavorite: false }, { favoriteIds })).toBe(false);
      });
    });

    describe('IN_PROGRESS filter', () => {
      it('identifies in-progress file when resume record exists and progress is < 97%', () => {
        const resumeRecord: ResumeRecord = {
          filePath: '/storage/music/song.mp3',
          fileName: 'song.mp3',
          category: 'audio',
          lastOpenedAt: Date.now(),
          positionMs: 30000,
          durationMs: 60000,
          isCompleted: false,
        };

        const file = { filePath: '/storage/music/song.mp3' };
        const options = { getResumeRecord: () => resumeRecord };

        expect(isFileInProgress(file, options)).toBe(true);
      });

      it('excludes completed files or files with >= 97% progress', () => {
        const completedRecord: ResumeRecord = {
          filePath: '/storage/music/song.mp3',
          fileName: 'song.mp3',
          category: 'audio',
          lastOpenedAt: Date.now(),
          positionMs: 59000,
          durationMs: 60000, // 98.3%
          isCompleted: true,
        };

        const file = { filePath: '/storage/music/song.mp3' };
        expect(isFileInProgress(file, { getResumeRecord: () => completedRecord })).toBe(false);
      });

      it('excludes files at 0 position', () => {
        const unplayedRecord: ResumeRecord = {
          filePath: '/storage/music/song.mp3',
          fileName: 'song.mp3',
          category: 'audio',
          lastOpenedAt: Date.now(),
          positionMs: 0,
          durationMs: 60000,
        };

        const file = { filePath: '/storage/music/song.mp3' };
        expect(isFileInProgress(file, { getResumeRecord: () => unplayedRecord })).toBe(false);
      });
    });

    describe('UNWATCHED filter', () => {
      it('identifies file as unwatched when no resume record exists', () => {
        const file = { filePath: '/storage/music/new.mp3' };
        expect(isFileUnwatched(file, { getResumeRecord: () => null })).toBe(true);
      });

      it('identifies file as unwatched when resume position is 0 and not completed', () => {
        const record: ResumeRecord = {
          filePath: '/storage/music/new.mp3',
          fileName: 'new.mp3',
          category: 'audio',
          lastOpenedAt: Date.now(),
          positionMs: 0,
          durationMs: 60000,
          isCompleted: false,
        };

        const file = { filePath: '/storage/music/new.mp3' };
        expect(isFileUnwatched(file, { getResumeRecord: () => record })).toBe(true);
      });

      it('excludes in-progress files from unwatched', () => {
        const record: ResumeRecord = {
          filePath: '/storage/music/in_progress.mp3',
          fileName: 'in_progress.mp3',
          category: 'audio',
          lastOpenedAt: Date.now(),
          positionMs: 15000,
          durationMs: 60000,
        };

        const file = { filePath: '/storage/music/in_progress.mp3' };
        expect(isFileUnwatched(file, { getResumeRecord: () => record })).toBe(false);
      });

      it('excludes completed files from unwatched', () => {
        const record: ResumeRecord = {
          filePath: '/storage/music/done.mp3',
          fileName: 'done.mp3',
          category: 'audio',
          lastOpenedAt: Date.now(),
          positionMs: 0,
          durationMs: 60000,
          isCompleted: true,
        };

        const file = { filePath: '/storage/music/done.mp3' };
        expect(isFileUnwatched(file, { getResumeRecord: () => record })).toBe(false);
      });
    });

    describe('filterFiles full function with 5 quick filters', () => {
      const resumeMap = new Map<string, ResumeRecord>([
        [
          '/storage/audio/in_prog.mp3',
          {
            filePath: '/storage/audio/in_prog.mp3',
            fileName: 'in_prog.mp3',
            category: 'audio',
            lastOpenedAt: 1000,
            positionMs: 30000,
            durationMs: 60000,
            isCompleted: false,
          },
        ],
        [
          '/storage/audio/finished.mp3',
          {
            filePath: '/storage/audio/finished.mp3',
            fileName: 'finished.mp3',
            category: 'audio',
            lastOpenedAt: 2000,
            positionMs: 60000,
            durationMs: 60000,
            isCompleted: true,
          },
        ],
      ]);

      const testItems: FilterableFile[] = [
        { id: '1', filePath: '/storage/audio/in_prog.mp3', fileName: 'In Progress Track.mp3', sizeBytes: 10 * 1024 * 1024, isFavorite: false },
        { id: '2', filePath: '/storage/audio/finished.mp3', fileName: 'Finished Track.mp3', sizeBytes: 15 * 1024 * 1024, isFavorite: true },
        { id: '3', filePath: '/storage/audio/unwatched.mp3', fileName: 'Unwatched Track.mp3', sizeBytes: 8 * 1024 * 1024, isFavorite: false },
        { id: '4', filePath: '/storage/audio/huge.mp4', fileName: 'Huge Video.mp4', sizeBytes: 150 * 1024 * 1024, isFavorite: true },
        { id: '5', filePath: '/storage/audio/boundary.mp4', fileName: 'Boundary File.mp4', sizeBytes: 100 * 1024 * 1024, isFavorite: false },
      ];

      it('returns all files with quickFilter = ALL or undefined', () => {
        expect(filterFiles(testItems, { quickFilter: 'ALL' })).toHaveLength(5);
        expect(filterFiles(testItems)).toHaveLength(5);
      });

      it('returns only in-progress files with quickFilter = IN_PROGRESS', () => {
        const inProgress = filterFiles(testItems, {
          quickFilter: 'IN_PROGRESS',
          resumeRecordsMap: resumeMap,
        });

        expect(inProgress).toHaveLength(1);
        expect(inProgress[0].id).toBe('1');
      });

      it('returns only unwatched files with quickFilter = UNWATCHED', () => {
        const unwatched = filterFiles(testItems, {
          quickFilter: 'UNWATCHED',
          resumeRecordsMap: resumeMap,
        });

        // id 3, 4, 5 have no resume history -> unwatched
        expect(unwatched.map((f) => f.id)).toEqual(['3', '4', '5']);
      });

      it('returns only favorites with quickFilter = FAVORITES', () => {
        const favorites = filterFiles(testItems, { quickFilter: 'FAVORITES' });
        expect(favorites.map((f) => f.id)).toEqual(['2', '4']);
      });

      it('returns only files > 100 MB with quickFilter = LARGE_FILES', () => {
        const large = filterFiles(testItems, { quickFilter: 'LARGE_FILES' });
        // id 4 is 150 MB (> 100MB). id 5 is exactly 100 MB (not > 100MB).
        expect(large.map((f) => f.id)).toEqual(['4']);
      });

      it('supports combined search query filtering with quick filters', () => {
        const result = filterFiles(testItems, {
          quickFilter: 'ALL',
          searchQuery: 'Track',
        });
        expect(result.map((f) => f.id)).toEqual(['1', '2', '3']);
      });

      it('does not mutate the original files array', () => {
        const copy = [...testItems];
        filterFiles(testItems, { quickFilter: 'FAVORITES' });
        expect(testItems).toEqual(copy);
      });
    });
  });
});
