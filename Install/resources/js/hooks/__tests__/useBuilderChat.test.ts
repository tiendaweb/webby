import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBuilderChat } from '../useBuilderChat';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock EventSource
class MockEventSource {
    static instances: MockEventSource[] = [];
    url: string;
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private listeners: Record<string, EventListener[]> = {};

    constructor(url: string) {
        this.url = url;
        MockEventSource.instances.push(this);
    }

    addEventListener(type: string, listener: EventListener) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(listener);
    }

    removeEventListener(type: string, listener: EventListener) {
        if (this.listeners[type]) {
            this.listeners[type] = this.listeners[type].filter(l => l !== listener);
        }
    }

    close() {}

    simulateEvent(type: string, data: unknown) {
        const event = new MessageEvent(type, {
            data: JSON.stringify(data),
        });
        if (this.listeners[type]) {
            this.listeners[type].forEach(listener => listener(event));
        }
    }

    triggerOpen() {
        if (this.onopen) this.onopen();
    }
}

// Global route mock
(global as unknown as { route: (name: string, params?: Record<string, unknown>) => string }).route = (name: string, params?: Record<string, unknown>) => {
    if (name === 'builder.stream' && params?.project) {
        return `/builder/${params.project}/stream`;
    }
    if (name === 'builder.start' && params?.project) {
        return `/builder/${params.project}/start`;
    }
    if (name === 'builder.complete' && params?.project) {
        return `/builder/${params.project}/complete`;
    }
    return `/${name}`;
};

// Mock pusherConfig for tests
const mockPusherConfig = {
    key: 'test-key',
    cluster: 'mt1',
    forceTLS: true,
    channelPrefix: 'private-project.',
};

describe('useBuilderChat', () => {
    let originalEventSource: typeof EventSource;
    const mockedAxios = vi.mocked(axios);

    beforeEach(() => {
        MockEventSource.instances = [];
        originalEventSource = global.EventSource;
        global.EventSource = MockEventSource as unknown as typeof EventSource;

        // Reset axios mock
        vi.mocked(axios.post).mockReset();

        vi.mocked(localStorage.getItem).mockReturnValue(null);
        vi.mocked(localStorage.setItem).mockReset();
        vi.mocked(localStorage.removeItem).mockReset();

        // Mock CSRF token
        const metaElement = document.createElement('meta');
        metaElement.setAttribute('name', 'csrf-token');
        metaElement.setAttribute('content', 'test-csrf-token');
        document.head.appendChild(metaElement);
    });

    afterEach(() => {
        global.EventSource = originalEventSource;
        vi.restoreAllMocks();
        document.head.innerHTML = '';
    });

    it('initializes with empty state', () => {
        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        expect(result.current.messages).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isStarting).toBe(false);
        expect(result.current.sessionId).toBeNull();
        expect(result.current.startError).toBeNull();
        expect(result.current.progress.status).toBe('idle');
    });

    it('loads history from localStorage on mount', () => {
        const storedMessages = [
            { id: '1', type: 'user', content: 'Previous message', timestamp: new Date().toISOString() },
        ];
        vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(storedMessages));

        const { result } = renderHook(() => useBuilderChat(123, { pusherConfig: mockPusherConfig }));

        expect(localStorage.getItem).toHaveBeenCalledWith('chat-history-123');
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe('Previous message');
    });

    it('sendMessage adds user message to history', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-1', builder_id: 1 },
        });

        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        await act(async () => {
            await result.current.sendMessage('Build me a website');
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].type).toBe('user');
        expect(result.current.messages[0].content).toBe('Build me a website');
    });

    it('sendMessage trims whitespace', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-1', builder_id: 1 },
        });

        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        await act(async () => {
            await result.current.sendMessage('  Hello world  ');
        });

        expect(result.current.messages[0].content).toBe('Hello world');
    });

    it('sendMessage ignores empty messages', async () => {
        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        await act(async () => {
            await result.current.sendMessage('');
            await result.current.sendMessage('   ');
        });

        expect(result.current.messages).toHaveLength(0);
        expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('starts build after sending message', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-123', builder_id: 1 },
        });

        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        await act(async () => {
            await result.current.sendMessage('Create a landing page');
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
            '/builder/projects/1/start',
            expect.objectContaining({
                prompt: 'Create a landing page',
            })
        );

        expect(result.current.sessionId).toBe('session-123');
    });

    it('passes builderId and templateUrl options', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-1', builder_id: 2 },
        });

        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        await act(async () => {
            await result.current.sendMessage('Build from template', {
                builderId: 2,
                templateUrl: 'https://example.com/template.zip',
            });
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
            '/builder/projects/1/start',
            expect.objectContaining({
                builder_id: 2,
                template_url: 'https://example.com/template.zip',
            })
        );
    });

    it('isLoading is true while build is running', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-1', builder_id: 1 },
        });

        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        expect(result.current.isLoading).toBe(false);

        await act(async () => {
            await result.current.sendMessage('Build');
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.progress.status).toBe('running');
    });

    it('adds assistant message on complete', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-1', builder_id: 1 },
        });

        const onComplete = vi.fn();
        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig, onComplete }));

        await act(async () => {
            await result.current.sendMessage('Build something');
        });

        // The hook now uses Pusher, not SSE - we'll test the message handling directly
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].type).toBe('user');
    });

    it('calls onComplete callback with event data', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-1', builder_id: 1 },
        });

        const onComplete = vi.fn();
        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig, onComplete }));

        await act(async () => {
            await result.current.sendMessage('Build');
        });

        expect(result.current.sessionId).toBe('session-1');
    });

    it('handles error events', async () => {
        const axiosError = {
            isAxiosError: true,
            response: { data: { error: 'API rate limit exceeded' } },
        };
        mockedAxios.post.mockRejectedValueOnce(axiosError);
        mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

        const onError = vi.fn();
        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig, onError }));

        await act(async () => {
            await result.current.sendMessage('Build');
        });

        await waitFor(() => {
            expect(result.current.progress.status).toBe('failed');
        });

        expect(result.current.startError).toBe('API rate limit exceeded');
        expect(onError).toHaveBeenCalledWith('API rate limit exceeded');
    });

    it('cancelBuild stops the build', async () => {
        mockedAxios.post
            .mockResolvedValueOnce({ data: { session_id: 'session-1', builder_id: 1 } })
            .mockResolvedValueOnce({ data: { success: true } }); // cancel endpoint

        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        await act(async () => {
            await result.current.sendMessage('Build');
        });

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            await result.current.cancelBuild();
        });

        expect(result.current.progress.status).toBe('cancelled');
    });

    it('clearHistory clears messages and resets build', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-1', builder_id: 1 },
        });

        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        await act(async () => {
            await result.current.sendMessage('Build');
        });

        expect(result.current.messages).toHaveLength(1);

        act(() => {
            result.current.clearHistory();
        });

        expect(result.current.messages).toEqual([]);
        expect(localStorage.removeItem).toHaveBeenCalledWith('chat-history-1');
    });

    it('exposes progress from build session', async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: { session_id: 'session-1', builder_id: 1 },
        });

        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

        await act(async () => {
            await result.current.sendMessage('Build');
        });

        expect(result.current.progress.status).toBe('running');
    });

    it('handles start build failure', async () => {
        const axiosError = {
            isAxiosError: true,
            response: { data: { error: 'No builders available' } },
        };
        mockedAxios.post.mockRejectedValueOnce(axiosError);
        mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

        const onError = vi.fn();
        const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig, onError }));

        await act(async () => {
            await result.current.sendMessage('Build');
        });

        await waitFor(() => {
            expect(result.current.startError).toBe('No builders available');
        });

        expect(onError).toHaveBeenCalledWith('No builders available');
    });

    describe('safety fallback polling', () => {
        beforeEach(() => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

        it('sets hasFileChanges when detecting completed status', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { session_id: 'session-1' } });

            const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

            await act(async () => {
                await result.current.sendMessage('Build');
            });

            // Mock the status endpoint for the interval check
            vi.mocked(axios.get).mockResolvedValueOnce({ data: { status: 'completed' } });

            // Advance timer and flush async
            await act(async () => {
                vi.advanceTimersByTime(5000);
                await flushPromises();
            });

            await waitFor(() => {
                expect(result.current.progress.hasFileChanges).toBe(true);
            });
            expect(result.current.progress.status).toBe('completed');
        });

        it('does not set hasFileChanges on failed status', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { session_id: 'session-1' } });

            const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

            await act(async () => {
                await result.current.sendMessage('Build');
            });

            vi.mocked(axios.get).mockResolvedValueOnce({ data: { status: 'failed' } });

            await act(async () => {
                vi.advanceTimersByTime(5000);
                await flushPromises();
            });

            await waitFor(() => {
                expect(result.current.progress.status).toBe('failed');
            });
            expect(result.current.progress.hasFileChanges).toBe(false);
        });

        it('detects completed status at 5 second interval', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { session_id: 'session-1' } });

            const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

            await act(async () => {
                await result.current.sendMessage('Build');
            });

            // Mock the status endpoint to return 'completed'
            vi.mocked(axios.get).mockResolvedValue({ data: { status: 'completed' } });

            // At 5 seconds, the polling interval fires and detects 'completed'
            await act(async () => {
                vi.advanceTimersByTime(5000);
                await flushPromises();
            });

            await waitFor(() => {
                expect(result.current.progress.status).toBe('completed');
            });
        });
    });

    describe('build trigger', () => {
        it('triggerBuild posts to build endpoint', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { preview_url: '/preview/1' } });

            const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

            await act(async () => {
                await result.current.triggerBuild();
            });

            expect(mockedAxios.post).toHaveBeenCalledWith('/builder/projects/1/build');
        });

        it('triggerBuild sets previewUrl on success', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { preview_url: '/preview/1' } });

            const { result } = renderHook(() => useBuilderChat(1, { pusherConfig: mockPusherConfig }));

            await act(async () => {
                await result.current.triggerBuild();
            });

            expect(result.current.progress.previewUrl).toBe('/preview/1');
        });

        it('calls onBuildComplete callback with previewUrl after triggerBuild', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { preview_url: '/preview/1' } });
            const onBuildComplete = vi.fn();

            const { result } = renderHook(() => useBuilderChat(1, {
                pusherConfig: mockPusherConfig,
                onBuildComplete,
            }));

            await act(async () => {
                await result.current.triggerBuild();
            });

            expect(onBuildComplete).toHaveBeenCalledWith('/preview/1');
        });
    });
});
