import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Wrapper for rendering with ThemeProvider
function renderWithTheme(ui: React.ReactElement) {
    return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ThemeToggle', () => {
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
        // Clear localStorage mock
        vi.mocked(localStorage.getItem).mockReset();
        vi.mocked(localStorage.setItem).mockReset();

        // Reset document class
        document.documentElement.classList.remove('dark');

        // Setup matchMedia mock (default to light mode)
        originalMatchMedia = window.matchMedia;
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it('renders sun icon in dark mode', () => {
        vi.mocked(localStorage.getItem).mockReturnValue('dark');

        renderWithTheme(<ThemeToggle />);

        // In dark mode, we show sun icon (to switch to light)
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(screen.getByLabelText(/switch to light mode/i)).toBeInTheDocument();
    });

    it('renders moon icon in light mode', () => {
        vi.mocked(localStorage.getItem).mockReturnValue('light');

        renderWithTheme(<ThemeToggle />);

        // In light mode, we show moon icon (to switch to dark)
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(screen.getByLabelText(/switch to dark mode/i)).toBeInTheDocument();
    });

    it('toggles theme on click', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('light');
        const user = userEvent.setup();

        renderWithTheme(<ThemeToggle />);

        const button = screen.getByRole('button');
        await user.click(button);

        expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
    });

    it('has correct aria-label', () => {
        vi.mocked(localStorage.getItem).mockReturnValue('light');

        renderWithTheme(<ThemeToggle />);

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-label');
    });

    it('cycles through themes correctly', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('light');
        const user = userEvent.setup();

        renderWithTheme(<ThemeToggle />);

        const button = screen.getByRole('button');

        // Click 1: light -> dark
        await user.click(button);
        expect(localStorage.setItem).toHaveBeenLastCalledWith('app-theme', 'dark');

        // Click 2: dark -> system
        await user.click(button);
        expect(localStorage.setItem).toHaveBeenLastCalledWith('app-theme', 'system');

        // Click 3: system -> light
        await user.click(button);
        expect(localStorage.setItem).toHaveBeenLastCalledWith('app-theme', 'light');
    });
});
