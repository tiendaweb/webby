import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AiConnectorIndex from '../Index';

vi.mock('@/Layouts/AdminLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/Admin/AdminPageHeader', () => ({
    AdminPageHeader: ({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) => (
        <div>
            {title}
            {action}
        </div>
    ),
}));

vi.mock('@inertiajs/react', () => ({
    router: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const auth = { user: { id: 1, name: 'Admin', email: 'admin@example.com' } };

const baseProps = {
    auth,
    filters: {},
    modules: [
        {
            id: 1,
            name: 'Conector IA',
            slug: 'ai-connector',
            description: 'MCP access',
            pricing_type: 'monthly' as const,
            price: 10,
            is_active: true,
            active_count: 3,
        },
    ],
    activations: {
        data: [
            {
                id: 1,
                status: 'pending' as const,
                amount: 10,
                payment_method: 'bank_transfer',
                requires_approval: true,
                project: { id: 'p1', name: 'Demo Project' },
                user: { id: 2, name: 'Client', email: 'client@example.com' },
                module: { id: 1, name: 'Conector IA' },
                renewal_at: null,
                created_at: '2026-08-20T12:00:00+00:00',
            },
        ],
        current_page: 1,
        last_page: 1,
        total: 1,
    },
    stats: { active_projects: 3, pending_approval: 1, revenue_this_month: 30 },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderPage = (props: any) => render(<AiConnectorIndex {...props} />);

describe('Admin AiConnector Index', () => {
    it('renders money values that arrive as decimal strings from Laravel', () => {
        // Regression: decimal:2 casts serialise as strings, and calling
        // .toFixed() on them threw and blanked the whole admin page.
        renderPage({
            ...baseProps,
            modules: [{ ...baseProps.modules[0], price: '10.00' }],
            activations: {
                ...baseProps.activations,
                data: [{ ...baseProps.activations.data[0], amount: '10.00' }],
            },
            stats: { ...baseProps.stats, revenue_this_month: '30.00' },
        });

        expect(screen.getByText('$30.00')).toBeInTheDocument();
        expect(screen.getByText(/\$10\.00 \/ month/)).toBeInTheDocument();
        expect(screen.getAllByText('$10.00').length).toBeGreaterThan(0);
    });

    it('renders numeric money values too', () => {
        renderPage(baseProps);
        expect(screen.getByText('$30.00')).toBeInTheDocument();
        expect(screen.getByText(/\$10\.00 \/ month/)).toBeInTheDocument();
    });

    it('shows approve and reject actions for activations awaiting approval', () => {
        renderPage(baseProps);
        expect(screen.getByText('Approve')).toBeInTheDocument();
        expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('shows "awaiting payment" for pending activations that need no approval', () => {
        renderPage({
            ...baseProps,
            activations: {
                ...baseProps.activations,
                data: [{ ...baseProps.activations.data[0], requires_approval: false }],
            },
        });
        expect(screen.queryByText('Approve')).not.toBeInTheDocument();
        expect(screen.getByText('Awaiting payment')).toBeInTheDocument();
    });

    it('does not crash on an unrecognised activation status', () => {
        renderPage({
            ...baseProps,
            activations: {
                ...baseProps.activations,
                data: [{ ...baseProps.activations.data[0], status: 'refunded' }],
            },
        });
        expect(screen.getByText('Demo Project')).toBeInTheDocument();
    });
});
