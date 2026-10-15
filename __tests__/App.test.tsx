import { render, screen } from '@testing-library/react-native';
import App from '@app';

describe('App', () => {
  it('renders the app shell and theme preview controls', () => {
    render(<App />);

    expect(screen.getByTestId('app-root-shell')).toBeTruthy();
    expect(screen.getByTestId('theme-preview-card')).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
  });
});
