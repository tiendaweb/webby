import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotifications } from '../useNotifications';
import type { UserNotification } from '@/types/notifications';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

import axios from 'axios';

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

describe('useNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for fetch
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                notifications: [],
                unread_count: 0,
            },
        });
        vi.mocked(axios.post).mockResolvedValue({ data: {} });
    });

    it('initializes with provided unread count', () => {
        const { result } = renderHook(() => useNotifications(5));
        expect(result.current.unreadCount).toBe(5);
    });

    it('initializes with empty notifications', () => {
        const { result } = renderHook(() => useNotifications(0));
        expect(result.current.notifications).toEqual([]);
    });

    it('fetches notifications on mount', async () => {
        renderHook(() => useNotifications(0));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/notifications');
        });
    });

    it('adds notification to the beginning of the list', () => {
        const { result } = renderHook(() => useNotifications(0));

        const newNotification = createNotification({ id: 1 });
        act(() => {
            result.current.addNotification(newNotification);
        });

        expect(result.current.notifications[0]).toEqual(newNotification);
        expect(result.current.unreadCount).toBe(1);
    });

    it('increments unread count when adding notification', () => {
        const { result } = renderHook(() => useNotifications(2));

        act(() => {
            result.current.addNotification(createNotification({ id: 1 }));
        });

        expect(result.current.unreadCount).toBe(3);
    });

    it('calls markAsRead API', async () => {
        const { result } = renderHook(() => useNotifications(1));

        await act(async () => {
            await result.current.markAsRead(1);
        });

        expect(axios.post).toHaveBeenCalledWith('/api/notifications/1/read');
    });

    it('calls markAllAsRead API', async () => {
        const { result } = renderHook(() => useNotifications(3));

        await act(async () => {
            await result.current.markAllAsRead();
        });

        expect(axios.post).toHaveBeenCalledWith('/api/notifications/read-all');
    });

    it('returns isLoading state', () => {
        const { result } = renderHook(() => useNotifications(0));
        expect(result.current).toHaveProperty('isLoading');
    });

    it('returns notifications array', () => {
        const { result } = renderHook(() => useNotifications(0));
        expect(Array.isArray(result.current.notifications)).toBe(true);
    });

    it('returns unreadCount number', () => {
        const { result } = renderHook(() => useNotifications(5));
        expect(typeof result.current.unreadCount).toBe('number');
    });

    it('returns markAsRead function', () => {
        const { result } = renderHook(() => useNotifications(0));
        expect(typeof result.current.markAsRead).toBe('function');
    });

    it('returns markAllAsRead function', () => {
        const { result } = renderHook(() => useNotifications(0));
        expect(typeof result.current.markAllAsRead).toBe('function');
    });

    it('returns addNotification function', () => {
        const { result } = renderHook(() => useNotifications(0));
        expect(typeof result.current.addNotification).toBe('function');
    });

    it('ignores build_complete notifications in addNotification', () => {
        const { result } = renderHook(() => useNotifications(0));

        act(() => {
            result.current.addNotification(createNotification({ id: 1, type: 'build_complete' }));
        });

        expect(result.current.notifications).toHaveLength(0);
        expect(result.current.unreadCount).toBe(0);
    });

    it('ignores build_failed notifications in addNotification', () => {
        const { result } = renderHook(() => useNotifications(0));

        act(() => {
            result.current.addNotification(createNotification({ id: 1, type: 'build_failed' }));
        });

        expect(result.current.notifications).toHaveLength(0);
        expect(result.current.unreadCount).toBe(0);
    });
});
