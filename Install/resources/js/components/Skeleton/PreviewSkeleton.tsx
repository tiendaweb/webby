import { Skeleton } from '@/components/ui/skeleton';
import { GradientBackground } from '@/components/Dashboard/GradientBackground';

export function PreviewSkeleton() {
    return (
        <div
            className="h-full w-full flex items-center justify-center bg-background relative overflow-hidden"
            data-testid="preview-skeleton"
        >
            <GradientBackground />
            <div
                className="relative z-10 w-full max-w-md mx-auto px-8"
                data-testid="browser-mockup"
            >
                {/* Browser window mockup */}
                <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    {/* Browser header */}
                    <div className="h-8 bg-muted/50 border-b border-border flex items-center gap-1.5 px-3">
                        <Skeleton className="h-2.5 w-2.5 rounded-full" />
                        <Skeleton className="h-2.5 w-2.5 rounded-full" />
                        <Skeleton className="h-2.5 w-2.5 rounded-full" />
                        <Skeleton className="h-4 w-32 rounded ml-4" />
                    </div>
                    {/* Browser content */}
                    <div className="p-4 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/5" />
                        <div className="pt-2">
                            <Skeleton className="h-8 w-24 rounded-md" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
