import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FileItemCard } from '../FileItemCard';
import type { FileItemViewModel } from '../../types';
import type { MediaFileRow, ResumeRecord } from '@core/storage/types';

describe('Task 8 Subtask 5: FileItemCard', () => {
  const baseFile: FileItemViewModel = {
    id: 'file-001',
    filePath: '/storage/emulated/0/Music/Song.mp3',
    fileName: 'Acoustic Song.mp3',
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    category: 'AUDIO',
    folderPath: '/storage/emulated/0/Music',
    folderName: 'Music',
    sizeBytes: 10 * 1024 * 1024, // 10 MB
    durationMs: 180000, // 3:00
    width: null,
    height: null,
    artist: 'Artist',
    album: 'Album',
    dateModified: 1700000000000,
    dateAdded: 1700000000000,
    isHidden: false,
    isMessengerMedia: false,
    isFavorite: false,
    isVaulted: false,
  };

  describe('Resume progress bar rendering', () => {
    it('renders 50% progress for a file with positionMs = 30000 and durationMs = 60000', () => {
      const resumeRecord: ResumeRecord = {
        filePath: baseFile.filePath,
        fileName: baseFile.fileName,
        category: 'audio',
        lastOpenedAt: Date.now(),
        positionMs: 30000,
        durationMs: 60000,
        isCompleted: false,
      };

      render(<FileItemCard file={baseFile} resumeRecord={resumeRecord} />);

      const progressBar = screen.getByTestId('file-progress-bar');
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityRole).toBe('progressbar');
      expect(progressBar.props.accessibilityLabel).toBe('Progress: 50%');

      const progressFill = screen.getByTestId('file-progress-fill');
      expect(progressFill.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: '50%' })]),
      );

      expect(screen.getByTestId('file-progress-label')).toBeTruthy();
      expect(screen.getByText('50%')).toBeTruthy();
    });

    it('does not render progress bar when no resume history exists', () => {
      render(<FileItemCard file={baseFile} resumeRecord={null} />);

      expect(screen.queryByTestId('file-progress-bar')).toBeNull();
      expect(screen.queryByTestId('file-progress-label')).toBeNull();
    });

    it('does not render progress bar when duration is zero', () => {
      const zeroDurationRecord: ResumeRecord = {
        filePath: baseFile.filePath,
        fileName: baseFile.fileName,
        category: 'audio',
        lastOpenedAt: Date.now(),
        positionMs: 15000,
        durationMs: 0,
      };

      render(<FileItemCard file={baseFile} resumeRecord={zeroDurationRecord} />);
      expect(screen.queryByTestId('file-progress-bar')).toBeNull();
    });

    it('does not render progress bar when position or duration is negative or invalid', () => {
      const negativeRecord: ResumeRecord = {
        filePath: baseFile.filePath,
        fileName: baseFile.fileName,
        category: 'audio',
        lastOpenedAt: Date.now(),
        positionMs: -5000,
        durationMs: 60000,
      };

      render(<FileItemCard file={baseFile} resumeRecord={negativeRecord} />);
      expect(screen.queryByTestId('file-progress-bar')).toBeNull();
    });

    it('clamps progress to 100% when progress position exceeds duration', () => {
      const overflowRecord: ResumeRecord = {
        filePath: baseFile.filePath,
        fileName: baseFile.fileName,
        category: 'audio',
        lastOpenedAt: Date.now(),
        positionMs: 80000,
        durationMs: 60000,
      };

      render(<FileItemCard file={baseFile} resumeRecord={overflowRecord} />);

      const progressBar = screen.getByTestId('file-progress-bar');
      expect(progressBar.props.accessibilityLabel).toBe('Progress: 100%');

      const progressFill = screen.getByTestId('file-progress-fill');
      expect(progressFill.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: '100%' })]),
      );
    });

    it('supports direct resumeProgressPercent prop override', () => {
      render(<FileItemCard file={baseFile} resumeProgressPercent={75} />);

      const progressBar = screen.getByTestId('file-progress-bar');
      expect(progressBar.props.accessibilityLabel).toBe('Progress: 75%');

      const progressFill = screen.getByTestId('file-progress-fill');
      expect(progressFill.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ width: '75%' })]),
      );
    });
  });

  describe('List vs Grid Presentation', () => {
    it('renders list layout with filename, size, duration, and fallback icon', () => {
      render(<FileItemCard file={baseFile} viewMode="list" />);

      expect(screen.getByTestId(`file-list-item-${baseFile.id}`)).toBeTruthy();
      expect(screen.getByTestId('file-name')).toHaveTextContent('Acoustic Song.mp3');
      expect(screen.getByTestId('file-size')).toHaveTextContent('10 MB');
      expect(screen.getByTestId('file-duration')).toHaveTextContent('3:00');
      expect(screen.getByTestId('file-fallback-icon')).toBeTruthy();
    });

    it('renders grid layout with filename, size, duration badge, and card structure', () => {
      const videoFile: FileItemViewModel = {
        ...baseFile,
        id: 'file-vid-01',
        category: 'VIDEO',
        fileName: 'Trailer.mp4',
        durationMs: 125000, // 2:05
      };

      render(<FileItemCard file={videoFile} resumeProgressPercent={50} viewMode="grid" />);

      expect(screen.getByTestId(`file-grid-item-${videoFile.id}`)).toBeTruthy();
      expect(screen.getByTestId('file-name')).toHaveTextContent('Trailer.mp4');
      expect(screen.getByTestId('file-size')).toHaveTextContent('10 MB');
      expect(screen.getByTestId('file-duration-badge')).toBeTruthy();
      expect(screen.getByText('2:05')).toBeTruthy();
      expect(screen.getByTestId('file-progress-bar')).toBeTruthy();
    });
  });

  describe('Long filenames & Accessibility', () => {
    it('handles long filenames without breaking accessibility label', () => {
      const longName =
        'Very_Long_Filename_With_Lots_Of_Details_And_Numbers_1080p_BluRay_x264_AAC.mp4';
      const fileWithLongName: FileItemViewModel = {
        ...baseFile,
        fileName: longName,
        isFavorite: true,
      };

      render(<FileItemCard file={fileWithLongName} resumeProgressPercent={50} viewMode="list" />);

      const item = screen.getByTestId(`file-list-item-${fileWithLongName.id}`);
      expect(item.props.accessibilityRole).toBe('button');
      expect(item.props.accessibilityLabel).toContain(longName);
      expect(item.props.accessibilityLabel).toContain('AUDIO');
      expect(item.props.accessibilityLabel).toContain('10 MB');
      expect(item.props.accessibilityLabel).toContain('Favorite');
      expect(item.props.accessibilityLabel).toContain('Progress: 50%');
    });

    it('supports raw database row schema (MediaFileRow)', () => {
      const dbRow: MediaFileRow = {
        id: 'db-row-1',
        file_path: '/storage/photo.jpg',
        file_name: 'Sunset.jpg',
        extension: 'jpg',
        mime_type: 'image/jpeg',
        category: 'PHOTO',
        folder_path: '/storage',
        folder_name: 'Storage',
        size_bytes: 5 * 1024 * 1024,
        duration_ms: null,
        width: 1920,
        height: 1080,
        artist: null,
        album: null,
        date_modified: 1000,
        date_added: 1000,
        is_hidden: 0,
        is_messenger_media: 0,
        is_favorite: 1,
        is_vaulted: 0,
      };

      render(<FileItemCard file={dbRow} viewMode="list" />);

      expect(screen.getByText('Sunset.jpg')).toBeTruthy();
      expect(screen.getByText('5 MB')).toBeTruthy();
      expect(screen.getByTestId('file-favorite-badge')).toBeTruthy();
      expect(screen.queryByTestId('file-duration')).toBeNull(); // photos do not show duration
    });
  });

  describe('Press and interaction handlers', () => {
    it('calls onPress when clicked', () => {
      const onPressMock = jest.fn();
      render(<FileItemCard file={baseFile} onPress={onPressMock} />);

      fireEvent.press(screen.getByTestId(`file-list-item-${baseFile.id}`));
      expect(onPressMock).toHaveBeenCalledTimes(1);
      expect(onPressMock).toHaveBeenCalledWith(baseFile);
    });

    it('calls onLongPress when long-pressed', () => {
      const onLongPressMock = jest.fn();
      render(<FileItemCard file={baseFile} onLongPress={onLongPressMock} />);

      fireEvent(screen.getByTestId(`file-list-item-${baseFile.id}`), 'longPress');
      expect(onLongPressMock).toHaveBeenCalledTimes(1);
      expect(onLongPressMock).toHaveBeenCalledWith(baseFile);
    });

    it('respects disabled prop', () => {
      const onPressMock = jest.fn();
      render(<FileItemCard disabled file={baseFile} onPress={onPressMock} />);

      const item = screen.getByTestId(`file-list-item-${baseFile.id}`);
      expect(item.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
