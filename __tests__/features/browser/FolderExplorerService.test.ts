import { mediaRepository, MediaRepository } from '@core/storage/mediaRepository';
import type { FolderIndexRow, MediaCategory } from '@core/storage/types';
import { FolderExplorerService } from '@features/browser/services/FolderExplorerService';

describe('FolderExplorerService and Folder Query', () => {
  beforeEach(() => {
    (
      globalThis as { __sqliteMockState?: { reset: () => void } }
    ).__sqliteMockState?.reset();
  });

  const getExecutedQueries = (): Array<{
    query: string;
    params: Array<string | number | boolean | null>;
  }> => {
    return (
      (
        globalThis as {
          __sqliteMockState?: {
            executedQueries: Array<{
              query: string;
              params: Array<string | number | boolean | null>;
            }>;
          };
        }
      ).__sqliteMockState?.executedQueries ?? []
    );
  };

  const setMockQueryRows = (rows: Record<string, unknown>[]): void => {
    const mockState = (
      globalThis as {
        __sqliteMockState?: {
          rowsByQuery: Map<string, Record<string, unknown>[]>;
        };
      }
    ).__sqliteMockState;

    if (!mockState) return;

    // Set rows for the expected query patterns or clear
    mockState.rowsByQuery.clear();
    // Intercept with jest fn if custom rows needed
  };

  describe('MediaRepository.getFoldersByCategory', () => {
    it('queries folders_index for AUDIO category using parameterized SQL', async () => {
      await mediaRepository.getFoldersByCategory('AUDIO');

      const executed = getExecutedQueries();
      const lastQuery = executed.at(-1);

      expect(lastQuery).toBeDefined();
      expect(lastQuery?.query).toContain('FROM folders_index');
      expect(lastQuery?.query).not.toContain('FROM media_files');
      expect(lastQuery?.query).toContain('WHERE category = ?');
      expect(lastQuery?.params).toEqual(['AUDIO']);
    });

    it('queries folders_index for VIDEO category using parameterized SQL', async () => {
      await mediaRepository.getFoldersByCategory('VIDEO');

      const executed = getExecutedQueries();
      const lastQuery = executed.at(-1);

      expect(lastQuery).toBeDefined();
      expect(lastQuery?.query).toContain('FROM folders_index');
      expect(lastQuery?.query).toContain('WHERE category = ?');
      expect(lastQuery?.params).toEqual(['VIDEO']);
    });

    it('applies hideMessenger filter with parameterized clauses', async () => {
      await mediaRepository.getFoldersByCategory('AUDIO', { hideMessenger: true });

      const executed = getExecutedQueries();
      const lastQuery = executed.at(-1);

      expect(lastQuery?.query).toContain('folder_path NOT LIKE ? AND folder_path NOT LIKE ?');
      expect(lastQuery?.params).toEqual(['AUDIO', '%WhatsApp%', '%Telegram%']);
    });

    it('applies excludeHidden filter with parameterized clauses', async () => {
      await mediaRepository.getFoldersByCategory('PHOTO', { excludeHidden: true });

      const executed = getExecutedQueries();
      const lastQuery = executed.at(-1);

      expect(lastQuery?.query).toContain('is_excluded = ?');
      expect(lastQuery?.params).toEqual(['PHOTO', 0]);
    });

    it('supports sorting by name, date, size, and count with stable ordering', async () => {
      await mediaRepository.getFoldersByCategory('VIDEO', { sortBy: 'date', sortOrder: 'DESC' });
      let lastQuery = getExecutedQueries().at(-1);
      expect(lastQuery?.query).toContain('ORDER BY last_modified DESC, folder_name COLLATE NOCASE ASC');

      await mediaRepository.getFoldersByCategory('VIDEO', { sortBy: 'size', sortOrder: 'ASC' });
      lastQuery = getExecutedQueries().at(-1);
      expect(lastQuery?.query).toContain('ORDER BY total_size_bytes ASC, folder_name COLLATE NOCASE ASC');

      await mediaRepository.getFoldersByCategory('VIDEO', { sortBy: 'count', sortOrder: 'DESC' });
      lastQuery = getExecutedQueries().at(-1);
      expect(lastQuery?.query).toContain('ORDER BY item_count DESC, folder_name COLLATE NOCASE ASC');

      await mediaRepository.getFoldersByCategory('VIDEO', { sortBy: 'name', sortOrder: 'ASC' });
      lastQuery = getExecutedQueries().at(-1);
      expect(lastQuery?.query).toContain('ORDER BY folder_name COLLATE NOCASE ASC, folder_name COLLATE NOCASE ASC');
    });

    it('accepts boolean hideMessenger parameter for backward compatibility', async () => {
      await mediaRepository.getFoldersByCategory('PDF', true);

      const executed = getExecutedQueries();
      const lastQuery = executed.at(-1);

      expect(lastQuery?.query).toContain('folder_path NOT LIKE ? AND folder_path NOT LIKE ?');
      expect(lastQuery?.params).toEqual(['PDF', '%WhatsApp%', '%Telegram%']);
    });
  });

  describe('FolderExplorerService', () => {
    const mockAudioRows: FolderIndexRow[] = [
      {
        folder_path: '/storage/emulated/0/Music',
        folder_name: 'Music',
        category: 'AUDIO',
        item_count: 42,
        total_size_bytes: 12345678,
        thumbnail_uri: null,
        last_modified: 1700000000000,
        is_excluded: 0,
      },
      {
        folder_path: '/storage/emulated/0/WhatsApp/Media/WhatsApp Audio',
        folder_name: 'WhatsApp Audio',
        category: 'AUDIO',
        item_count: 15,
        total_size_bytes: 5432100,
        thumbnail_uri: null,
        last_modified: 1700000500000,
        is_excluded: 0,
      },
    ];

    const mockVideoRows: FolderIndexRow[] = [
      {
        folder_path: '/storage/emulated/0/Movies',
        folder_name: 'Movies',
        category: 'VIDEO',
        item_count: 8,
        total_size_bytes: 987654321,
        thumbnail_uri: '/storage/emulated/0/Movies/sample.mp4',
        last_modified: 1700001000000,
        is_excluded: 0,
      },
      {
        folder_path: '/storage/emulated/0/Telegram/Telegram Video',
        folder_name: 'Telegram Video',
        category: 'VIDEO',
        item_count: 5,
        total_size_bytes: 456789000,
        thumbnail_uri: '/storage/emulated/0/Telegram/Telegram Video/clip.mp4',
        last_modified: 1700002000000,
        is_excluded: 0,
      },
    ];

    it('retrieves and maps AUDIO folders to FolderItemViewModel', async () => {
      const mockRepo = {
        getFoldersByCategory: jest.fn(async (_category: MediaCategory) => mockAudioRows),
      } as unknown as MediaRepository;

      const service = new FolderExplorerService({ mediaRepository: mockRepo });
      const folders = await service.getFolders('AUDIO');

      expect(mockRepo.getFoldersByCategory).toHaveBeenCalledWith('AUDIO', {
        hideMessenger: undefined,
        excludeHidden: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });

      expect(folders).toHaveLength(2);

      // Non-messenger folder
      expect(folders[0]).toEqual({
        id: 'AUDIO:/storage/emulated/0/Music',
        folderPath: '/storage/emulated/0/Music',
        folderName: 'Music',
        category: 'AUDIO',
        itemCount: 42,
        totalSizeBytes: 12345678,
        thumbnailUri: null,
        lastModified: 1700000000000,
        isExcluded: false,
        isMessengerFolder: false,
        hasUnfinishedResume: false,
      });

      // Messenger folder correctly identified by path
      expect(folders[1].isMessengerFolder).toBe(true);
      expect(folders[1].folderName).toBe('WhatsApp Audio');
    });

    it('retrieves and maps VIDEO folders including thumbnails', async () => {
      const mockRepo = {
        getFoldersByCategory: jest.fn(async (_category: MediaCategory) => mockVideoRows),
      } as unknown as MediaRepository;

      const service = new FolderExplorerService({ mediaRepository: mockRepo });
      const folders = await service.getFolders('VIDEO');

      expect(folders).toHaveLength(2);
      expect(folders[0].category).toBe('VIDEO');
      expect(folders[0].thumbnailUri).toBe('/storage/emulated/0/Movies/sample.mp4');
      expect(folders[0].isMessengerFolder).toBe(false);

      expect(folders[1].isMessengerFolder).toBe(true);
      expect(folders[1].thumbnailUri).toBe('/storage/emulated/0/Telegram/Telegram Video/clip.mp4');
    });

    it('passes options through to the repository', async () => {
      const mockRepo = {
        getFoldersByCategory: jest.fn(async () => []),
      } as unknown as MediaRepository;

      const service = new FolderExplorerService({ mediaRepository: mockRepo });
      await service.getFolders('VIDEO', {
        hideMessenger: true,
        excludeHidden: true,
        sortBy: 'size',
        sortOrder: 'DESC',
      });

      expect(mockRepo.getFoldersByCategory).toHaveBeenCalledWith('VIDEO', {
        hideMessenger: true,
        excludeHidden: true,
        sortBy: 'size',
        sortOrder: 'DESC',
      });
    });

    it('maps isExcluded = 1 to isExcluded = true', () => {
      const service = new FolderExplorerService();
      const vm = service.mapRowToViewModel({
        folder_path: '/storage/emulated/0/.hidden_folder',
        folder_name: '.hidden_folder',
        category: 'PHOTO',
        item_count: 3,
        total_size_bytes: 300,
        thumbnail_uri: null,
        last_modified: 100,
        is_excluded: 1,
      });

      expect(vm.isExcluded).toBe(true);
    });
  });
});
