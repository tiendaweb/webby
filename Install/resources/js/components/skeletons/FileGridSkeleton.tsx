import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonText } from '@/components/ui/skeleton-primitives';

interface FileGridSkeletonProps extends React.ComponentProps<'div'> {
    /** Number of file cards to show */
    count?: number;
}

export function FileGridSkeleton({
    count = 6,
    className,
    ...props
}: FileGridSkeletonProps) {
    return (
        <div
            data-testid="file-grid-skeleton"
            className={cn(
                'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4',
                className
            )}
            {...props}
        >
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    data-testid="file-card-skeleton"
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card"
                >
                    {/* File icon/thumbnail */}
                    <Skeleton
                        data-testid="file-card-thumbnail-skeleton"
                        className="h-16 w-16 rounded-lg"
                    />
                    {/* File name */}
                    <SkeletonText
                        data-testid="file-card-name-skeleton"
                        size="sm"
                        width="w-full"
                        className="text-center"
                    />
                    {/* File size */}
                    <SkeletonText
                        size="sm"
                        width="w-12"
                        className="opacity-70"
                    />
                </div>
            ))}
        </div>
    );
}
