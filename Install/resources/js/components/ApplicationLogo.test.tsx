import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import ApplicationLogo from './ApplicationLogo';

// Mock Inertia usePage
vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
}));

// Mock ThemeContext
let mockResolvedTheme: 'light' | 'dark' = 'light';
vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({
        resolvedTheme: mockResolvedTheme,
        theme: mockResolvedTheme,
        setTheme: vi.fn(),
    }),
}));

function mockPageProps(appSettings: Partial<PageProps['appSettings']>) {
    vi.mocked(usePage).mockReturnValue({
        props: {
            appSettings: {
                site_name: 'TestApp',
                site_tagline: 'Test tagline',
                site_logo: null,
                site_logo_dark: null,
                color_theme: 'neutral',
                ...appSettings,
            },
        } as unknown as PageProps,
    } as ReturnType<typeof usePage>);
}

describe('ApplicationLogo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockResolvedTheme = 'light';
    });

    it('renders only the image when a custom logo is set, even with showText', () => {
        mockPageProps({ site_logo: 'branding/logo.png' });

        render(<ApplicationLogo showText size="lg" />);

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/storage/branding/logo.png');
        expect(screen.queryByText('TestApp')).not.toBeInTheDocument();
        expect(screen.queryByText('Test tagline')).not.toBeInTheDocument();
    });

    it('renders only the image when a custom logo is set and showText is false', () => {
        mockPageProps({ site_logo: 'branding/logo.png' });

        render(<ApplicationLogo size="lg" />);

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/storage/branding/logo.png');
        expect(screen.queryByText('TestApp')).not.toBeInTheDocument();
    });

    it('renders fallback icon with site name and tagline when no logo and showText is true', () => {
        mockPageProps({ site_logo: null });

        render(<ApplicationLogo showText size="lg" />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByText('TestApp')).toBeInTheDocument();
        expect(screen.getByText('Test tagline')).toBeInTheDocument();
    });

    it('renders fallback icon without text when no logo and showText is false', () => {
        mockPageProps({ site_logo: null });

        render(<ApplicationLogo size="lg" />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.queryByText('TestApp')).not.toBeInTheDocument();
        expect(screen.queryByText('Test tagline')).not.toBeInTheDocument();
    });

    it('uses dark logo when in dark theme and dark logo is available', () => {
        mockResolvedTheme = 'dark';
        mockPageProps({
            site_logo: 'branding/logo.png',
            site_logo_dark: 'branding/logo-dark.png',
        });

        render(<ApplicationLogo showText size="lg" />);

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/storage/branding/logo-dark.png');
    });

    it('falls back to regular logo in dark theme when no dark logo exists', () => {
        mockResolvedTheme = 'dark';
        mockPageProps({
            site_logo: 'branding/logo.png',
            site_logo_dark: null,
        });

        render(<ApplicationLogo showText size="lg" />);

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/storage/branding/logo.png');
    });
});
