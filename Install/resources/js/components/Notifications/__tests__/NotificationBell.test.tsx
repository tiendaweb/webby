import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationBell } from '../NotificationBell';
import type { UserNotification } from '@/types/notifications';

// Mock useTranslation
vi.mock('@/contexts/LanguageContext', () => ({
    useTranslation: () => ({
        t: (key: string, replacements?: Record<string, string | number>) => {
            if (replacements) {
                return key.replace(':count', String(replacements.count));
            }
            return key;
        },
    }),
}));

// Mock Inertia router
vi.mock('@inertiajs/react', () => ({
    router: {
        visit: vi.fn(),
    },
}));

const createNotification = (overrides: Partial<UserNotification> = {}): UserNotification => ({
    id: 1,
    type: 'credits_low',
    title: 'Credits Running Low',
    message: 'You have less than 20% of your monthly credits remaining.',
    data: null,
    action_url: '/billing',
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
});

describe('NotificationBell', () => {
    const defaultProps = {
        notifications: [] as UserNotification[],
        unreadCount: 0,
        onMarkAsRead: vi.fn(),
        onMarkAllAsRead: vi.fn(),
        isLoading: false,
    };

    it('renders bell icon button', () => {
        render(<NotificationBell {...defaultProps} />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows unread count badge when count is greater than 0', () => {
        render(<NotificationBell {...defaultProps} unreadCount={5} />);
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows 9+ when unread count exceeds 9', () => {
        render(<NotificationBell {...defaultProps} unreadCount={15} />);
        expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('does not show badge when unread count is 0', () => {
        render(<NotificationBell {...defaultProps} unreadCount={0} />);
        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('shows badge with count 1', () => {
        render(<NotificationBell {...defaultProps} unreadCount={1} />);
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows badge with count 9', () => {
        render(<NotificationBell {...defaultProps} unreadCount={9} />);
        expect(screen.getByText('9')).toBeInTheDocument();
    });

    it('renders with notifications prop', () => {
        const notifications = [createNotification()];
        render(
            <NotificationBell
                {...defaultProps}
                notifications={notifications}
                unreadCount={1}
            />
        );
        // Component should render without errors
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('accepts isLoading prop', () => {
        render(<NotificationBell {...defaultProps} isLoading={true} />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with multiple notifications', () => {
        const notifications = [
            createNotification({ id: 1, type: 'subscription_renewed' }),
            createNotification({ id: 2, type: 'payment_completed' }),
            createNotification({ id: 3, type: 'credits_low' }),
        ];
        render(
            <NotificationBell
                {...defaultProps}
                notifications={notifications}
                unreadCount={3}
            />
        );
        expect(screen.getByText('3')).toBeInTheDocument();
    });
});
