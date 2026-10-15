import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import App from '@app';
import { useThemeStore } from '@core/theme/useThemeStore';

describe('App', () => {
  beforeEach(() => {
    useThemeStore.getState().resetThemeDefaults();
  });

  it('renders the preview and updates its background from theme controls', () => {
    render(<App />);

    const appShell = screen.getByTestId('app-root-shell');
    expect(screen.getByTestId('theme-preview-card')).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(StyleSheet.flatten(appShell.props.contentContainerStyle).backgroundColor).toBe(
      '#F8FAFC',
    );

    fireEvent.press(screen.getByText('Dark'));
    expect(StyleSheet.flatten(appShell.props.contentContainerStyle).backgroundColor).toBe(
      '#0F172A',
    );

    fireEvent.press(screen.getByText('AMOLED Off'));
    expect(StyleSheet.flatten(appShell.props.contentContainerStyle).backgroundColor).toBe(
      '#000000',
    );

    fireEvent.press(screen.getByText('Light'));
    expect(StyleSheet.flatten(appShell.props.contentContainerStyle).backgroundColor).toBe(
      '#F8FAFC',
    );
  });
});
