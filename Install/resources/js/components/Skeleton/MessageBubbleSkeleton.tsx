import { Skeleton } from '@/components/ui/skeleton';

interface MessageBubbleSkeletonProps {
    variant: 'user' | 'assistant';
}

export function MessageBubbleSkeleton({ variant }: MessageBubbleSkeletonProps) {
    const isUser = variant === 'user';

    if (isUser) {
        return (
            <div
                className="flex justify-end"
                data-testid="user-message-skeleton"
            >
                <div className="max-w-[85%] space-y-2">
                    <Skeleton
                        className="h-4 w-48 rounded-2xl rounded-br-md"
                        data-testid="line-skeleton-1"
                    />
                    <Skeleton
                        className="h-4 w-32 rounded-2xl rounded-br-md"
                        data-testid="line-skeleton-2"
                    />
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex justify-start gap-3"
            data-testid="assistant-message-skeleton"
        >
            <Skeleton
                className="h-8 w-8 rounded-full shrink-0"
                data-testid="avatar-skeleton"
            />
            <div className="max-w-[85%] space-y-2">
                <Skeleton
                    className="h-4 w-64 rounded-2xl rounded-bl-md"
                    data-testid="line-skeleton-1"
                />
                <Skeleton
                    className="h-4 w-48 rounded-2xl rounded-bl-md"
                    data-testid="line-skeleton-2"
                />
                <Skeleton
                    className="h-4 w-56 rounded-2xl rounded-bl-md"
                    data-testid="line-skeleton-3"
                />
            </div>
        </div>
    );
}
