import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';

interface UsePageLoadingReturn {
    /** True during initial page load or manual refresh */
    isLoading: boolean;
    /** True only during manual refresh operations */
    isRefreshing: boolean;
    /** Call this to start showing skeleton during a refresh operation */
    startRefresh: () => void;
    /** Call this when refresh completes to hide the skeleton */
    endRefresh: () => void;
}

/**
 * Hook to manage loading states for pages with skeleton loading.
 *
 * Handles two types of loading:
 * 1. Initial page navigation (detected via Inertia router events)
 * 2. Manual refresh operations (controlled via startRefresh/endRefresh)
 *
 * @example
 * ```tsx
 * const { isLoading, startRefresh, endRefresh } = usePageLoading();
 *
 * const handleRefresh = () => {
 *     startRefresh();
 *     router.reload({ onFinish: endRefresh });
 * };
 *
 * return isLoading ? <PageSkeleton /> : <ActualContent />;
 * ```
 */
export function usePageLoading(): UsePageLoadingReturn {
    const [isNavigating, setIsNavigating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        // Track Inertia navigation events
        const removeStart = router.on('start', () => setIsNavigating(true));
        const removeFinish = router.on('finish', () => setIsNavigating(false));

        return () => {
            removeStart();
            removeFinish();
        };
    }, []);

    const startRefresh = useCallback(() => {
        setIsRefreshing(true);
    }, []);

    const endRefresh = useCallback(() => {
        setIsRefreshing(false);
    }, []);

    return {
        isLoading: isNavigating || isRefreshing,
        isRefreshing,
        startRefresh,
        endRefresh,
    };
}
