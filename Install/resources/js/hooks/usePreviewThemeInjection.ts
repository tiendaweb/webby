import { useCallback, type RefObject } from 'react';
import { getThemePreset } from '@/lib/theme-presets';

export function usePreviewThemeInjection(iframeRef: RefObject<HTMLIFrameElement | null>) {
    const applyThemeToPreview = useCallback((presetId: string) => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        const preset = getThemePreset(presetId);
        if (!preset) return;

        // Send message using existing inspector protocol
        iframe.contentWindow.postMessage({
            type: 'inspector-apply-theme',
            light: preset.light,
            dark: preset.dark,
        }, '*');
    }, [iframeRef]);

    return { applyThemeToPreview };
}
