import { useCallback, RefObject } from 'react';
import { toPng } from 'html-to-image';
import axios from 'axios';

/**
 * Hook to capture a thumbnail screenshot from an iframe and upload it to the server.
 * Used to automatically generate project thumbnails when builds complete.
 *
 * The capture is fire-and-forget - it never blocks the UI or shows errors to the user.
 */
export function useThumbnailCapture(
    iframeRef: RefObject<HTMLIFrameElement | null>,
    projectId?: string
) {
    const captureAndUpload = useCallback(async () => {
        if (!iframeRef.current || !projectId) return;

        try {
            const iframeDoc = iframeRef.current.contentDocument;
            if (!iframeDoc?.body) return;

            // Capture at 4:3 aspect ratio to match project card thumbnails
            const dataUrl = await toPng(iframeDoc.body, {
                width: 800,
                height: 600,
                canvasWidth: 800,
                canvasHeight: 600,
            });

            await axios.post(`/project/${projectId}/thumbnail`, {
                image: dataUrl,
            });
        } catch {
            // Fire-and-forget - silently fail
        }
    }, [iframeRef, projectId]);

    return { captureAndUpload };
}
