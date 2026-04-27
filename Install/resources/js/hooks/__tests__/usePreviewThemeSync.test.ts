/**
 * Tests for usePreviewThemeSync hook.
 * Tests theme synchronization between parent app and preview iframe.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePreviewThemeSync } from '../usePreviewThemeSync';
import type { RefObject } from 'react';

// Mock useTheme hook from ThemeContext
let mockResolvedTheme: 'light' | 'dark' = 'light';
vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({
        resolvedTheme: mockResolvedTheme,
        theme: mockResolvedTheme,
        setTheme: vi.fn(),
    }),
}));

describe('usePreviewThemeSync', () => {
    let iframeRef: RefObject<HTMLIFrameElement | null>;
    let mockPostMessage: ReturnType<typeof vi.fn>;
    let mockIframe: HTMLIFrameElement;

    beforeEach(() => {
        mockResolvedTheme = 'light';
        mockPostMessage = vi.fn();

        // Create a real iframe element for proper typing
        mockIframe = document.createElement('iframe');
        Object.defineProperty(mockIframe, 'contentWindow', {
            value: { postMessage: mockPostMessage },
            writable: true,
        });

        iframeRef = { current: mockIframe };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('theme synchronization', () => {
        it('sends theme to iframe when ready', () => {
            renderHook(() =>
                usePreviewThemeSync({
                    iframeRef,
                    isReady: true,
                })
            );

            expect(mockPostMessage).toHaveBeenCalledWith(
                { type: 'inspector-set-theme', theme: 'light' },
                '*'
            );
        });

        it('does not send theme when not ready', () => {
            renderHook(() =>
                usePreviewThemeSync({
                    iframeRef,
                    isReady: false,
                })
            );

            expect(mockPostMessage).not.toHaveBeenCalled();
        });

        it('sends theme when isReady changes to true', () => {
            const { rerender } = renderHook(
                ({ isReady }) =>
                    usePreviewThemeSync({
                        iframeRef,
                        isReady,
                    }),
                { initialProps: { isReady: false } }
            );

            expect(mockPostMessage).not.toHaveBeenCalled();

            rerender({ isReady: true });

            expect(mockPostMessage).toHaveBeenCalledWith(
                { type: 'inspector-set-theme', theme: 'light' },
                '*'
            );
        });

        it('sends dark theme when resolved theme is dark', () => {
            mockResolvedTheme = 'dark';

            renderHook(() =>
                usePreviewThemeSync({
                    iframeRef,
                    isReady: true,
                })
            );

            expect(mockPostMessage).toHaveBeenCalledWith(
                { type: 'inspector-set-theme', theme: 'dark' },
                '*'
            );
        });
    });

    describe('sendTheme function', () => {
        it('returns sendTheme function', () => {
            const { result } = renderHook(() =>
                usePreviewThemeSync({
                    iframeRef,
                    isReady: false,
                })
            );

            expect(result.current.sendTheme).toBeDefined();
            expect(typeof result.current.sendTheme).toBe('function');
        });

        it('sendTheme can manually send theme', () => {
            const { result } = renderHook(() =>
                usePreviewThemeSync({
                    iframeRef,
                    isReady: false,
                })
            );

            act(() => {
                result.current.sendTheme('dark');
            });

            expect(mockPostMessage).toHaveBeenCalledWith(
                { type: 'inspector-set-theme', theme: 'dark' },
                '*'
            );
        });

        it('sendTheme does nothing when iframe is null', () => {
            const nullRef: RefObject<HTMLIFrameElement | null> = { current: null };

            const { result } = renderHook(() =>
                usePreviewThemeSync({
                    iframeRef: nullRef,
                    isReady: true,
                })
            );

            act(() => {
                result.current.sendTheme('light');
            });

            // No error should occur
            expect(mockPostMessage).not.toHaveBeenCalled();
        });

        it('sendTheme does nothing when contentWindow is null', () => {
            const iframeWithoutWindow = document.createElement('iframe');
            const refWithoutWindow: RefObject<HTMLIFrameElement | null> = {
                current: iframeWithoutWindow,
            };

            const { result } = renderHook(() =>
                usePreviewThemeSync({
                    iframeRef: refWithoutWindow,
                    isReady: true,
                })
            );

            act(() => {
                result.current.sendTheme('light');
            });

            // No error should occur
            expect(mockPostMessage).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('handles null iframe ref gracefully', () => {
            const nullRef: RefObject<HTMLIFrameElement | null> = { current: null };

            // Should not throw
            expect(() => {
                renderHook(() =>
                    usePreviewThemeSync({
                        iframeRef: nullRef,
                        isReady: true,
                    })
                );
            }).not.toThrow();
        });

        it('handles undefined resolvedTheme gracefully', () => {
            mockResolvedTheme = undefined as unknown as 'light' | 'dark';

            // Should not throw or send message
            renderHook(() =>
                usePreviewThemeSync({
                    iframeRef,
                    isReady: true,
                })
            );

            // With undefined theme, it should not send
            expect(mockPostMessage).not.toHaveBeenCalled();
        });
    });
});
