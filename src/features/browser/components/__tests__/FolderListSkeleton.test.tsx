import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { FolderListSkeleton } from '../FolderListSkeleton';

describe('FolderListSkeleton', () => {
  it('renders list view skeleton layout by default', () => {
    render(<FolderListSkeleton />);

    expect(screen.getByTestId('folder-explorer-loading')).toBeTruthy();
    expect(screen.getByTestId('folder-skeleton-list')).toBeTruthy();
    expect(screen.queryByTestId('folder-skeleton-grid')).toBeNull();

    const items = screen.getAllByTestId('folder-skeleton-item');
    expect(items.length).toBe(8);
  });

  it('renders grid view skeleton layout when viewMode is grid', () => {
    render(<FolderListSkeleton viewMode="grid" />);

    expect(screen.getByTestId('folder-skeleton-grid')).toBeTruthy();
    expect(screen.queryByTestId('folder-skeleton-list')).toBeNull();

    const items = screen.getAllByTestId('folder-skeleton-item');
    expect(items.length).toBe(8);
  });

  it('renders custom number of skeleton items when itemCount is specified', () => {
    render(<FolderListSkeleton itemCount={4} viewMode="list" />);

    const items = screen.getAllByTestId('folder-skeleton-item');
    expect(items.length).toBe(4);
  });

  it('provides accessible role and text for screen readers', () => {
    render(<FolderListSkeleton />);

    const container = screen.getByTestId('folder-explorer-loading');
    expect(container.props.accessibilityRole).toBe('progressbar');
    expect(container.props.accessibilityLabel).toBe('Loading folders');
    expect(screen.getByText('Loading folders...')).toBeTruthy();
  });
});
