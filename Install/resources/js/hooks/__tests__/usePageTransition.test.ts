import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePageTransition } from '../usePageTransition';

vi.mock('@inertiajs/react', () => ({
    router: {
        on: vi.fn(() => vi.fn()),
    },
}));

describe('usePageTransition', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns isNavigating false initially', () => {
        const { result } = renderHook(() => usePageTransition());
        expect(result.current.isNavigating).toBe(false);
    });

    it('returns destinationUrl null initially', () => {
        const { result } = renderHook(() => usePageTransition());
        expect(result.current.destinationUrl).toBe(null);
    });

    it('registers start and finish listeners', async () => {
        const { router } = await import('@inertiajs/react');
        renderHook(() => usePageTransition());
        expect(router.on).toHaveBeenCalledWith('start', expect.any(Function));
        expect(router.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
});
