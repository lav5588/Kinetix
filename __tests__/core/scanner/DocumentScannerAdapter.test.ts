import {
  DocumentScannerAdapter,
  type DocumentScannerPage,
  type DocumentScannerRow,
  type NativeDocumentScannerModule,
} from '@core/scanner';

const createRow = (overrides: Partial<DocumentScannerRow> = {}): DocumentScannerRow => ({
  id: '1',
  contentUri: 'content://media/external/file/1',
  displayName: 'report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  dateModifiedMs: 1_700_000_000_000,
  dateAddedMs: 1_699_000_000_000,
  folderPath: 'Documents/Reports/',
  folderName: 'Reports',
  ...overrides,
});

const createPage = (overrides: Partial<DocumentScannerPage> = {}): DocumentScannerPage => ({
  accessStatus: 'granted',
  items: [],
  errors: [],
  nextAfterId: null,
  hasMore: false,
  ...overrides,
});

describe('DocumentScannerAdapter', () => {
  it('classifies PDF and common document files into the canonical categories', async () => {
    const nativeModule: NativeDocumentScannerModule = {
      getAccessStatus: jest.fn().mockResolvedValue('granted'),
      queryDocuments: jest.fn().mockResolvedValue(
        createPage({
          items: [
            createRow({ id: '1', displayName: 'report.PDF', mimeType: 'application/pdf' }),
            createRow({
              id: '2',
              contentUri: 'content://media/external/file/2',
              displayName: 'budget.xlsx',
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
            createRow({
              id: '3',
              contentUri: 'content://media/external/file/3',
              displayName: 'notes.txt',
              mimeType: 'text/plain',
            }),
          ],
        }),
      ),
    };

    const result = await new DocumentScannerAdapter(nativeModule).discoverDocuments();

    expect(result.status).toBe('completed');
    expect(result.accessStatus).toBe('granted');
    expect(result.files.map(({ category }) => category)).toEqual(['PDF', 'OTHER_DOC', 'OTHER_DOC']);
    expect(result.files[0].file_path).toBe('content://media/external/file/1');
    expect(result.discoveredCount).toBe(3);
  });

  it.each([
    ['denied', 'All Files Access is not granted; document discovery was skipped.'],
    ['unsupported', 'Broad document discovery is not supported on this Android version.'],
  ] as const)(
    'returns a partial result without querying when access is %s',
    async (status, message) => {
      const nativeModule: NativeDocumentScannerModule = {
        getAccessStatus: jest.fn().mockResolvedValue(status),
        queryDocuments: jest.fn(),
      };

      const result = await new DocumentScannerAdapter(nativeModule).discoverDocuments();

      expect(result.status).toBe('partial');
      expect(result.accessStatus).toBe(status);
      expect(result.files).toEqual([]);
      expect(result.errors[0]).toMatchObject({ code: 'ACCESS_DENIED', message });
      expect(nativeModule.queryDocuments).not.toHaveBeenCalled();
    },
  );

  it('deduplicates repeated document identity and content URI', async () => {
    const nativeModule: NativeDocumentScannerModule = {
      getAccessStatus: jest.fn().mockResolvedValue('granted'),
      queryDocuments: jest.fn().mockResolvedValue(
        createPage({
          items: [
            createRow({ id: '1' }),
            createRow({ id: '1', contentUri: 'content://alternate/1' }),
            createRow({ id: 'different', contentUri: 'content://media/external/file/1' }),
          ],
        }),
      ),
    };

    const result = await new DocumentScannerAdapter(nativeModule).discoverDocuments();

    expect(result.status).toBe('completed');
    expect(result.files).toHaveLength(1);
  });

  it('reports inaccessible-folder and per-file errors while continuing with readable files', async () => {
    const nativeModule: NativeDocumentScannerModule = {
      getAccessStatus: jest.fn().mockResolvedValue('granted'),
      queryDocuments: jest.fn().mockResolvedValue(
        createPage({
          items: [
            createRow({ id: '1' }),
            createRow({
              id: 'bad',
              contentUri: '',
              displayName: '',
            }),
          ],
          errors: [
            {
              message: 'Unable to read folder.',
              filePath: 'Documents/Locked',
            },
          ],
        }),
      ),
    };

    const result = await new DocumentScannerAdapter(nativeModule).discoverDocuments();

    expect(result.status).toBe('partial');
    expect(result.files).toHaveLength(1);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Unable to read folder.',
          filePath: 'Documents/Locked',
          recoverable: true,
        }),
        expect.objectContaining({
          message: 'Document row is missing its content URI or display name.',
          recoverable: true,
        }),
      ]),
    );
  });

  it('keeps files from earlier pages when a later query fails', async () => {
    const queryDocuments = jest
      .fn()
      .mockResolvedValueOnce(
        createPage({
          items: [createRow()],
          nextAfterId: '1',
          hasMore: true,
        }),
      )
      .mockRejectedValueOnce(new Error('Directory became inaccessible.'));
    const nativeModule: NativeDocumentScannerModule = {
      getAccessStatus: jest.fn().mockResolvedValue('granted'),
      queryDocuments,
    };

    const result = await new DocumentScannerAdapter(nativeModule, {
      pageSize: 1,
    }).discoverDocuments();

    expect(result.status).toBe('partial');
    expect(result.files).toHaveLength(1);
    expect(result.errors[0].message).toBe('Directory became inaccessible.');
  });

  it('reports an access change between pages as a partial result', async () => {
    const nativeModule: NativeDocumentScannerModule = {
      getAccessStatus: jest.fn().mockResolvedValue('granted'),
      queryDocuments: jest.fn().mockResolvedValue(
        createPage({
          accessStatus: 'denied',
        }),
      ),
    };

    const result = await new DocumentScannerAdapter(nativeModule).discoverDocuments();

    expect(result.status).toBe('partial');
    expect(result.accessStatus).toBe('denied');
    expect(result.errors[0].code).toBe('ACCESS_DENIED');
  });
});
