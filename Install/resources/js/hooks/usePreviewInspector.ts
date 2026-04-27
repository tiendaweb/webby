import { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import type {
    InspectorElement,
    PendingEdit,
    InspectorMode,
    ContextMenuState,
    UsePreviewInspectorReturn,
    InspectorToParentMessage,
    ParentToInspectorMessage,
} from '@/types/inspector';

interface UsePreviewInspectorOptions {
    /** Reference to the iframe element */
    iframeRef: RefObject<HTMLIFrameElement>;
    /** Whether the inspector is enabled (e.g., Inspect tab is active) */
    enabled: boolean;
    /** Callback when an element is selected for mentioning in chat */
    onElementSelect?: (element: InspectorElement) => void;
    /** Callback when an edit is made */
    onElementEdit?: (edit: PendingEdit) => void;
}

/**
 * Hook for managing preview element inspector state and communication.
 * Handles postMessage communication with the inspector script in the iframe.
 */
export function usePreviewInspector({
    iframeRef,
    enabled,
    onElementSelect,
    onElementEdit,
}: UsePreviewInspectorOptions): UsePreviewInspectorReturn {
    const { t } = useTranslation();
    // Default to 'inspect' mode when enabled - this is more intuitive for users
    const [inspectorMode, setInspectorModeState] = useState<InspectorMode>('inspect');
    const [hoveredElement, setHoveredElement] = useState<InspectorElement | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);
    const [isReady, setIsReady] = useState(false);

    // Track if iframe has loaded the inspector script
    const inspectorReadyRef = useRef(false);

    /**
     * Send a message to the iframe.
     */
    const sendToIframe = useCallback((message: ParentToInspectorMessage) => {
        if (!iframeRef.current?.contentWindow) return;
        iframeRef.current.contentWindow.postMessage(message, '*');
    }, [iframeRef]);

    /**
     * Set the inspector mode and notify iframe.
     */
    const setInspectorMode = useCallback((mode: InspectorMode) => {
        setInspectorModeState(mode);
        sendToIframe({ type: 'inspector-set-mode', mode });
    }, [sendToIframe]);

    /**
     * Close the context menu.
     */
    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    /**
     * Add a pending edit.
     */
    const addPendingEdit = useCallback((edit: PendingEdit) => {
        setPendingEdits(prev => {
            // Replace if editing same element and field
            const existingIndex = prev.findIndex(
                e => e.element.cssSelector === edit.element.cssSelector && e.field === edit.field
            );
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = edit;
                return updated;
            }
            return [...prev, edit];
        });
        onElementEdit?.(edit);
    }, [onElementEdit]);

    /**
     * Remove a pending edit by id.
     */
    const removePendingEdit = useCallback((id: string) => {
        setPendingEdits(prev => prev.filter(e => e.id !== id));
    }, []);

    /**
     * Clear all pending edits.
     */
    const clearPendingEdits = useCallback(() => {
        setPendingEdits([]);
    }, []);

    /**
     * Handle messages from the iframe inspector script.
     */
    const handleMessage = useCallback((event: MessageEvent<InspectorToParentMessage>) => {
        const data = event.data;
        if (!data || typeof data.type !== 'string' || !data.type.startsWith('inspector-')) {
            return;
        }

        switch (data.type) {
            case 'inspector-ready':
                inspectorReadyRef.current = true;
                setIsReady(true);
                // Send translations to iframe
                sendToIframe({
                    type: 'inspector-set-translations',
                    translations: {
                        Save: t('Save'),
                        Cancel: t('Cancel'),
                    },
                } as ParentToInspectorMessage);
                // Send current mode to iframe
                if (enabled && inspectorMode !== 'preview') {
                    sendToIframe({ type: 'inspector-set-mode', mode: inspectorMode });
                }
                break;

            case 'inspector-element-hover':
                setHoveredElement(data.element);
                break;

            case 'inspector-element-click':
                if (inspectorMode === 'inspect' && iframeRef.current) {
                    // Adjust position to account for iframe offset in the page
                    const iframeRect = iframeRef.current.getBoundingClientRect();
                    setContextMenu({
                        element: data.element,
                        position: {
                            x: data.position.x + iframeRect.left,
                            y: data.position.y + iframeRect.top,
                        },
                    });
                }
                break;

            case 'inspector-element-edited':
                addPendingEdit(data.edit);
                break;

            case 'inspector-edit-cancelled':
                // Could remove from pending edits if needed
                break;
        }
    }, [enabled, inspectorMode, sendToIframe, addPendingEdit, iframeRef, t]);

    /**
     * Set up message listener.
     */
    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [handleMessage]);

    /**
     * Update iframe mode when enabled state changes.
     */
    useEffect(() => {
        if (!inspectorReadyRef.current) return;

        if (enabled) {
            // Always send current mode to iframe when enabled
            sendToIframe({ type: 'inspector-set-mode', mode: inspectorMode });
        } else {
            // When disabled (e.g., switching away from Inspect tab), set to preview mode
            sendToIframe({ type: 'inspector-set-mode', mode: 'preview' });
            setContextMenu(null);
            setHoveredElement(null);
        }
    }, [enabled, inspectorMode, sendToIframe]);

    /**
     * Send translations to iframe when ready or when translations change.
     */
    useEffect(() => {
        if (!isReady) return;

        sendToIframe({
            type: 'inspector-set-translations',
            translations: {
                Save: t('Save'),
                Cancel: t('Cancel'),
            },
        } as ParentToInspectorMessage);
    }, [isReady, t, sendToIframe]);

    /**
     * Reset ready state when iframe src changes.
     * Uses MutationObserver to detect src attribute changes before load completes,
     * avoiding race conditions with the inspector-ready message.
     */
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        // Use MutationObserver to detect src changes before load completes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    inspectorReadyRef.current = false;
                    setIsReady(false);
                }
            }
        });

        observer.observe(iframe, { attributes: true, attributeFilter: ['src'] });

        // Also handle the key prop change case (iframe remount) - this is handled
        // by the initial false state when the hook first runs

        return () => {
            observer.disconnect();
        };
    }, [iframeRef]);

    /**
     * Handle element selection for mentioning in chat.
     */
    const handleElementSelect = useCallback((element: InspectorElement) => {
        onElementSelect?.(element);
        closeContextMenu();
    }, [onElementSelect, closeContextMenu]);

    /**
     * Start editing a specific element by its selector.
     */
    const startEditingElement = useCallback((selector: string) => {
        sendToIframe({ type: 'inspector-edit-element', selector });
    }, [sendToIframe]);

    /**
     * Revert edits in the iframe (restore original values).
     * Uses direct DOM manipulation since we have same-origin access.
     */
    const revertEdits = useCallback((edits: PendingEdit[]) => {
        if (edits.length === 0) return;

        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;

        for (const edit of edits) {
            try {
                const element = iframeDoc.querySelector(edit.element.cssSelector) as HTMLElement;
                if (!element) continue;

                if (edit.field === 'text') {
                    element.textContent = edit.originalValue;
                } else {
                    // For attributes like href, src, alt, placeholder, title
                    element.setAttribute(edit.field, edit.originalValue);
                }
            } catch {
                console.warn('Failed to revert edit for selector:', edit.element.cssSelector);
            }
        }
    }, [iframeRef]);

    return {
        inspectorMode,
        setInspectorMode,
        hoveredElement,
        contextMenu,
        closeContextMenu,
        pendingEdits,
        addPendingEdit,
        removePendingEdit,
        clearPendingEdits,
        isReady,
        startEditingElement,
        revertEdits,
        // Internal helper for context menu actions
        _handleElementSelect: handleElementSelect,
    } as UsePreviewInspectorReturn & { _handleElementSelect: (element: InspectorElement) => void };
}

export type { UsePreviewInspectorOptions };
