import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Builder event types
export interface StatusEvent {
    status: string;
    message: string;
}

export interface ThinkingEvent {
    content: string;
    iteration: number;
}

export interface ActionEvent {
    action: string;
    target: string;
    details: string;
    category: string;
}

export interface ToolCallEvent {
    id: string;
    tool: string;
    params: Record<string, unknown>;
}

export interface ToolResultEvent {
    id: string;
    tool: string;
    success: boolean;
    output: string;
    duration_ms?: number;
    iteration?: number;
}

export interface MessageEvent {
    content: string;
}

export interface ErrorEvent {
    error: string;
}

export interface CompleteEvent {
    iterations: number;
    tokens_used: number;
    files_changed: boolean;
    message?: string;
    build_status?: string;
    build_message?: string;
    build_required?: boolean;
    prompt_tokens?: number;
    completion_tokens?: number;
    model?: string;
}

export interface SummarizationCompleteEvent {
    old_tokens: number;
    new_tokens: number;
    reduction_percent: number;
    turns_compacted: number;
    turns_kept: number;
    message: string;
}

export type BuilderEvent =
    | { type: 'status'; data: StatusEvent }
    | { type: 'thinking'; data: ThinkingEvent }
    | { type: 'action'; data: ActionEvent }
    | { type: 'tool_call'; data: ToolCallEvent }
    | { type: 'tool_result'; data: ToolResultEvent }
    | { type: 'message'; data: MessageEvent }
    | { type: 'error'; data: ErrorEvent }
    | { type: 'complete'; data: CompleteEvent }
    | { type: 'summarization_complete'; data: SummarizationCompleteEvent };

export type BroadcastConfig =
    | { provider: 'pusher'; key: string; cluster: string }
    | { provider: 'reverb'; key: string; host: string; port: number; scheme: 'http' | 'https' };

// Keep PusherConfig as alias for backwards compatibility
export type PusherConfig = BroadcastConfig;

export interface UseBuilderPusherOptions {
    pusherConfig: BroadcastConfig;
    enabled?: boolean;
    onStatus?: (data: StatusEvent) => void;
    onThinking?: (data: ThinkingEvent) => void;
    onAction?: (data: ActionEvent) => void;
    onToolCall?: (data: ToolCallEvent) => void;
    onToolResult?: (data: ToolResultEvent) => void;
    onMessage?: (data: MessageEvent) => void;
    onError?: (data: ErrorEvent) => void;
    onComplete?: (data: CompleteEvent) => void;
    onSummarizationComplete?: (data: SummarizationCompleteEvent) => void;
    onAnyEvent?: (event: BuilderEvent) => void;
    // Connection state callbacks
    onDisconnected?: () => void;
    onReconnected?: () => void;
}

export interface UseBuilderPusherReturn {
    isConnected: boolean;
    subscribe: (sessionId: string) => void;
    unsubscribe: () => void;
    error: string | null;
}

// Cache for Echo instances by config key
const echoInstances = new Map<string, InstanceType<typeof Echo>>();

function getEcho(config: BroadcastConfig): InstanceType<typeof Echo> {
    const configKey = config.provider === 'pusher'
        ? `${config.key}:${config.cluster}`
        : `${config.key}:${config.host}:${config.port}`;

    if (echoInstances.has(configKey)) {
        return echoInstances.get(configKey)!;
    }

    // Make Pusher available globally for Echo
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    const echoInstance = new Echo({
        broadcaster: 'pusher',
        key: config.key,
        cluster: config.provider === 'pusher' ? config.cluster : undefined,
        forceTLS: true,
        disableStats: true,
    });

    echoInstances.set(configKey, echoInstance);
    return echoInstance;
}

export function useBuilderPusher(options: UseBuilderPusherOptions): UseBuilderPusherReturn {
    const { pusherConfig, enabled = true } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const currentChannelRef = useRef<string | null>(null);
    const optionsRef = useRef(options);

    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    // Monitor Pusher connection state
    useEffect(() => {
        if (!enabled || pusherConfig.provider !== 'pusher' || !pusherConfig.key) {
            return;
        }

        const echo = getEcho(pusherConfig);

        // Access Pusher connection through Echo - type assertion needed for connector
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connector: any = echo.connector;
        const pusherConnection = connector?.pusher?.connection;
        if (!pusherConnection) {
            return;
        }

        const handleDisconnected = () => {
            optionsRef.current.onDisconnected?.();
            setIsConnected(false);
        };

        const handleConnected = () => {
            optionsRef.current.onReconnected?.();
            setIsConnected(true);
        };

        pusherConnection.bind('disconnected', handleDisconnected);
        pusherConnection.bind('connected', handleConnected);

        return () => {
            pusherConnection.unbind('disconnected', handleDisconnected);
            pusherConnection.unbind('connected', handleConnected);
        };
    }, [pusherConfig, enabled]);

    const subscribe = useCallback((sessionId: string) => {
        if (!enabled || !sessionId) {
            return;
        }

        // Check if Pusher is configured
        if (pusherConfig.provider !== 'pusher' || !pusherConfig.key) {
            setError('Pusher is not configured. Please configure Pusher in Admin Settings.');
            return;
        }

        const channelName = `session.${sessionId}`;

        // Don't resubscribe if already subscribed to this channel
        if (currentChannelRef.current === channelName) {
            return;
        }

        // Unsubscribe from previous channel if any
        if (currentChannelRef.current) {
            getEcho(pusherConfig).leave(currentChannelRef.current);
        }

        try {
            const channel = getEcho(pusherConfig).channel(channelName);

            // Listen for all event types
            channel
                .listen('.status', (data: StatusEvent) => {
                    optionsRef.current.onStatus?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'status', data });
                })
                .listen('.thinking', (data: ThinkingEvent) => {
                    optionsRef.current.onThinking?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'thinking', data });
                })
                .listen('.action', (data: ActionEvent) => {
                    optionsRef.current.onAction?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'action', data });
                })
                .listen('.tool_call', (data: ToolCallEvent) => {
                    optionsRef.current.onToolCall?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'tool_call', data });
                })
                .listen('.tool_result', (data: ToolResultEvent) => {
                    optionsRef.current.onToolResult?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'tool_result', data });
                })
                .listen('.message', (data: MessageEvent) => {
                    optionsRef.current.onMessage?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'message', data });
                })
                .listen('.error', (data: ErrorEvent) => {
                    optionsRef.current.onError?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'error', data });
                })
                .listen('.complete', (data: CompleteEvent) => {
                    optionsRef.current.onComplete?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'complete', data });
                })
                .listen('.summarization_complete', (data: SummarizationCompleteEvent) => {
                    optionsRef.current.onSummarizationComplete?.(data);
                    optionsRef.current.onAnyEvent?.({ type: 'summarization_complete', data });
                });

            currentChannelRef.current = channelName;
            setIsConnected(true);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect');
            setIsConnected(false);
        }
    }, [pusherConfig, enabled]);

    const unsubscribe = useCallback(() => {
        if (currentChannelRef.current && pusherConfig.key) {
            getEcho(pusherConfig).leave(currentChannelRef.current);
            currentChannelRef.current = null;
            setIsConnected(false);
        }
    }, [pusherConfig]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentChannelRef.current && pusherConfig.key) {
                getEcho(pusherConfig).leave(currentChannelRef.current);
            }
        };
    }, [pusherConfig]);

    // Memoize return object to prevent useEffect re-runs in consumers
    return useMemo(() => ({
        isConnected,
        subscribe,
        unsubscribe,
        error,
    }), [isConnected, subscribe, unsubscribe, error]);
}
