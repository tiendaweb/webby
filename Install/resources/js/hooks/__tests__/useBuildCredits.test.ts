import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { useBuildCredits } from '../useBuildCredits';

vi.mock('axios');

describe('useBuildCredits', () => {
    const initialCredits = {
        remaining: 50000,
        monthlyLimit: 100000,
        isUnlimited: false,
        usingOwnKey: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns initial credits on mount', () => {
        const { result } = renderHook(() => useBuildCredits(initialCredits));
        expect(result.current.credits).toEqual(initialCredits);
        expect(result.current.isRefreshing).toBe(false);
    });

    it('updates credits after refresh call', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                credits_remaining: 40000,
                monthly_limit: 100000,
                is_unlimited: false,
                using_own_key: false,
            },
        });

        const { result } = renderHook(() => useBuildCredits(initialCredits));

        await act(async () => {
            await result.current.refresh();
        });

        expect(result.current.credits.remaining).toBe(40000);
        expect(axios.get).toHaveBeenCalledWith('/billing/usage/stats');
    });

    it('maps API response fields correctly', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                credits_remaining: 25000,
                monthly_limit: 50000,
                is_unlimited: true,
                using_own_key: true,
            },
        });

        const { result } = renderHook(() => useBuildCredits(initialCredits));

        await act(async () => {
            await result.current.refresh();
        });

        expect(result.current.credits).toEqual({
            remaining: 25000,
            monthlyLimit: 50000,
            isUnlimited: true,
            usingOwnKey: true,
        });
    });

    it('sets isRefreshing during fetch', async () => {
        let resolvePromise: (value: unknown) => void;
        vi.mocked(axios.get).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvePromise = resolve;
                })
        );

        const { result } = renderHook(() => useBuildCredits(initialCredits));

        act(() => {
            result.current.refresh();
        });

        expect(result.current.isRefreshing).toBe(true);

        await act(async () => {
            resolvePromise!({
                data: {
                    credits_remaining: 40000,
                    monthly_limit: 100000,
                    is_unlimited: false,
                    using_own_key: false,
                },
            });
        });

        await waitFor(() => {
            expect(result.current.isRefreshing).toBe(false);
        });
    });

    it('handles API errors gracefully', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => useBuildCredits(initialCredits));

        await act(async () => {
            await result.current.refresh();
        });

        // Should keep original credits on error
        expect(result.current.credits).toEqual(initialCredits);
        expect(result.current.isRefreshing).toBe(false);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('refresh function is stable across renders', () => {
        const { result, rerender } = renderHook(() => useBuildCredits(initialCredits));

        const firstRefresh = result.current.refresh;
        rerender();
        const secondRefresh = result.current.refresh;

        expect(firstRefresh).toBe(secondRefresh);
    });
});
