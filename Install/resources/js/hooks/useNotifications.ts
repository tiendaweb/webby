import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import type { UserNotification } from '@/types/notifications';

export interface UseNotificationsReturn {
    notifications: UserNotification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    addNotification: (notification: UserNotification) => void;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refetch: () => Promise<void>;
}

/**
 * Hook for managing notification state.
 */
export function useNotifications(initialUnreadCount: number = 0): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await axios.get('/api/notifications');
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unread_count);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
            setError('Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addNotification = useCallback((notification: UserNotification) => {
        if (notification.type === 'build_complete' || notification.type === 'build_failed') {
            return;
        }
        setNotifications(prev => [notification, ...prev]);
        if (!notification.read_at) {
            setUnreadCount(prev => prev + 1);
        }
    }, []);

    const markAsRead = useCallback(async (id: number) => {
        try {
            const response = await axios.post(`/api/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === id ? { ...n, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount(response.data.unread_count);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await axios.post('/api/notifications/read-all');
            setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        addNotification,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
    };
}
