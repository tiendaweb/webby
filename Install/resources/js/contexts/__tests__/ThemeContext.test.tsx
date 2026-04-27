import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Helper component to test useTheme hook
function TestComponent() {
    const { theme, resolvedTheme, setTheme } = useTheme();
    return (
        <div>
            <span data-testid="theme">{theme}</span>
            <span data-testid="resolved-theme">{resolvedTheme}</span>
            <button onClick={() => setTheme('light')}>Set Light</button>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
            <button onClick={() => setTheme('system')}>Set System</button>
        </div>
    );
}

describe('ThemeContext', () => {
    let originalMatchMedia: typeof window.matchMedia;
    let mockMatchMedia: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Clear localStorage mock
        vi.mocked(localStorage.getItem).mockReset();
        vi.mocked(localStorage.setItem).mockReset();

        // Reset document class
        document.documentElement.classList.remove('dark');

        // Setup matchMedia mock
        originalMatchMedia = window.matchMedia;
        mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        window.matchMedia = mockMatchMedia;
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it('renders children correctly', () => {
        render(
            <ThemeProvider>
                <div data-testid="child">Hello</div>
            </ThemeProvider>
        );

        expect(screen.getByTestId('child')).toHaveTextContent('Hello');
    });

    it('returns current theme from useTheme', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });

    it('setTheme updates theme and localStorage', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await act(async () => {
            screen.getByText('Set Dark').click();
        });

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('respects system preference when theme is "system"', () => {
        vi.mocked(localStorage.getItem).mockReturnValue('system');
        mockMatchMedia.mockImplementation((query: string) => ({
            matches: query === '(prefers-color-scheme: dark)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('theme')).toHaveTextContent('system');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });

    it('initializes from localStorage if present', () => {
        vi.mocked(localStorage.getItem).mockReturnValue('dark');

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('resolves to light when system prefers light', () => {
        vi.mocked(localStorage.getItem).mockReturnValue('system');
        mockMatchMedia.mockImplementation((query: string) => ({
            matches: false, // prefers-color-scheme: dark is false
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});
