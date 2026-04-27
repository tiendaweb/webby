import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { BroadcastConfig } from './useBuilderPusher';
import type { UserNotification, CreditsUpdatedEvent, ProjectStatusEvent } from '@/types/notifications';

export interface UseUserChannelOptions {
    userId: number | null;
    broadcastConfig: BroadcastConfig | null;
    enabled?: boolean;
    onNotification?: (notification: UserNotification) => void;
    onCreditsUpdated?: (credits: CreditsUpdatedEvent) => void;
    onProjectStatus?: (status: ProjectStatusEvent) => void;
}

export interface UseUserChannelReturn {
    isConnected: boolean;
    error: string | null;
}

// Cache for Echo instances by config key
const echoInstances = new Map<string, InstanceType<typeof Echo>>();

function getConfigKey(config: BroadcastConfig): string {
    return config.provider === 'pusher'
        ? `${config.key}:${config.cluster}`
        : `${config.key}:${config.host}:${config.port}`;
}

function getEcho(config: BroadcastConfig): InstanceType<typeof Echo> {
    const configKey = getConfigKey(config);

    if (echoInstances.has(configKey)) {
        return echoInstances.get(configKey)!;
    }

    // Make Pusher available globally for Echo
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    let echoInstance: InstanceType<typeof Echo>;

    // Custom authorizer that uses axios so CSRF tokens are sent automatically
    const authorizer = (channel: { name: string }) => ({
        authorize: (socketId: string, callback: (error: Error | null, authData: { auth: string; channel_data?: string } | null) => void) => {
            axios.post('/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channel.name,
            }).then(response => {
                callback(null, response.data);
            }).catch(error => {
                callback(error instanceof Error ? error : new Error(String(error)), null);
            });
        },
    });

    if (config.provider === 'reverb') {
        const useTLS = config.scheme === 'https';
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: config.key,
            wsHost: config.host,
            wsPort: useTLS ? undefined : config.port,
            wssPort: useTLS ? config.port : undefined,
            forceTLS: useTLS,
            enabledTransports: ['ws', 'wss'],
            disableStats: true,
            authorizer,
        });
    } else {
        echoInstance = new Echo({
            broadcaster: 'pusher',
            key: config.key,
            cluster: config.cluster,
            forceTLS: true,
            disableStats: true,
            authorizer,
        });
    }
    echoInstances.set(configKey, echoInstance);
    return echoInstance;
}

/**
 * Hook for subscribing to user-specific private channel.
 * Handles notifications, credit updates, and project status events.
 */
export function useUserChannel(options: UseUserChannelOptions): UseUserChannelReturn {
    const { userId, broadcastConfig, enabled = true } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<ReturnType<InstanceType<typeof Echo>['private']> | null>(null);
    const optionsRef = useRef(options);

    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const subscribe = useCallback(() => {
        if (!enabled || !userId || !broadcastConfig?.key) {
            return;
        }

        try {
            const echo = getEcho(broadcastConfig);
            const channelName = `App.Models.User.${userId}`;

            // Subscribe to private channel
            const channel = echo.private(channelName);

            // Listen for notification events
            channel.listen('.notification', (data: UserNotification) => {
                optionsRef.current.onNotification?.(data);
            });

            // Listen for credits updated events
            channel.listen('.credits.updated', (data: CreditsUpdatedEvent) => {
                optionsRef.current.onCreditsUpdated?.(data);
            });

            // Listen for project status events
            channel.listen('.project.status', (data: ProjectStatusEvent) => {
                optionsRef.current.onProjectStatus?.(data);
            });

            channelRef.current = channel;
            setIsConnected(true);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect to user channel');
            setIsConnected(false);
        }
    }, [userId, broadcastConfig, enabled]);

    const unsubscribe = useCallback(() => {
        if (channelRef.current && broadcastConfig?.key && userId) {
            const echo = getEcho(broadcastConfig);
            echo.leave(`App.Models.User.${userId}`);
            channelRef.current = null;
            setIsConnected(false);
        }
    }, [userId, broadcastConfig]);

    // Subscribe when dependencies change
    useEffect(() => {
        if (enabled && userId && broadcastConfig?.key) {
            subscribe();
        }

        return () => {
            unsubscribe();
        };
    }, [enabled, userId, broadcastConfig, subscribe, unsubscribe]);

    return { isConnected, error };
}
