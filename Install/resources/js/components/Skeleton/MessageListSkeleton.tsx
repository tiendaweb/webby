import { MessageBubbleSkeleton } from './MessageBubbleSkeleton';

interface MessageListSkeletonProps {
    count?: number;
}

export function MessageListSkeleton({ count = 3 }: MessageListSkeletonProps) {
    return (
        <div className="space-y-4" data-testid="message-list-skeleton">
            {Array.from({ length: count }).map((_, i) => (
                <MessageBubbleSkeleton
                    key={i}
                    variant={i % 2 === 0 ? 'user' : 'assistant'}
                />
            ))}
        </div>
    );
}
