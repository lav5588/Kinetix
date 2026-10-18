import {
  FileRepository,
  fileRepository,
  sanitizeFts5Query,
} from '@core/storage/repositories/FileRepository';
import type { MediaFileRow } from '@core/storage/types';

describe('Task 8 Subtask 3: FileRepository & FTS5 Search Queries', () => {
  beforeEach(() => {
    (globalThis as { __sqliteMockState?: { reset: () => void } }).__sqliteMockState?.reset();
  });

  const getExecutedQueries = (): Array<{ query: string; params: unknown[] }> =>
    (
      (
        globalThis as {
          __sqliteMockState?: {
            executedQueries: Array<{ query: string; params: unknown[] }>;
          };
        }
      ).__sqliteMockState?.executedQueries ?? []
    ).filter((q) => !q.query.startsWith('PRAGMA'));


  const setMockQueryResult = (querySnippet: string, rows: Partial<MediaFileRow>[]) => {
    const sqliteMockState = (
      globalThis as {
        __sqliteMockState?: {
          rowsByQuery: Map<string, unknown[]>;
        };
      }
    ).__sqliteMockState;

    // In the mock, we can set default rows or check params
    return sqliteMockState;
  };

  describe('sanitizeFts5Query', () => {
    it('formats normal single word with prefix matching', () => {
      expect(sanitizeFts5Query('interstellar')).toBe('"interstellar"*');
      expect(sanitizeFts5Query('music')).toBe('"music"*');
    });

    it('formats multiple words into separate prefix match tokens', () => {
      expect(sanitizeFts5Query('taylor swift')).toBe('"taylor"* "swift"*');
    });

    it('safely handles brackets such as [1080p]', () => {
      expect(sanitizeFts5Query('[1080p]')).toBe('"1080p"*');
      expect(sanitizeFts5Query('Movie [1080p] BluRay')).toBe(
        '"Movie"* "1080p"* "BluRay"*',
      );
    });

    it('safely handles apostrophes', () => {
      expect(sanitizeFts5Query("don't")).toBe('"don"* "t"*');
      expect(sanitizeFts5Query("rock'n'roll")).toBe('"rock"* "n"* "roll"*');
    });

    it('safely handles hyphens (which act as NOT in FTS5)', () => {
      expect(sanitizeFts5Query('spider-man')).toBe('"spider"* "man"*');
      expect(sanitizeFts5Query('hip-hop')).toBe('"hip"* "hop"*');
    });

    it('returns empty string for empty or whitespace-only queries', () => {
      expect(sanitizeFts5Query('')).toBe('');
      expect(sanitizeFts5Query('   ')).toBe('');
      expect(sanitizeFts5Query(null as unknown as string)).toBe('');
      expect(sanitizeFts5Query(undefined as unknown as string)).toBe('');
    });

    it('returns empty string for malformed input with only special characters', () => {
      expect(sanitizeFts5Query('[[[***---:::;;;')).toBe('');
      expect(sanitizeFts5Query('""""\'\'\'')).toBe('');
      expect(sanitizeFts5Query('@#$%^&*()_+')).toBe('');
    });

    it('safely preserves FTS operators as quoted literal tokens', () => {
      // AND / OR / NOT inside quotes are treated as tokens rather than syntax operators
      expect(sanitizeFts5Query('AND OR NOT')).toBe('"AND"* "OR"* "NOT"*');
    });
  });

  describe('FileRepository.getFilesByFolder', () => {
    it('scopes strictly to the requested folderPath using parameterized query', async () => {
      const repo = new FileRepository();
      await repo.getFilesByFolder({
        folderPath: '/storage/emulated/0/Music',
        category: 'AUDIO',
      });

      const queries = getExecutedQueries();
      expect(queries).toHaveLength(1);

      const lastQuery = queries[0];
      expect(lastQuery.query).toContain('WHERE folder_path = ? AND category = ?');
      expect(lastQuery.params).toEqual(['/storage/emulated/0/Music', 'AUDIO']);
      // Verify raw folder path was not concatenated directly
      expect(lastQuery.query).not.toContain('/storage/emulated/0/Music');
    });

    it('extracts folderPath and category from folderId when folderPath is omitted', async () => {
      const repo = new FileRepository();
      await repo.getFilesByFolder({
        folderId: 'VIDEO:/storage/emulated/0/Movies',
      });

      const queries = getExecutedQueries();
      expect(queries).toHaveLength(1);

      const lastQuery = queries[0];
      expect(lastQuery.params).toEqual(['/storage/emulated/0/Movies', 'VIDEO']);
    });

    it('applies hideShortAudio filter for AUDIO category', async () => {
      const repo = new FileRepository();
      await repo.getFilesByFolder({
        folderPath: '/storage/emulated/0/Music',
        category: 'AUDIO',
        hideShortAudio: true,
      });

      const queries = getExecutedQueries();
      const lastQuery = queries[0];
      expect(lastQuery.query).toContain('COALESCE(duration_ms, 0) >= ?');
      expect(lastQuery.params).toContain(30000);
    });

    it('applies hideHiddenFiles filter', async () => {
      const repo = new FileRepository();
      await repo.getFilesByFolder({
        folderPath: '/storage/emulated/0/Pictures',
        category: 'PHOTO',
        hideHiddenFiles: true,
      });

      const queries = getExecutedQueries();
      const lastQuery = queries[0];
      expect(lastQuery.query).toContain('is_hidden = ?');
      expect(lastQuery.params).toContain(0);
    });

    it('applies sortField and sortOrder', async () => {
      const repo = new FileRepository();
      await repo.getFilesByFolder({
        folderPath: '/storage/emulated/0/Downloads',
        sortField: 'size',
        sortOrder: 'DESC',
      });

      const queries = getExecutedQueries();
      const lastQuery = queries[0];
      expect(lastQuery.query).toContain('ORDER BY size_bytes DESC');
    });

    it('returns empty array immediately if folderPath and folderId are empty', async () => {
      const repo = new FileRepository();
      const result = await repo.getFilesByFolder({});

      expect(result).toEqual([]);
      expect(getExecutedQueries()).toHaveLength(0);
    });
  });

  describe('FileRepository.searchFilesFts', () => {
    it('executes parameterized FTS query with sanitized terms', async () => {
      const repo = new FileRepository();
      await repo.searchFilesFts({
        query: 'interstellar',
        category: 'VIDEO',
        limit: 30,
      });

      const queries = getExecutedQueries();
      expect(queries).toHaveLength(1);

      const lastQuery = queries[0];
      expect(lastQuery.query).toContain('FROM media_files_fts AS fts');
      expect(lastQuery.query).toContain('JOIN media_files AS m ON fts.id = m.id');
      expect(lastQuery.query).toContain('media_files_fts MATCH ?');
      expect(lastQuery.query).toContain('m.category = ?');

      // Verify parameterization
      expect(lastQuery.params[0]).toBe('"interstellar"*');
      expect(lastQuery.params[1]).toBe('VIDEO');
      expect(lastQuery.params[2]).toBe(30);

      // Verify raw query text was NOT concatenated directly into SQL
      expect(lastQuery.query).not.toContain('interstellar');
    });

    it('constrains search results to the selected folder when folderPath is supplied', async () => {
      const repo = new FileRepository();
      await repo.searchFilesFts({
        query: 'concert',
        folderPath: '/storage/emulated/0/Music/Live',
        category: 'AUDIO',
      });

      const queries = getExecutedQueries();
      const lastQuery = queries[0];
      expect(lastQuery.query).toContain('m.folder_path = ?');
      expect(lastQuery.params).toContain('/storage/emulated/0/Music/Live');
      expect(lastQuery.query).not.toContain('/storage/emulated/0/Music/Live');
    });

    it('constrains search results when folderId is supplied', async () => {
      const repo = new FileRepository();
      await repo.searchFilesFts({
        query: 'document',
        folderId: 'PDF:/storage/emulated/0/Documents',
      });

      const queries = getExecutedQueries();
      const lastQuery = queries[0];
      expect(lastQuery.query).toContain('m.folder_path = ?');
      expect(lastQuery.params).toContain('/storage/emulated/0/Documents');
      expect(lastQuery.params).toContain('PDF');
    });

    it('handles [1080p] search without syntax errors or raw injection', async () => {
      const repo = new FileRepository();
      await repo.searchFilesFts({
        query: 'Action [1080p]',
        category: 'VIDEO',
      });

      const queries = getExecutedQueries();
      const lastQuery = queries[0];
      expect(lastQuery.params[0]).toBe('"Action"* "1080p"*');
      expect(lastQuery.query).not.toContain('[1080p]');
    });

    it('handles apostrophes and hyphens safely', async () => {
      const repo = new FileRepository();
      await repo.searchFilesFts({
        query: "rock'n'roll spider-man",
      });

      const queries = getExecutedQueries();
      const lastQuery = queries[0];
      expect(lastQuery.params[0]).toBe(
        '"rock"* "n"* "roll"* "spider"* "man"*',
      );
    });

    it('returns empty array without executing SQL for empty or whitespace query', async () => {
      const repo = new FileRepository();
      const resultEmpty = await repo.searchFilesFts({ query: '' });
      const resultSpaces = await repo.searchFilesFts({ query: '   ' });

      expect(resultEmpty).toEqual([]);
      expect(resultSpaces).toEqual([]);
      expect(getExecutedQueries()).toHaveLength(0);
    });

    it('returns empty array without executing SQL for malformed query with only punctuation', async () => {
      const repo = new FileRepository();
      const resultMalformed = await repo.searchFilesFts({
        query: '[[[***---:::;;;"""',
      });

      expect(resultMalformed).toEqual([]);
      expect(getExecutedQueries()).toHaveLength(0);
    });

    it('clamps limit between 1 and 200', async () => {
      const repo = new FileRepository();
      await repo.searchFilesFts({ query: 'test', limit: 500 });
      let lastQuery = getExecutedQueries().at(-1);
      expect(lastQuery?.params.at(-1)).toBe(200);

      await repo.searchFilesFts({ query: 'test', limit: -10 });
      lastQuery = getExecutedQueries().at(-1);
      expect(lastQuery?.params.at(-1)).toBe(1);
    });

    it('provides a singleton instance fileRepository', () => {
      expect(fileRepository).toBeInstanceOf(FileRepository);
    });
  });

  describe('FileRepository.getFileById and getFileByPath', () => {
    it('executes parameterized query for getFileById', async () => {
      const repo = new FileRepository();
      await repo.getFileById('file-123');

      const queries = getExecutedQueries();
      expect(queries).toHaveLength(1);
      expect(queries[0].query).toContain('WHERE id = ? LIMIT 1');
      expect(queries[0].params).toEqual(['file-123']);
    });

    it('executes parameterized query for getFileByPath', async () => {
      const repo = new FileRepository();
      await repo.getFileByPath('/storage/emulated/0/file.mp3');

      const queries = getExecutedQueries();
      expect(queries).toHaveLength(1);
      expect(queries[0].query).toContain('WHERE file_path = ? LIMIT 1');
      expect(queries[0].params).toEqual(['/storage/emulated/0/file.mp3']);
    });
  });
});
