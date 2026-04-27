import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatHistory, ChatMessage } from '../useChatHistory';

describe('useChatHistory', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.mocked(localStorage.getItem).mockReset();
        vi.mocked(localStorage.setItem).mockReset();
        vi.mocked(localStorage.removeItem).mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initializes with empty messages when no stored history', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        expect(result.current.messages).toEqual([]);
    });

    it('loads messages from localStorage on mount', () => {
        const storedMessages: ChatMessage[] = [
            { id: '1', type: 'user', content: 'Hello', timestamp: new Date('2024-01-01') },
            { id: '2', type: 'assistant', content: 'Hi there!', timestamp: new Date('2024-01-02') },
        ];
        vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(storedMessages));

        const { result } = renderHook(() => useChatHistory({ projectId: 123 }));

        expect(localStorage.getItem).toHaveBeenCalledWith('chat-history-123');
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('Hello');
        expect(result.current.messages[1].content).toBe('Hi there!');
    });

    it('converts timestamp strings to Date objects when loading', () => {
        const storedMessages = [
            { id: '1', type: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        ];
        vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(storedMessages));

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        expect(result.current.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('handles invalid JSON in localStorage gracefully', () => {
        vi.mocked(localStorage.getItem).mockReturnValue('invalid json');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        expect(result.current.messages).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('adds a message correctly', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        const newMessage: ChatMessage = {
            id: 'msg-1',
            type: 'user',
            content: 'Test message',
            timestamp: new Date(),
        };

        act(() => {
            result.current.addMessage(newMessage);
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe('Test message');
    });

    it('saves to localStorage with debouncing', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        const newMessage: ChatMessage = {
            id: 'msg-1',
            type: 'user',
            content: 'Test message',
            timestamp: new Date(),
        };

        act(() => {
            result.current.addMessage(newMessage);
        });

        // Should not save immediately
        expect(localStorage.setItem).not.toHaveBeenCalled();

        // Fast forward past debounce time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(localStorage.setItem).toHaveBeenCalledWith(
            'chat-history-1',
            expect.any(String)
        );
    });

    it('enforces maxMessages limit', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        const { result } = renderHook(() => useChatHistory({ projectId: 1, maxMessages: 3 }));

        // Add 5 messages
        for (let i = 1; i <= 5; i++) {
            act(() => {
                result.current.addMessage({
                    id: `msg-${i}`,
                    type: 'user',
                    content: `Message ${i}`,
                    timestamp: new Date(),
                });
            });
        }

        expect(result.current.messages).toHaveLength(3);
        // Should keep the latest 3 messages
        expect(result.current.messages[0].content).toBe('Message 3');
        expect(result.current.messages[1].content).toBe('Message 4');
        expect(result.current.messages[2].content).toBe('Message 5');
    });

    it('adds multiple messages at once', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        const newMessages: ChatMessage[] = [
            { id: '1', type: 'user', content: 'First', timestamp: new Date() },
            { id: '2', type: 'assistant', content: 'Second', timestamp: new Date() },
        ];

        act(() => {
            result.current.addMessages(newMessages);
        });

        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0].content).toBe('First');
        expect(result.current.messages[1].content).toBe('Second');
    });

    it('getHistoryForApi returns only user/assistant messages in correct format', () => {
        const storedMessages: ChatMessage[] = [
            { id: '1', type: 'system', content: 'System message', timestamp: new Date() },
            { id: '2', type: 'user', content: 'User message', timestamp: new Date() },
            { id: '3', type: 'assistant', content: 'Assistant message', timestamp: new Date() },
            { id: '4', type: 'system', content: 'Another system', timestamp: new Date() },
        ];
        vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(storedMessages));

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        const apiHistory = result.current.getHistoryForApi();

        expect(apiHistory).toHaveLength(2);
        expect(apiHistory[0]).toEqual({ role: 'user', content: 'User message' });
        expect(apiHistory[1]).toEqual({ role: 'assistant', content: 'Assistant message' });
    });

    it('clearHistory removes all messages and clears localStorage', () => {
        const storedMessages: ChatMessage[] = [
            { id: '1', type: 'user', content: 'Hello', timestamp: new Date() },
        ];
        vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(storedMessages));

        const { result } = renderHook(() => useChatHistory({ projectId: 42 }));

        expect(result.current.messages).toHaveLength(1);

        act(() => {
            result.current.clearHistory();
        });

        expect(result.current.messages).toEqual([]);
        expect(localStorage.removeItem).toHaveBeenCalledWith('chat-history-42');
    });

    it('updateLastMessage updates the last message content', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        // Add a message first
        act(() => {
            result.current.addMessage({
                id: '1',
                type: 'assistant',
                content: 'Initial content',
                timestamp: new Date(),
            });
        });

        expect(result.current.messages[0].content).toBe('Initial content');

        // Update it
        act(() => {
            result.current.updateLastMessage('Updated content');
        });

        expect(result.current.messages[0].content).toBe('Updated content');
    });

    it('updateLastMessage does nothing when no messages exist', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        act(() => {
            result.current.updateLastMessage('Test');
        });

        expect(result.current.messages).toEqual([]);
    });

    it('uses different storage keys for different project IDs', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        renderHook(() => useChatHistory({ projectId: 1 }));
        renderHook(() => useChatHistory({ projectId: 2 }));

        expect(localStorage.getItem).toHaveBeenCalledWith('chat-history-1');
        expect(localStorage.getItem).toHaveBeenCalledWith('chat-history-2');
    });

    it('uses default maxMessages of 50', () => {
        vi.mocked(localStorage.getItem).mockReturnValue(null);

        const { result } = renderHook(() => useChatHistory({ projectId: 1 }));

        // Add 60 messages
        for (let i = 1; i <= 60; i++) {
            act(() => {
                result.current.addMessage({
                    id: `msg-${i}`,
                    type: 'user',
                    content: `Message ${i}`,
                    timestamp: new Date(),
                });
            });
        }

        expect(result.current.messages).toHaveLength(50);
        expect(result.current.messages[0].content).toBe('Message 11'); // 60 - 50 + 1
        expect(result.current.messages[49].content).toBe('Message 60');
    });

    it('reloads messages when projectId changes', () => {
        const project1Messages = [{ id: '1', type: 'user', content: 'Project 1', timestamp: new Date() }];
        const project2Messages = [{ id: '2', type: 'user', content: 'Project 2', timestamp: new Date() }];

        vi.mocked(localStorage.getItem).mockImplementation((key) => {
            if (key === 'chat-history-1') return JSON.stringify(project1Messages);
            if (key === 'chat-history-2') return JSON.stringify(project2Messages);
            return null;
        });

        const { result, rerender } = renderHook(
            ({ projectId }) => useChatHistory({ projectId }),
            { initialProps: { projectId: 1 } }
        );

        expect(result.current.messages[0].content).toBe('Project 1');

        rerender({ projectId: 2 });

        expect(result.current.messages[0].content).toBe('Project 2');
    });
});
