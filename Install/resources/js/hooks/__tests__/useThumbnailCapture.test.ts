import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThumbnailCapture } from '../useThumbnailCapture';
import { toPng } from 'html-to-image';
import axios from 'axios';

// Mock html-to-image
vi.mock('html-to-image', () => ({
    toPng: vi.fn(),
}));

// Mock axios - use auto-mock
vi.mock('axios');

const mockToPng = vi.mocked(toPng);
const mockAxiosPost = vi.mocked(axios.post);

describe('useThumbnailCapture', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default successful implementations
        mockToPng.mockResolvedValue('data:image/png;base64,mockImageData');
        mockAxiosPost.mockResolvedValue({ data: { success: true } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns captureAndUpload function', () => {
        const iframeRef = { current: null };
        const { result } = renderHook(() => useThumbnailCapture(iframeRef, 'project-123'));

        expect(result.current.captureAndUpload).toBeDefined();
        expect(typeof result.current.captureAndUpload).toBe('function');
    });

    it('returns early if iframeRef.current is null', async () => {
        const iframeRef = { current: null };

        const { result } = renderHook(() => useThumbnailCapture(iframeRef, 'project-123'));

        await act(async () => {
            await result.current.captureAndUpload();
        });

        expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('returns early if projectId is undefined', async () => {
        const mockIframe = {
            contentDocument: {
                body: document.createElement('body'),
            },
        } as unknown as HTMLIFrameElement;
        const iframeRef = { current: mockIframe };

        const { result } = renderHook(() => useThumbnailCapture(iframeRef, undefined));

        await act(async () => {
            await result.current.captureAndUpload();
        });

        expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('returns early if iframe has no contentDocument', async () => {
        const mockIframe = {
            contentDocument: null,
        } as unknown as HTMLIFrameElement;
        const iframeRef = { current: mockIframe };

        const { result } = renderHook(() => useThumbnailCapture(iframeRef, 'project-123'));

        await act(async () => {
            await result.current.captureAndUpload();
        });

        expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('captures and uploads thumbnail successfully', async () => {
        const mockBody = document.createElement('body');
        const mockIframe = {
            contentDocument: {
                body: mockBody,
            },
        } as unknown as HTMLIFrameElement;
        const iframeRef = { current: mockIframe };

        const { result } = renderHook(() => useThumbnailCapture(iframeRef, 'project-123'));

        await act(async () => {
            await result.current.captureAndUpload();
        });

        expect(mockToPng).toHaveBeenCalledWith(mockBody, {
            width: 800,
            height: 600,
            canvasWidth: 800,
            canvasHeight: 600,
        });
        expect(mockAxiosPost).toHaveBeenCalledWith('/project/project-123/thumbnail', {
            image: 'data:image/png;base64,mockImageData',
        });
    });

    it('does not throw when capture fails (fire-and-forget)', async () => {
        mockToPng.mockRejectedValue(new Error('Capture failed'));

        const mockBody = document.createElement('body');
        const mockIframe = {
            contentDocument: {
                body: mockBody,
            },
        } as unknown as HTMLIFrameElement;
        const iframeRef = { current: mockIframe };

        const { result } = renderHook(() => useThumbnailCapture(iframeRef, 'project-123'));

        // Should not throw - silently fails
        await expect(
            act(async () => {
                await result.current.captureAndUpload();
            })
        ).resolves.not.toThrow();
    });

    it('does not throw when upload fails (fire-and-forget)', async () => {
        // Clear all mocks from beforeEach and set up specific behavior
        vi.clearAllMocks();
        mockToPng.mockResolvedValue('data:image/png;base64,mockImageData');
        mockAxiosPost.mockRejectedValue(new Error('Upload failed'));

        const mockBody = document.createElement('body');
        const mockIframe = {
            contentDocument: {
                body: mockBody,
            },
        } as unknown as HTMLIFrameElement;
        const iframeRef = { current: mockIframe };

        const { result } = renderHook(() => useThumbnailCapture(iframeRef, 'project-123'));

        // Should not throw - silently fails
        await act(async () => {
            await result.current.captureAndUpload();
        });

        expect(mockToPng).toHaveBeenCalled();
        expect(mockAxiosPost).toHaveBeenCalled();
    });
});
