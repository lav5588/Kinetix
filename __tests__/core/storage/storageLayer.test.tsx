import { render, screen, waitFor } from '@testing-library/react-native';
import App from '@app';
import { initializeDatabaseSchema, mediaRepository, resumeManager, resumeStorage } from '@core/storage';

describe('storage layer', () => {
  beforeEach(() => {
    (globalThis as { __sqliteMockState?: { reset: () => void } }).__sqliteMockState?.reset();
    resumeStorage.clearAll();
  });

  it('initializes all SQLite schema tables and FTS setup', async () => {
    await initializeDatabaseSchema();

    const executed = (globalThis as { __sqliteMockState?: { executedQueries: Array<{ query: string }> } })
      .__sqliteMockState?.executedQueries ?? [];

    const ddl = executed.map((entry) => entry.query);

    expect(ddl.some((query) => query.includes('CREATE TABLE IF NOT EXISTS media_files'))).toBe(true);
    expect(ddl.some((query) => query.includes('CREATE VIRTUAL TABLE IF NOT EXISTS media_files_fts'))).toBe(true);
    expect(ddl.some((query) => query.includes('CREATE TABLE IF NOT EXISTS folders_index'))).toBe(true);
    expect(ddl.some((query) => query.includes('CREATE TABLE IF NOT EXISTS playlists'))).toBe(true);
    expect(ddl.some((query) => query.includes('CREATE TABLE IF NOT EXISTS playlist_items'))).toBe(true);
    expect(ddl.some((query) => query.includes('CREATE TABLE IF NOT EXISTS pdf_bookmarks'))).toBe(true);
  });

  it('formats FTS prefix search safely', async () => {
    await mediaRepository.searchFilesFts({ query: 'interstellar', category: 'VIDEO', limit: 25 });

    const executed = (globalThis as { __sqliteMockState?: { executedQueries: Array<{ query: string; params: unknown[] }> } })
      .__sqliteMockState?.executedQueries ?? [];

    const last = executed.at(-1);
    expect(last?.query).toContain('MATCH ?');
    expect(last?.params[0]).toBe('"interstellar"*');
    expect(last?.params.at(-1)).toBe(25);
  });

  it('preserves progress under 97% and resets completed states at or above 97%', () => {
    const half = resumeManager.saveResumeState({
      filePath: '/storage/video/test.mp4',
      fileName: 'test.mp4',
      category: 'video',
      lastOpenedAt: 1000,
      positionMs: 50000,
      durationMs: 100000,
    });

    expect(half.positionMs).toBe(50000);
    expect(half.isCompleted).toBeUndefined();

    const complete = resumeManager.saveResumeState({
      filePath: '/storage/video/final.mp4',
      fileName: 'final.mp4',
      category: 'video',
      lastOpenedAt: 2000,
      positionMs: 98000,
      durationMs: 100000,
    });

    expect(complete.positionMs).toBe(0);
    expect(complete.isCompleted).toBe(true);
  });

  it('returns recent history newest first', () => {
    resumeManager.saveResumeState({
      filePath: '/storage/audio/older.mp3',
      fileName: 'older.mp3',
      category: 'audio',
      lastOpenedAt: 100,
      positionMs: 1000,
      durationMs: 2000,
    });

    resumeManager.saveResumeState({
      filePath: '/storage/audio/newer.mp3',
      fileName: 'newer.mp3',
      category: 'audio',
      lastOpenedAt: 300,
      positionMs: 500,
      durationMs: 2000,
    });

    const history = resumeManager.getRecentHistory(5);
    expect(history.map((entry) => entry.filePath)).toEqual([
      '/storage/audio/newer.mp3',
      '/storage/audio/older.mp3',
    ]);
  });

  it('renders the SQLite readiness badge in the app shell', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SQLite + MMKV Ready')).toBeTruthy();
    });

    expect(screen.getByTestId('db-status-badge')).toBeTruthy();
  });
});
