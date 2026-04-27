import { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '@/types/chat';
import { MessageSquare, Lightbulb } from 'lucide-react';

interface MessageListProps {
    messages: ChatMessage[];
    thinkingDuration?: number | null;
}

export function MessageList({ messages, thinkingDuration }: MessageListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);

    // Check if user is near bottom (within 100px)
    const checkIfNearBottom = useCallback(() => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
        }
    }, []);

    // Auto-scroll to bottom only if user is near bottom
    useEffect(() => {
        if (containerRef.current && isNearBottomRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                        Start a conversation
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Send a message to begin chatting with the AI assistant.
                    </p>
                </div>
            </div>
        );
    }

    // Filter messages to show user, assistant, and activity types
    const filteredMessages = messages.filter(
        msg => msg.type === 'user' || msg.type === 'assistant' || msg.type === 'activity'
    );

    return (
        <div ref={containerRef} className="flex-1 px-4 overflow-y-auto h-full" onScroll={checkIfNearBottom}>
            <div className="py-4 space-y-4">
                {filteredMessages.map((message, index) => {
                    // Show thinking duration from message data (persisted), or from live prop for last message
                    const showThinkingDuration =
                        message.type === 'assistant' &&
                        (message.thinkingDuration != null ||
                            (index === filteredMessages.length - 1 && thinkingDuration !== null));

                    const displayDuration = message.thinkingDuration ?? thinkingDuration;

                    return (
                        <div key={message.id}>
                            {showThinkingDuration && displayDuration != null && (
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                                    <Lightbulb className="w-4 h-4" />
                                    <span>Thought for {displayDuration}s</span>
                                </div>
                            )}
                            <MessageBubble message={message} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
