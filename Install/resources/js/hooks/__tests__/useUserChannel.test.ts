import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserChannel } from '../useUserChannel';
import type { BroadcastConfig } from '../useBuilderPusher';

// Mock Echo and Pusher
const mockChannel = {
    listen: vi.fn().mockReturnThis(),
};

const mockEcho = {
    private: vi.fn().mockReturnValue(mockChannel),
    leave: vi.fn(),
};

// Reset the echo instances cache before each test
vi.mock('laravel-echo', () => ({
    default: vi.fn().mockImplementation(() => mockEcho),
}));

vi.mock('pusher-js', () => ({
    default: vi.fn(),
}));

describe('useUserChannel', () => {
    const defaultConfig: BroadcastConfig = {
        provider: 'pusher',
        key: 'test-key',
        cluster: 'mt1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockChannel.listen.mockReturnThis();
        mockEcho.private.mockReturnValue(mockChannel);
    });

    it('does not subscribe when disabled', () => {
        const { result } = renderHook(() =>
            useUserChannel({
                userId: 1,
                broadcastConfig: defaultConfig,
                enabled: false,
            })
        );

        expect(result.current.isConnected).toBe(false);
    });

    it('does not subscribe when userId is null', () => {
        const { result } = renderHook(() =>
            useUserChannel({
                userId: null,
                broadcastConfig: defaultConfig,
                enabled: true,
            })
        );

        expect(result.current.isConnected).toBe(false);
    });

    it('does not subscribe when broadcastConfig is null', () => {
        const { result } = renderHook(() =>
            useUserChannel({
                userId: 1,
                broadcastConfig: null,
                enabled: true,
            })
        );

        expect(result.current.isConnected).toBe(false);
    });

    it('does not subscribe when broadcastConfig has no key', () => {
        const { result } = renderHook(() =>
            useUserChannel({
                userId: 1,
                broadcastConfig: { ...defaultConfig, key: '' },
                enabled: true,
            })
        );

        expect(result.current.isConnected).toBe(false);
    });

    it('returns error as null when not connected', () => {
        const { result } = renderHook(() =>
            useUserChannel({
                userId: null,
                broadcastConfig: defaultConfig,
                enabled: true,
            })
        );

        expect(result.current.error).toBeNull();
    });

    it('accepts onNotification callback', () => {
        const onNotification = vi.fn();
        const { result } = renderHook(() =>
            useUserChannel({
                userId: 1,
                broadcastConfig: defaultConfig,
                enabled: true,
                onNotification,
            })
        );

        // Hook should render without error
        expect(result.current).toBeDefined();
    });

    it('accepts onCreditsUpdated callback', () => {
        const onCreditsUpdated = vi.fn();
        const { result } = renderHook(() =>
            useUserChannel({
                userId: 1,
                broadcastConfig: defaultConfig,
                enabled: true,
                onCreditsUpdated,
            })
        );

        // Hook should render without error
        expect(result.current).toBeDefined();
    });

    it('accepts onProjectStatus callback', () => {
        const onProjectStatus = vi.fn();
        const { result } = renderHook(() =>
            useUserChannel({
                userId: 1,
                broadcastConfig: defaultConfig,
                enabled: true,
                onProjectStatus,
            })
        );

        // Hook should render without error
        expect(result.current).toBeDefined();
    });

    it('returns isConnected and error in result', () => {
        const { result } = renderHook(() =>
            useUserChannel({
                userId: 1,
                broadcastConfig: defaultConfig,
                enabled: true,
            })
        );

        expect(result.current).toHaveProperty('isConnected');
        expect(result.current).toHaveProperty('error');
    });
});
