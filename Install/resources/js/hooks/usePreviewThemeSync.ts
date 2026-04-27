import { useEffect, useCallback, RefObject } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface UsePreviewThemeSyncOptions {
    /** Reference to the iframe element */
    iframeRef: RefObject<HTMLIFrameElement | null>;
    /** Whether the iframe is ready to receive messages */
    isReady: boolean;
}

/**
 * Hook for synchronizing theme between parent app and preview iframe.
 * Sends theme messages to iframe when theme changes or iframe becomes ready.
 */
export function usePreviewThemeSync({ iframeRef, isReady }: UsePreviewThemeSyncOptions) {
    const { resolvedTheme } = useTheme();

    const sendTheme = useCallback((theme: 'light' | 'dark') => {
        if (!iframeRef.current?.contentWindow) return;
        iframeRef.current.contentWindow.postMessage({
            type: 'inspector-set-theme',
            theme
        }, '*');
    }, [iframeRef]);

    // Send theme when ready or when it changes
    useEffect(() => {
        if (isReady && resolvedTheme) {
            sendTheme(resolvedTheme);
        }
    }, [isReady, resolvedTheme, sendTheme]);

    return { sendTheme };
}
