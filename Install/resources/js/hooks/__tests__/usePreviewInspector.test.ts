/**
 * Tests for usePreviewInspector hook.
 * Tests postMessage communication and state management.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePreviewInspector } from '../usePreviewInspector';
import type { InspectorElement, PendingEdit } from '@/types/inspector';

// Mock element data
const mockElement: InspectorElement = {
    id: 'el-123',
    tagName: 'button',
    elementId: 'submit-btn',
    classNames: ['btn', 'primary'],
    textPreview: 'Submit',
    xpath: '//*[@id="submit-btn"]',
    cssSelector: '#submit-btn',
    boundingRect: { top: 100, left: 200, width: 100, height: 40 },
    attributes: { title: 'Click to submit' },
    parentTagName: 'div',
};

const mockEdit: PendingEdit = {
    id: 'edit-123',
    element: mockElement,
    field: 'text',
    originalValue: 'Submit',
    newValue: 'Save',
    timestamp: new Date(),
};

describe('usePreviewInspector', () => {
    let iframeRef: { current: HTMLIFrameElement | null };
    let mockContentWindow: { postMessage: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        // Create mock iframe with src property for MutationObserver
        mockContentWindow = { postMessage: vi.fn() };
        const mockIframe = document.createElement('iframe');
        mockIframe.src = 'http://localhost/preview';
        Object.defineProperty(mockIframe, 'contentWindow', {
            value: mockContentWindow,
            writable: true,
        });
        Object.defineProperty(mockIframe, 'contentDocument', {
            value: null,
            writable: true,
        });
        vi.spyOn(mockIframe, 'getBoundingClientRect').mockReturnValue({
            top: 50,
            left: 100,
            width: 800,
            height: 600,
            bottom: 650,
            right: 900,
            x: 100,
            y: 50,
            toJSON: () => ({}),
        });
        iframeRef = { current: mockIframe };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('starts with inspect mode (default for better UX)', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: false,
                })
            );

            expect(result.current.inspectorMode).toBe('inspect');
        });

        it('starts with no hovered element', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: false,
                })
            );

            expect(result.current.hoveredElement).toBeNull();
        });

        it('starts with empty pending edits', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: false,
                })
            );

            expect(result.current.pendingEdits).toEqual([]);
        });

        it('starts with isReady false', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: false,
                })
            );

            expect(result.current.isReady).toBe(false);
        });
    });

    describe('mode changes', () => {
        it('changes inspector mode', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            act(() => {
                result.current.setInspectorMode('edit');
            });

            expect(result.current.inspectorMode).toBe('edit');
        });

        it('sends mode change to iframe', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            act(() => {
                result.current.setInspectorMode('inspect');
            });

            expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
                { type: 'inspector-set-mode', mode: 'inspect' },
                '*'
            );
        });
    });

    describe('postMessage handling', () => {
        it('handles inspector-ready message', async () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            // Simulate ready message from iframe
            act(() => {
                const event = new MessageEvent('message', {
                    data: { type: 'inspector-ready' },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
        });

        it('handles inspector-element-hover message', async () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            act(() => {
                const event = new MessageEvent('message', {
                    data: { type: 'inspector-element-hover', element: mockElement },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(result.current.hoveredElement).toEqual(mockElement);
            });
        });

        it('handles inspector-element-click message in inspect mode', async () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            // Set to inspect mode first
            act(() => {
                result.current.setInspectorMode('inspect');
            });

            // Simulate click event
            act(() => {
                const event = new MessageEvent('message', {
                    data: {
                        type: 'inspector-element-click',
                        element: mockElement,
                        position: { x: 100, y: 200 },
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                // Position includes iframe offset (left: 100, top: 50)
                expect(result.current.contextMenu).toEqual({
                    element: mockElement,
                    position: { x: 200, y: 250 },
                });
            });
        });

        it('handles inspector-element-edited message', async () => {
            const onElementEdit = vi.fn();
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                    onElementEdit,
                })
            );

            act(() => {
                const event = new MessageEvent('message', {
                    data: { type: 'inspector-element-edited', edit: mockEdit },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(result.current.pendingEdits).toContainEqual(mockEdit);
                expect(onElementEdit).toHaveBeenCalledWith(mockEdit);
            });
        });

        it('ignores non-webby messages', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            act(() => {
                const event = new MessageEvent('message', {
                    data: { type: 'some-other-message' },
                });
                window.dispatchEvent(event);
            });

            // State should remain unchanged
            expect(result.current.hoveredElement).toBeNull();
            expect(result.current.contextMenu).toBeNull();
        });
    });

    describe('context menu', () => {
        it('closes context menu', async () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            // Set to inspect mode and simulate click
            act(() => {
                result.current.setInspectorMode('inspect');
            });

            act(() => {
                const event = new MessageEvent('message', {
                    data: {
                        type: 'inspector-element-click',
                        element: mockElement,
                        position: { x: 100, y: 200 },
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(result.current.contextMenu).not.toBeNull();
            });

            act(() => {
                result.current.closeContextMenu();
            });

            expect(result.current.contextMenu).toBeNull();
        });
    });

    describe('pending edits', () => {
        it('adds pending edit', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            act(() => {
                result.current.addPendingEdit(mockEdit);
            });

            expect(result.current.pendingEdits).toContainEqual(mockEdit);
        });

        it('replaces edit for same element and field', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            const updatedEdit: PendingEdit = {
                ...mockEdit,
                id: 'edit-456',
                newValue: 'Updated Value',
            };

            act(() => {
                result.current.addPendingEdit(mockEdit);
            });

            act(() => {
                result.current.addPendingEdit(updatedEdit);
            });

            expect(result.current.pendingEdits).toHaveLength(1);
            expect(result.current.pendingEdits[0].newValue).toBe('Updated Value');
        });

        it('removes pending edit by id', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            act(() => {
                result.current.addPendingEdit(mockEdit);
            });

            act(() => {
                result.current.removePendingEdit(mockEdit.id);
            });

            expect(result.current.pendingEdits).toHaveLength(0);
        });

        it('clears all pending edits', () => {
            const { result } = renderHook(() =>
                usePreviewInspector({
                    iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                    enabled: true,
                })
            );

            const edit2 = { ...mockEdit, id: 'edit-456' };

            act(() => {
                result.current.addPendingEdit(mockEdit);
                result.current.addPendingEdit(edit2);
            });

            act(() => {
                result.current.clearPendingEdits();
            });

            expect(result.current.pendingEdits).toHaveLength(0);
        });
    });

    describe('enabled state', () => {
        it('sends preview mode when disabled', async () => {
            // First enable, receive ready message
            const { result, rerender } = renderHook(
                ({ enabled }) =>
                    usePreviewInspector({
                        iframeRef: iframeRef as React.RefObject<HTMLIFrameElement>,
                        enabled,
                    }),
                { initialProps: { enabled: true } }
            );

            // Simulate ready message
            act(() => {
                const event = new MessageEvent('message', {
                    data: { type: 'inspector-ready' },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            mockContentWindow.postMessage.mockClear();

            // Disable
            rerender({ enabled: false });

            await waitFor(() => {
                expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
                    { type: 'inspector-set-mode', mode: 'preview' },
                    '*'
                );
            });
        });
    });
});
