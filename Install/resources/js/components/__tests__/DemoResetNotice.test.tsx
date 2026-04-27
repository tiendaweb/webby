import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import { DemoResetNotice } from '../DemoResetNotice';

function mockPageProps(props: Partial<PageProps> = {}) {
    vi.mocked(usePage).mockReturnValue({
        props: props as PageProps,
    } as ReturnType<typeof usePage>);
}

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
}));

describe('DemoResetNotice (user variant)', () => {
    beforeEach(() => {
        vi.mocked(localStorage.getItem).mockReset();
        vi.mocked(localStorage.setItem).mockReset();
    });

    it('renders nothing when not in demo mode', () => {
        mockPageProps({ isDemo: false });
        const { container } = render(<DemoResetNotice />);
        expect(container.innerHTML).toBe('');
    });

    it('renders nothing when isDemo is undefined', () => {
        mockPageProps();
        const { container } = render(<DemoResetNotice />);
        expect(container.innerHTML).toBe('');
    });

    it('shows dialog with user message when in demo mode', () => {
        mockPageProps({ isDemo: true });
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        render(<DemoResetNotice />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Demo Mode')).toBeInTheDocument();
        expect(screen.getByText(/resets every 3 hours/i)).toBeInTheDocument();
        expect(screen.getByText(/projects or changes will be cleared/i)).toBeInTheDocument();
    });

    it('does not show dialog when previously dismissed', () => {
        mockPageProps({ isDemo: true });
        vi.mocked(localStorage.getItem).mockReturnValue('true');

        render(<DemoResetNotice />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('checks localStorage with the user key', () => {
        mockPageProps({ isDemo: true });
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        render(<DemoResetNotice />);

        expect(localStorage.getItem).toHaveBeenCalledWith('demo-reset-notice-dismissed');
    });

    it('dismisses dialog and saves to localStorage when button is clicked', async () => {
        const user = userEvent.setup();
        mockPageProps({ isDemo: true });
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        render(<DemoResetNotice />);

        const dismissButton = screen.getByRole('button', { name: /got it/i });
        await user.click(dismissButton);

        expect(localStorage.setItem).toHaveBeenCalledWith(
            'demo-reset-notice-dismissed',
            'true'
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dismisses when the close button (X) is clicked', async () => {
        const user = userEvent.setup();
        mockPageProps({ isDemo: true });
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        render(<DemoResetNotice />);

        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(localStorage.setItem).toHaveBeenCalledWith(
            'demo-reset-notice-dismissed',
            'true'
        );
    });
});

describe('DemoResetNotice (admin variant)', () => {
    beforeEach(() => {
        vi.mocked(localStorage.getItem).mockReset();
        vi.mocked(localStorage.setItem).mockReset();
    });

    it('shows dialog with admin message when in demo mode', () => {
        mockPageProps({ isDemo: true });
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        render(<DemoResetNotice variant="admin" />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/admin panel is for demo viewing only/i)).toBeInTheDocument();
        expect(screen.getByText(/register/i)).toBeInTheDocument();
    });

    it('uses separate localStorage key from user variant', () => {
        mockPageProps({ isDemo: true });
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        render(<DemoResetNotice variant="admin" />);

        expect(localStorage.getItem).toHaveBeenCalledWith('demo-admin-notice-dismissed');
    });

    it('does not show when admin key is dismissed', () => {
        mockPageProps({ isDemo: true });
        vi.mocked(localStorage.getItem).mockImplementation((key) =>
            key === 'demo-admin-notice-dismissed' ? 'true' : null
        );

        render(<DemoResetNotice variant="admin" />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
