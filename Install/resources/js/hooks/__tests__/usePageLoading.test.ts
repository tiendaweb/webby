import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePageLoading } from '../usePageLoading';

vi.mock('@inertiajs/react', () => ({
    router: {
        on: vi.fn(() => vi.fn()),
    },
}));

describe('usePageLoading', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns isLoading false initially', () => {
        const { result } = renderHook(() => usePageLoading());
        expect(result.current.isLoading).toBe(false);
    });

    it('returns isRefreshing false initially', () => {
        const { result } = renderHook(() => usePageLoading());
        expect(result.current.isRefreshing).toBe(false);
    });

    it('registers start and finish listeners for Inertia navigation', async () => {
        const { router } = await import('@inertiajs/react');
        renderHook(() => usePageLoading());
        expect(router.on).toHaveBeenCalledWith('start', expect.any(Function));
        expect(router.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('sets isRefreshing true when startRefresh is called', () => {
        const { result } = renderHook(() => usePageLoading());

        act(() => {
            result.current.startRefresh();
        });

        expect(result.current.isRefreshing).toBe(true);
        expect(result.current.isLoading).toBe(true);
    });

    it('sets isRefreshing false when endRefresh is called', () => {
        const { result } = renderHook(() => usePageLoading());

        act(() => {
            result.current.startRefresh();
        });
        expect(result.current.isRefreshing).toBe(true);

        act(() => {
            result.current.endRefresh();
        });
        expect(result.current.isRefreshing).toBe(false);
        expect(result.current.isLoading).toBe(false);
    });

    it('isLoading reflects the combined state of navigation and refresh', () => {
        const { result } = renderHook(() => usePageLoading());

        // Initially both are false
        expect(result.current.isLoading).toBe(false);

        // When refreshing, isLoading should be true
        act(() => {
            result.current.startRefresh();
        });
        expect(result.current.isLoading).toBe(true);

        // After ending refresh, isLoading should be false
        act(() => {
            result.current.endRefresh();
        });
        expect(result.current.isLoading).toBe(false);
    });

    it('cleans up event listeners on unmount', async () => {
        const removeStart = vi.fn();
        const removeFinish = vi.fn();
        const { router } = await import('@inertiajs/react');
        vi.mocked(router.on)
            .mockReturnValueOnce(removeStart)
            .mockReturnValueOnce(removeFinish);

        const { unmount } = renderHook(() => usePageLoading());
        unmount();

        expect(removeStart).toHaveBeenCalled();
        expect(removeFinish).toHaveBeenCalled();
    });
});
