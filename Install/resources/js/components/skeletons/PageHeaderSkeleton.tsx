import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonText, SkeletonButton } from '@/components/ui/skeleton-primitives';

interface PageHeaderSkeletonProps extends Omit<React.ComponentProps<'div'>, 'title'> {
    /** Show title placeholder */
    showTitle?: boolean;
    /** Show description placeholder */
    showDescription?: boolean;
    /** Show project selector dropdown placeholder */
    showProjectSelector?: boolean;
    /** Number of action buttons to show */
    actionCount?: number;
}

export function PageHeaderSkeleton({
    showTitle = true,
    showDescription = false,
    showProjectSelector = false,
    actionCount = 0,
    className,
    ...props
}: PageHeaderSkeletonProps) {
    return (
        <div
            data-testid="page-header-skeleton"
            className={cn('flex items-center justify-between gap-4', className)}
            {...props}
        >
            <div className="space-y-1">
                {showTitle && (
                    <SkeletonText
                        data-testid="page-header-title-skeleton"
                        size="xl"
                        width="w-32"
                    />
                )}
                {showDescription && (
                    <SkeletonText
                        data-testid="page-header-description-skeleton"
                        size="sm"
                        width="w-48"
                        className="opacity-70"
                    />
                )}
            </div>
            <div className="flex items-center gap-2">
                {showProjectSelector && (
                    <Skeleton
                        data-testid="page-header-project-selector-skeleton"
                        className="h-9 w-[200px] rounded-md"
                    />
                )}
                {actionCount > 0 &&
                    Array.from({ length: actionCount }).map((_, i) => (
                        <SkeletonButton
                            key={i}
                            data-testid="page-header-action-skeleton"
                        />
                    ))}
            </div>
        </div>
    );
}
