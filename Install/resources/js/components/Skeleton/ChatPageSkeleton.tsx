import { Skeleton } from '@/components/ui/skeleton';
import { MessageListSkeleton } from './MessageListSkeleton';
import { PreviewSkeleton } from './PreviewSkeleton';

export function ChatPageSkeleton() {
    return (
        <div className="h-screen flex bg-background">
            {/* Left: Chat Column */}
            <div
                className="w-full md:w-[420px] shrink-0 md:border-r flex flex-col"
                data-testid="chat-column-skeleton"
            >
                {/* Header */}
                <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-background">
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-hidden">
                    <MessageListSkeleton count={3} />
                </div>

                {/* Input */}
                <div className="p-4 border-t bg-background">
                    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                        <Skeleton className="h-[60px] w-full rounded-none" />
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border/50">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-16 rounded-md" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Preview Column */}
            <div
                className="hidden md:flex flex-1 flex-col overflow-hidden"
                data-testid="preview-column-skeleton"
            >
                {/* Header */}
                <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-background">
                    <Skeleton className="h-9 w-48 rounded-lg" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-hidden">
                    <PreviewSkeleton />
                </div>
            </div>
        </div>
    );
}
