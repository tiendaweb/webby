import { useState, useEffect, useCallback, useRef } from 'react';
import type { AttachedFile } from '@/types/chat';

export interface ChatMessage {
    id: string;
    type: 'user' | 'assistant' | 'system' | 'activity' | 'note' | 'noteResult';
    content: string;
    timestamp: Date;
    activityType?: string;
    thinkingDuration?: number;
    attachedFiles?: AttachedFile[];
    noteId?: string;
    noteStatus?: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';
    noteSource?: string | null;
    noteData?: Record<string, unknown> | null;
}

/** A note plus its connector replies, as /project/{id}/notes returns it. */
export interface ServerNote {
    note_id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';
    created_at: string | null;
    answered_at?: string | null;
    author?: { id: number; name: string } | null;
    results: Array<{
        content: string;
        status: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled' | null;
        source: string | null;
        timestamp: string | null;
        data?: Record<string, unknown> | null;
    }>;
}

export interface HistoryMessage {
    role: 'user' | 'assistant' | 'action';
    content: string;
    category?: string;
}

interface UseChatHistoryOptions {
    projectId: string;
    maxMessages?: number;
    initialHistory?: Array<{
        role: string;
        content: string;
        timestamp: string;
        category?: string;
        thinking_duration?: number;
        files?: Array<{ id: number; filename: string; mime_type: string }>;
        note_id?: string;
        status?: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';
        source?: string | null;
        data?: Record<string, unknown> | null;
    }>;
}

const STORAGE_KEY_PREFIX = 'chat-history-';
const DEFAULT_MAX_MESSAGES = 50;
const DEBOUNCE_MS = 500;

export function useChatHistory({ projectId, maxMessages = DEFAULT_MAX_MESSAGES, initialHistory }: UseChatHistoryOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastProjectIdRef = useRef<string | null>(null);

    // Initialize messages: server data first, then localStorage fallback
    useEffect(() => {
        // Skip if same projectId (prevents re-initialization on other dependency changes)
        if (lastProjectIdRef.current === projectId) return;
        lastProjectIdRef.current = projectId;

        const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;

        // Priority 1: Use server-provided history
        if (initialHistory && initialHistory.length > 0) {
            const serverMessages: ChatMessage[] = initialHistory.map((msg, index) => {
                // Map role to type: user -> user, action -> activity,
                // note/note_result -> the connector lane, else -> assistant
                let type: ChatMessage['type'] = 'assistant';
                if (msg.role === 'user') {
                    type = 'user';
                } else if (msg.role === 'action') {
                    type = 'activity';
                } else if (msg.role === 'note') {
                    type = 'note';
                } else if (msg.role === 'note_result') {
                    type = 'noteResult';
                }

                return {
                    id: `server-${index}-${msg.timestamp}`,
                    type,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp),
                    activityType: msg.category,
                    thinkingDuration: msg.thinking_duration,
                    noteId: msg.note_id,
                    noteStatus: msg.status,
                    noteSource: msg.source,
                    noteData: msg.data,
                    attachedFiles: msg.files?.map(f => ({
                        id: f.id,
                        filename: f.filename,
                        mime_type: f.mime_type,
                        is_image: f.mime_type?.startsWith('image/') ?? false,
                        size: 0,
                        human_size: '',
                        url: '',
                    })),
                };
            });
            setMessages(serverMessages);
            // Save to localStorage for offline access
            try {
                localStorage.setItem(storageKey, JSON.stringify(serverMessages));
            } catch (error) {
                console.error('Failed to sync to localStorage:', error);
            }
            return;
        }

        // Priority 2: Fall back to localStorage
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as ChatMessage[];
                // Convert timestamp strings back to Date objects
                const messagesWithDates = parsed.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                }));
                setMessages(messagesWithDates);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }, [projectId, initialHistory]);

    // Save messages to localStorage with debouncing
    const saveToStorage = useCallback((messagesToSave: ChatMessage[]) => {
        const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce the save
        saveTimeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(messagesToSave));
            } catch (error) {
                console.error('Failed to save chat history:', error);
            }
        }, DEBOUNCE_MS);
    }, [projectId]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Add a message and enforce max limit
    const addMessage = useCallback((message: ChatMessage) => {
        setMessages(prev => {
            // Add new message and limit to maxMessages
            const updated = [...prev, message].slice(-maxMessages);
            saveToStorage(updated);
            return updated;
        });
    }, [maxMessages, saveToStorage]);

    // Add multiple messages at once
    const addMessages = useCallback((newMessages: ChatMessage[]) => {
        setMessages(prev => {
            const updated = [...prev, ...newMessages].slice(-maxMessages);
            saveToStorage(updated);
            return updated;
        });
    }, [maxMessages, saveToStorage]);

    // Get history in API format (only user/assistant messages — notes and
    // note results are addressed to the connectors, never to the builder)
    const getHistoryForApi = useCallback((): HistoryMessage[] => {
        return messages
            .filter(msg => msg.type === 'user' || msg.type === 'assistant')
            .map(msg => ({
                role: msg.type as 'user' | 'assistant',
                content: msg.content,
            }));
    }, [messages]);

    /**
     * Reconcile the note lane against what the server has.
     *
     * Notes are answered out of band — a connector may reply minutes after
     * the note was written — so the page polls and folds the result in
     * rather than waiting for a reload. Existing notes only have their
     * status refreshed; replies are matched by count per note, which is
     * safe because the server returns them in the order they were written.
     */
    const applyNotes = useCallback((notes: ServerNote[]) => {
        setMessages(prev => {
            const next = [...prev];
            let changed = false;

            for (const note of notes) {
                const index = next.findIndex(msg => msg.type === 'note' && msg.noteId === note.note_id);

                if (index === -1) {
                    next.push({
                        id: `note-${note.note_id}`,
                        type: 'note',
                        content: note.content,
                        timestamp: new Date(note.created_at ?? Date.now()),
                        noteId: note.note_id,
                        noteStatus: note.status,
                    });
                    changed = true;
                } else if (next[index].noteStatus !== note.status) {
                    next[index] = { ...next[index], noteStatus: note.status };
                    changed = true;
                }

                const alreadyShown = next.filter(
                    msg => msg.type === 'noteResult' && msg.noteId === note.note_id
                ).length;

                for (const result of (note.results ?? []).slice(alreadyShown)) {
                    next.push({
                        id: `note-result-${note.note_id}-${result.timestamp ?? Date.now()}`,
                        type: 'noteResult',
                        content: result.content,
                        timestamp: new Date(result.timestamp ?? Date.now()),
                        noteId: note.note_id,
                        noteStatus: result.status ?? 'done',
                        noteSource: result.source,
                        noteData: result.data ?? null,
                    });
                    changed = true;
                }
            }

            if (!changed) {
                return prev;
            }

            const updated = next.slice(-maxMessages);
            saveToStorage(updated);

            return updated;
        });
    }, [maxMessages, saveToStorage]);

    // Clear history
    const clearHistory = useCallback(() => {
        setMessages([]);
        const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;
        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error('Failed to clear chat history:', error);
        }
    }, [projectId]);

    // Update the last message (useful for streaming updates)
    const updateLastMessage = useCallback((content: string) => {
        setMessages(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content,
            };
            saveToStorage(updated);
            return updated;
        });
    }, [saveToStorage]);

    // Remove a message by ID
    const removeMessage = useCallback((messageId: string) => {
        setMessages(prev => {
            const updated = prev.filter(msg => msg.id !== messageId);
            saveToStorage(updated);
            return updated;
        });
    }, [saveToStorage]);

    return {
        messages,
        addMessage,
        addMessages,
        applyNotes,
        getHistoryForApi,
        clearHistory,
        updateLastMessage,
        removeMessage,
    };
}
