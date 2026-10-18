import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { StorageAnalyzerWidget } from '@features/dashboard/components/StorageAnalyzerWidget';
import { useMediaScannerStore } from '@core/store';

describe('StorageAnalyzerWidget', () => {
  beforeEach(() => {
    useMediaScannerStore.getState().reset();
  });

  it('renders device-capacity values and bar proportions when storage stats are available', () => {
    useMediaScannerStore.setState({
      storageStats: {
        usedBytes: 2_000_000_000,
        freeBytes: 1_500_000_000,
        totalBytes: 3_500_000_000,
        usedGb: '2.00 GB',
        freeGb: '1.50 GB',
        scope: 'internal_data_volume',
      },
    });

    render(<StorageAnalyzerWidget />);

    expect(screen.getByText('Storage')).toBeTruthy();
    expect(screen.getByText('2.00 GB used')).toBeTruthy();
    expect(screen.getByText('57% of available storage is in use.')).toBeTruthy();
    expect(screen.getByTestId('storage-analyzer-bar')).toBeTruthy();
  });

  it('falls back cleanly when storage stats are unavailable or invalid', () => {
    useMediaScannerStore.setState({
      storageStats: {
        usedBytes: null,
        freeBytes: null,
        totalBytes: null,
        usedGb: null,
        freeGb: null,
        scope: null,
      },
    });

    render(<StorageAnalyzerWidget />);

    expect(screen.getByText('Storage')).toBeTruthy();
    expect(screen.getByText('No storage data available')).toBeTruthy();
    expect(screen.getByText('Unable to calculate storage usage right now.')).toBeTruthy();
  });
});
