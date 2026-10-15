import { render, screen } from '@testing-library/react-native';
import App from '@app';

describe('App', () => {
  it('renders the root shell with the initialized title', () => {
    render(<App />);

    expect(screen.getByTestId('app-root-shell')).toBeTruthy();
    expect(screen.getByText('Kinetix Initialized')).toBeTruthy();
  });
});
