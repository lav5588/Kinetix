import { useMediaScannerStore } from '@core/store';
import type { ScanError } from '@core/scanner';

const getStore = () => useMediaScannerStore.getState();

const createError = (overrides: Partial<ScanError> = {}): ScanError => ({
  code: 'DISCOVERY_FAILED',
  message: 'Unable to read one media collection.',
  stage: 'discovering',
  recoverable: true,
  ...overrides,
});

describe('useMediaScannerStore', () => {
  beforeEach(() => {
    getStore().reset();
  });

  it('transitions through permission checking, scanning, indexing, and completion', () => {
    getStore().startScan(100);
    expect(getStore().status).toBe('checkingPermissions');
    expect(getStore().scanStartedAtMs).toBe(100);

    getStore().beginScanning();
    expect(getStore().status).toBe('scanning');
    expect(getStore().phase).toBe('discovering');

    getStore().beginIndexing();
    expect(getStore().status).toBe('indexing');
    expect(getStore().phase).toBe('indexing');

    getStore().completeScan(200);
    expect(getStore().status).toBe('completed');
    expect(getStore().phase).toBe('completed');
    expect(getStore().progressPercent).toBe(100);
    expect(getStore().lastSuccessfulScanTimestampMs).toBe(200);
  });

  it('keeps complete and partial results distinct and stores structured errors', () => {
    const warning = createError();
    getStore().startScan(100);
    getStore().markPartial(warning);

    expect(getStore().status).toBe('partial');
    expect(getStore().error).toEqual(warning);
    expect(getStore().errors).toEqual([warning]);
    expect(getStore().lastSuccessfulScanTimestampMs).toBeNull();

    const failure = createError({ code: 'ACCESS_DENIED', recoverable: false });
    getStore().failScan(failure);

    expect(getStore().status).toBe('error');
    expect(getStore().error).toEqual(failure);
    expect(getStore().errors).toEqual([warning, failure]);
  });

  it('marks a cancelled scan separately from completed and failed scans', () => {
    const cancellation = createError({
      code: 'SCAN_CANCELLED',
      message: 'Scan cancelled.',
    });

    getStore().startScan(100);
    getStore().markCancelled(cancellation);

    expect(getStore().status).toBe('cancelled');
    expect(getStore().error).toEqual(cancellation);
    expect(getStore().lastSuccessfulScanTimestampMs).toBeNull();
  });

  it('sets and aggregates category counts while normalizing invalid counts', () => {
    getStore().setCategoryCounts({ AUDIO: 2, PDF: 3, VIDEO: -10 });
    getStore().incrementCategoryCount('AUDIO', 4);
    getStore().incrementCategoryCount('OTHER_DOC');

    expect(getStore().categoryCounts).toEqual({
      AUDIO: 6,
      VIDEO: 0,
      PHOTO: 0,
      PDF: 3,
      OTHER_DOC: 1,
    });
  });

  it('computes progress as null for unknown or zero totals', () => {
    getStore().updateProgress({ processedCount: 3, totalCount: null });
    expect(getStore().progressPercent).toBeNull();

    getStore().updateProgress({ processedCount: 0, totalCount: 0 });
    expect(getStore().progressPercent).toBeNull();
  });

  it('clamps over-reported progress and normalizes negative progress counts', () => {
    getStore().updateProgress({
      discoveredCount: 12,
      processedCount: 15,
      indexedCount: -3,
      totalCount: 10,
    });

    expect(getStore().progressPercent).toBe(100);
    expect(getStore().discoveredCount).toBe(12);
    expect(getStore().processedCount).toBe(15);
    expect(getStore().indexedCount).toBe(0);
  });

  it('stores optional used/free space and formats decimal GB consistently', () => {
    const gigabyte = 1_000_000_000;
    getStore().setStorageStats({
      usedBytes: 2 * gigabyte,
      freeBytes: 1.5 * gigabyte,
      scope: 'internal_data_volume',
    });

    expect(getStore().storageStats).toEqual({
      usedBytes: 2 * gigabyte,
      freeBytes: 1.5 * gigabyte,
      totalBytes: 3.5 * gigabyte,
      usedGb: '2.00 GB',
      freeGb: '1.50 GB',
      scope: 'internal_data_volume',
    });

    getStore().setStorageStats({
      usedBytes: null,
      freeBytes: Number.NaN,
      totalBytes: null,
      scope: null,
    });
    expect(getStore().storageStats.usedBytes).toBeNull();
    expect(getStore().storageStats.freeBytes).toBeNull();
    expect(getStore().storageStats.totalBytes).toBeNull();
    expect(getStore().storageStats.scope).toBeNull();
  });

  it('keeps last scan metadata and indexed media size separate from device capacity', () => {
    getStore().setLastScanResult('partial', 250);
    getStore().setIndexedMediaBytes(12_000);
    getStore().setStorageStats({
      usedBytes: 100_000,
      freeBytes: 200_000,
      totalBytes: 300_000,
      scope: 'internal_data_volume',
    });

    expect(getStore().lastScanStatus).toBe('partial');
    expect(getStore().lastScanTimestampMs).toBe(250);
    expect(getStore().indexedMediaBytes).toBe(12_000);
    expect(getStore().storageStats.totalBytes).toBe(300_000);
  });

  it('resets all scan state and the last successful scan timestamp', () => {
    getStore().startScan(100);
    getStore().setCategoryCounts({ PHOTO: 5 });
    getStore().setStorageStats({ usedBytes: 100, freeBytes: 200 });
    getStore().completeScan(150);
    getStore().startScan(200);

    getStore().reset();

    expect(getStore().status).toBe('idle');
    expect(getStore().phase).toBeNull();
    expect(getStore().progressPercent).toBeNull();
    expect(getStore().discoveredCount).toBe(0);
    expect(getStore().indexedCount).toBe(0);
    expect(getStore().categoryCounts.PHOTO).toBe(0);
    expect(getStore().storageStats.usedBytes).toBeNull();
    expect(getStore().scanStartedAtMs).toBeNull();
    expect(getStore().lastSuccessfulScanTimestampMs).toBeNull();
    expect(getStore().errors).toEqual([]);
  });
});
