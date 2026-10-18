import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CategoryBentoCard } from '@features/dashboard/components/CategoryBentoCard';

jest.mock('@core/theme', () => ({
  __esModule: true,
  CATEGORY_ACCENT_COLORS: {
    audio: '#8B5CF6',
    video: '#F97316',
    photo: '#10B981',
    pdf: '#EF4444',
    doc: '#3B82F6',
  },
  useAppTheme: () => ({
    appColors: {
      surface: '#ffffff',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
    },
    colors: {
      primary: '#2563eb',
    },
  }),
}));

describe('CategoryBentoCard', () => {
  it('renders the category title, count, and themed accent label', () => {
    render(
      <CategoryBentoCard
        category="audio"
        title="Audio"
        count={128}
        testID="audio-card"
      />,
    );

    expect(screen.getByText('Audio')).toBeTruthy();
    expect(screen.getByText('128 items')).toBeTruthy();
    expect(screen.getByTestId('audio-card')).toBeTruthy();
  });

  it('supports zero counts and press callbacks with accessibility metadata', () => {
    const onPress = jest.fn();

    render(
      <CategoryBentoCard
        accessibilityLabel="Open Video category"
        category="video"
        count={0}
        onPress={onPress}
        testID="video-card"
        title="Video"
      />,
    );

    const card = screen.getByTestId('video-card');
    expect(screen.getByText('0 items')).toBeTruthy();
    expect(card.props.accessibilityLabel).toBe('Open Video category');

    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('can render a custom icon and respects disabled state', () => {
    const onPress = jest.fn();

    render(
      <CategoryBentoCard
        count={2}
        disabled
        icon="folder"
        onPress={onPress}
        testID="doc-card"
        title="Other Docs"
      />,
    );

    const card = screen.getByTestId('doc-card');

    fireEvent.press(card);
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('2 items')).toBeTruthy();
  });
});
