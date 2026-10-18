import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FolderGridItem } from '../FolderGridItem';
import type { FolderItemViewModel } from '../../types';

describe('FolderGridItem', () => {
  const baseFolder: FolderItemViewModel = {
    id: 'AUDIO:/storage/emulated/0/Music',
    folderPath: '/storage/emulated/0/Music',
    folderName: 'Music',
    category: 'AUDIO',
    itemCount: 48,
    totalSizeBytes: 320 * 1024 * 1024, // 320 MB
    thumbnailUri: null,
    lastModified: 1700000000000,
    isExcluded: false,
    isMessengerFolder: false,
    hasUnfinishedResume: false,
  };

  it('renders folder name, category-aware item count, and formatted size', () => {
    render(<FolderGridItem folder={baseFolder} />);

    expect(screen.getByText('Music')).toBeTruthy();
    expect(screen.getByText('48 Audios • 320 MB')).toBeTruthy();
    expect(screen.getByTestId('folder-grid-fallback-icon')).toBeTruthy();
    expect(screen.queryByTestId('folder-grid-messenger-badge')).toBeNull();
    expect(screen.queryByTestId('folder-grid-active-indicator')).toBeNull();
  });

  it('handles category-aware wording for singular, zero, and different categories', () => {
    const singleAudio: FolderItemViewModel = {
      ...baseFolder,
      itemCount: 1,
    };
    const { rerender } = render(<FolderGridItem folder={singleAudio} />);
    expect(screen.getByText('1 Audio • 320 MB')).toBeTruthy();

    const zeroVideos: FolderItemViewModel = {
      ...baseFolder,
      category: 'VIDEO',
      itemCount: 0,
    };
    rerender(<FolderGridItem folder={zeroVideos} />);
    expect(screen.getByText('0 Videos • 320 MB')).toBeTruthy();

    const multiplePdfs: FolderItemViewModel = {
      ...baseFolder,
      category: 'PDF',
      itemCount: 5,
    };
    rerender(<FolderGridItem folder={multiplePdfs} />);
    expect(screen.getByText('5 PDFs • 320 MB')).toBeTruthy();

    const multipleDocs: FolderItemViewModel = {
      ...baseFolder,
      category: 'OTHER_DOC',
      itemCount: 3,
    };
    rerender(<FolderGridItem folder={multipleDocs} />);
    expect(screen.getByText('3 Documents • 320 MB')).toBeTruthy();
  });

  it('renders local thumbnail image when thumbnailUri is provided', () => {
    const folderWithThumb: FolderItemViewModel = {
      ...baseFolder,
      thumbnailUri: '/storage/emulated/0/Movies/sample.mp4',
    };

    render(<FolderGridItem folder={folderWithThumb} />);

    const image = screen.getByTestId('folder-grid-thumbnail-image');
    expect(image).toBeTruthy();
    expect(image.props.source).toEqual({
      uri: 'file:///storage/emulated/0/Movies/sample.mp4',
    });
    expect(screen.queryByTestId('folder-grid-fallback-icon')).toBeNull();
  });

  it('falls back to category icon when thumbnail fails to load', () => {
    const folderWithBrokenThumb: FolderItemViewModel = {
      ...baseFolder,
      thumbnailUri: '/storage/emulated/0/Movies/corrupted.jpg',
    };

    render(<FolderGridItem folder={folderWithBrokenThumb} />);

    const image = screen.getByTestId('folder-grid-thumbnail-image');
    expect(image).toBeTruthy();

    // Trigger image error
    fireEvent(image, 'error');

    expect(screen.getByTestId('folder-grid-fallback-icon')).toBeTruthy();
    expect(screen.queryByTestId('folder-grid-thumbnail-image')).toBeNull();
  });

  it('renders Messenger badge only when isMessengerFolder is true', () => {
    const messengerFolder: FolderItemViewModel = {
      ...baseFolder,
      folderName: 'WhatsApp Audio',
      isMessengerFolder: true,
    };

    const { rerender } = render(<FolderGridItem folder={messengerFolder} />);

    expect(screen.getByTestId('folder-grid-messenger-badge')).toBeTruthy();
    expect(screen.getByText('Messenger')).toBeTruthy();

    // Rerender with isMessengerFolder = false
    rerender(<FolderGridItem folder={{ ...messengerFolder, isMessengerFolder: false }} />);
    expect(screen.queryByTestId('folder-grid-messenger-badge')).toBeNull();
  });

  it('renders active progress indicator only when hasUnfinishedResume is true', () => {
    const activeFolder: FolderItemViewModel = {
      ...baseFolder,
      hasUnfinishedResume: true,
    };

    const { rerender } = render(<FolderGridItem folder={activeFolder} />);

    expect(screen.getByTestId('folder-grid-active-indicator')).toBeTruthy();

    // Rerender with hasUnfinishedResume = false
    rerender(<FolderGridItem folder={{ ...activeFolder, hasUnfinishedResume: false }} />);
    expect(screen.queryByTestId('folder-grid-active-indicator')).toBeNull();
  });

  it('triggers onPress callback with folder data when pressed', () => {
    const onPress = jest.fn();
    render(<FolderGridItem folder={baseFolder} onPress={onPress} />);

    const item = screen.getByTestId(`folder-grid-item-${baseFolder.id}`);
    fireEvent.press(item);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(baseFolder);
  });

  it('does not trigger onPress when disabled', () => {
    const onPress = jest.fn();
    render(<FolderGridItem disabled folder={baseFolder} onPress={onPress} />);

    const item = screen.getByTestId(`folder-grid-item-${baseFolder.id}`);
    fireEvent.press(item);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('handles very long folder names and large byte sizes without breaking', () => {
    const largeFolder: FolderItemViewModel = {
      ...baseFolder,
      folderName:
        'A very long nested directory name that could potentially overflow the display bounds and cause issues on small screens',
      totalSizeBytes: 1024 * 1024 * 1024 * 12.5, // 12.5 GB
    };

    render(<FolderGridItem folder={largeFolder} />);

    expect(screen.getByText(largeFolder.folderName)).toBeTruthy();
    expect(screen.getByText('48 Audios • 12.5 GB')).toBeTruthy();
  });

  it('provides an accessible label reflecting name, count, size, and badges', () => {
    const fullFolder: FolderItemViewModel = {
      ...baseFolder,
      isMessengerFolder: true,
      hasUnfinishedResume: true,
    };

    render(<FolderGridItem folder={fullFolder} />);

    const item = screen.getByTestId(`folder-grid-item-${fullFolder.id}`);
    expect(item.props.accessibilityLabel).toContain('Music');
    expect(item.props.accessibilityLabel).toContain('48 Audios');
    expect(item.props.accessibilityLabel).toContain('320 MB');
    expect(item.props.accessibilityLabel).toContain('Messenger folder');
    expect(item.props.accessibilityLabel).toContain('Contains in-progress files');
    expect(item.props.accessibilityRole).toBe('button');
  });
});
