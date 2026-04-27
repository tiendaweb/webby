import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import { AdminDemoBanner } from '../AdminDemoBanner';

function mockPageProps(props: Partial<PageProps> = {}) {
    vi.mocked(usePage).mockReturnValue({
        props: props as PageProps,
    } as ReturnType<typeof usePage>);
}

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
}));

const adminUser = { id: 1, name: 'Admin', email: 'admin@webby.com', avatar: null, role: 'admin' as const };
const regularUser = { id: 2, name: 'User', email: 'user@test.com', avatar: null, role: 'user' as const };

describe('AdminDemoBanner', () => {
    it('renders nothing when isDemo is false', () => {
        mockPageProps({ isDemo: false, auth: { user: adminUser } });
        const { container } = render(<AdminDemoBanner />);
        expect(container.innerHTML).toBe('');
    });

    it('renders warning alert when isDemo is true and user is admin', () => {
        mockPageProps({ isDemo: true, auth: { user: adminUser } });
        render(<AdminDemoBanner />);
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Demo Mode/)).toBeInTheDocument();
    });

    it('renders nothing when isDemo is true but user is not admin', () => {
        mockPageProps({ isDemo: true, auth: { user: regularUser } });
        const { container } = render(<AdminDemoBanner />);
        expect(container.innerHTML).toBe('');
    });

    it('has no dismiss button', () => {
        mockPageProps({ isDemo: true, auth: { user: adminUser } });
        render(<AdminDemoBanner />);
        expect(screen.queryByRole('button')).toBeNull();
    });
});
