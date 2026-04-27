import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

export interface SessionStatus {
    sessionId: string;
    status: string;
    canReconnect: boolean;
    previewUrl: string | null;
}

export interface SessionReconnectionOptions {
    projectId: string;
    initialSessionId?: string | null;
    initialCanReconnect?: boolean;
    onReconnected?: (sessionStatus: SessionStatus) => void;
    onReconnectFailed?: (error: string) => void;
    onSessionNotFound?: () => void;
}

export interface UseSessionReconnectionReturn {
    reconnectAttempt: number;
    isReconnecting: boolean;
    reconnectError: string | null;
    sessionIsActive: boolean;
    checkSessionStatus: () => Promise<SessionStatus | null>;
    reconnect: () => Promise<void>;
}

export function useSessionReconnection(
    options: SessionReconnectionOptions
): UseSessionReconnectionReturn {
    const {
        projectId,
        initialSessionId,
        initialCanReconnect = false,
        onReconnected,
        onReconnectFailed,
        onSessionNotFound,
    } = options;

    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectError, setReconnectError] = useState<string | null>(null);
    const [sessionIsActive, setSessionIsActive] = useState(initialCanReconnect);

    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const hasAttemptedReconnectRef = useRef(false);

    // Check if there's an active session for the project
    const checkSessionStatus = useCallback(async (): Promise<SessionStatus | null> => {
        try {
            const response = await axios.get(`/builder/projects/${projectId}/status`);
            const data = response.data;

            if (data.has_session && data.can_reconnect) {
                setSessionIsActive(true);
                return {
                    sessionId: data.build_session_id,
                    status: data.status,
                    canReconnect: data.can_reconnect,
                    previewUrl: data.preview_url,
                };
            } else {
                setSessionIsActive(false);
                return null;
            }
        } catch (error) {
            console.error('Failed to check session status:', error);
            setSessionIsActive(false);
            return null;
        }
    }, [projectId]);

    // Reconnect to an active session
    const reconnect = useCallback(async () => {
        if (!projectId || hasAttemptedReconnectRef.current) return;

        hasAttemptedReconnectRef.current = true;
        setIsReconnecting(true);
        setReconnectError(null);

        try {
            const sessionStatus = await checkSessionStatus();

            if (!sessionStatus || !sessionStatus.sessionId) {
                onSessionNotFound?.();
                setSessionIsActive(false);
                setIsReconnecting(false);
                hasAttemptedReconnectRef.current = false; // Allow retry via manualReconnect
                return;
            }

            // Successfully found active session
            setSessionIsActive(true);
            setReconnectAttempt(prev => prev + 1);

            // Notify parent component with full session status for Pusher subscription and status update
            onReconnected?.(sessionStatus);

            setIsReconnecting(false);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Reconnection failed';
            setReconnectError(errorMessage);
            onReconnectFailed?.(errorMessage);
            setIsReconnecting(false);
            hasAttemptedReconnectRef.current = false; // Allow retry via manualReconnect
        }
    }, [projectId, checkSessionStatus, onReconnected, onReconnectFailed, onSessionNotFound]);

    // Auto-reconnect on mount if session is active (only once)
    useEffect(() => {
        if (initialCanReconnect && initialSessionId && !hasAttemptedReconnectRef.current) {
            void reconnect();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount - ignore ESLint warning about missing deps

    // Cleanup
    useEffect(() => {
        const timeout = reconnectTimeoutRef.current;
        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, []);

    return {
        reconnectAttempt,
        isReconnecting,
        reconnectError,
        sessionIsActive,
        checkSessionStatus,
        reconnect,
    };
}
