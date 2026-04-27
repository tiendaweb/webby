import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonText, SkeletonBadge, SkeletonButton } from '@/components/ui/skeleton-primitives';

interface ProjectCardSkeletonProps extends React.ComponentProps<'div'> {
    /** View mode affects card layout */
    viewMode?: 'large' | 'grid' | 'list';
}

export function ProjectCardSkeleton({
    viewMode = 'grid',
    className,
    ...props
}: ProjectCardSkeletonProps) {
    if (viewMode === 'list') {
        return (
            <Card
                data-testid="project-card-skeleton"
                className={cn('overflow-hidden', className)}
                {...props}
            >
                <div className="flex items-center p-4 gap-4">
                    {/* Thumbnail */}
                    <Skeleton
                        data-testid="project-card-thumbnail-skeleton"
                        className="h-16 w-24 rounded-md flex-shrink-0"
                    />
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                        <SkeletonText
                            data-testid="project-card-title-skeleton"
                            size="base"
                            width="w-48"
                        />
                        <div className="flex items-center gap-2">
                            <SkeletonText
                                data-testid="project-card-meta-skeleton"
                                size="sm"
                                width="w-24"
                                className="opacity-70"
                            />
                            <SkeletonBadge width="w-14" />
                        </div>
                    </div>
                    {/* Actions */}
                    <SkeletonButton variant="icon" size="sm" />
                </div>
            </Card>
        );
    }

    return (
        <Card
            data-testid="project-card-skeleton"
            className={cn('overflow-hidden', className)}
            {...props}
        >
            {/* Thumbnail */}
            <Skeleton
                data-testid="project-card-thumbnail-skeleton"
                className="aspect-video w-full"
            />
            <CardContent className="p-4 space-y-3">
                {/* Title */}
                <SkeletonText
                    data-testid="project-card-title-skeleton"
                    size="base"
                    width="w-3/4"
                />
                {/* Meta row */}
                <div className="flex items-center justify-between">
                    <SkeletonText
                        data-testid="project-card-meta-skeleton"
                        size="sm"
                        width="w-20"
                        className="opacity-70"
                    />
                    <SkeletonBadge width="w-14" />
                </div>
            </CardContent>
        </Card>
    );
}
