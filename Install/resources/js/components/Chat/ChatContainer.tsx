import { useEffect, useRef, useState } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useBuilderChat, CompleteEvent, PusherConfig } from '@/hooks/useBuilderChat';

interface ChatContainerProps {
    projectId: string;
    pusherConfig: PusherConfig;
    initialMessage?: string;
    onBuildComplete?: (event: CompleteEvent) => void;
    onError?: (error: string) => void;
}

export function ChatContainer({
    projectId,
    pusherConfig,
    initialMessage,
    onBuildComplete,
    onError,
}: ChatContainerProps) {
    const initialMessageProcessed = useRef(false);
    const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null);
    const [thinkingDuration, setThinkingDuration] = useState<number | null>(null);

    const {
        messages,
        progress,
        isLoading,
        sendMessage,
        cancelBuild,
    } = useBuilderChat(projectId, {
        pusherConfig,
        onComplete: onBuildComplete,
        onError,
    });

    // Track thinking time
    useEffect(() => {
        if (progress.thinkingStartTime && !thinkingStartTime) {
            setThinkingStartTime(progress.thinkingStartTime);
        }
    }, [progress.thinkingStartTime, thinkingStartTime]);

    // Calculate thinking duration when completed
    useEffect(() => {
        if (progress.status === 'completed' && thinkingStartTime) {
            const duration = Math.round((Date.now() - thinkingStartTime) / 1000);
            setThinkingDuration(duration);
            setThinkingStartTime(null);
        }
    }, [progress.status, thinkingStartTime]);

    // Reset thinking state on new build
    useEffect(() => {
        if (progress.status === 'connecting') {
            setThinkingStartTime(null);
            setThinkingDuration(null);
        }
    }, [progress.status]);

    // Auto-send initial message from dashboard prompt
    useEffect(() => {
        if (initialMessage && !initialMessageProcessed.current) {
            initialMessageProcessed.current = true;
            sendMessage(initialMessage);
        }
    }, [initialMessage, sendMessage]);

    const handleSend = async (content: string) => {
        await sendMessage(content);
    };

    // Convert messages from hook format to component format
    // Include activity messages for prototype-like stacking behavior
    const displayMessages = messages.map(msg => ({
        id: msg.id,
        type: msg.type as 'user' | 'assistant' | 'activity',
        content: msg.content,
        timestamp: msg.timestamp,
        activityType: msg.activityType,
        thinkingDuration: msg.thinkingDuration,
    }));

    // Current activity for loading indicator
    const currentActivity = progress.actions.length > 0
        ? `${progress.actions[progress.actions.length - 1].action} ${progress.actions[progress.actions.length - 1].target}`
        : progress.thinkingContent || 'Starting...';

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 overflow-hidden min-h-0">
                <MessageList
                    messages={displayMessages}
                    thinkingDuration={thinkingDuration}
                />
            </div>

            {/* Running indicator */}
            {isLoading && (
                <div className="px-4 py-1.5">
                    <div className="flex items-center gap-2.5 animate-fade-in rounded-full bg-muted/60 border border-border/50 px-3 py-1.5 w-fit mx-auto">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                            <span className="w-1.5 h-1.5 bg-primary rounded-full typing-dot" />
                        </div>
                        <span className="text-sm font-medium text-foreground">AI is working</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {currentActivity}
                        </span>
                    </div>
                </div>
            )}

            <ChatInput
                onSend={handleSend}
                disabled={isLoading}
                onCancel={isLoading ? cancelBuild : undefined}
            />
        </div>
    );
}
