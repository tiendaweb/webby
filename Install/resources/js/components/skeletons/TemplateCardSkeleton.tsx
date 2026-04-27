import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonText, SkeletonBadge } from '@/components/ui/skeleton-primitives';

type TemplateCardSkeletonProps = React.ComponentProps<'div'>;

export function TemplateCardSkeleton({ className, ...props }: TemplateCardSkeletonProps) {
    return (
        <Card
            data-testid="template-card-skeleton"
            className={cn('overflow-hidden', className)}
            {...props}
        >
            {/* Image placeholder */}
            <div className="relative">
                <Skeleton
                    data-testid="template-card-image-skeleton"
                    className="aspect-video w-full"
                />
                {/* Category badge overlay */}
                <div className="absolute top-2 left-2">
                    <SkeletonBadge
                        data-testid="template-card-badge-skeleton"
                        width="w-16"
                    />
                </div>
            </div>
            <CardContent className="p-4 space-y-2">
                {/* Title */}
                <SkeletonText
                    data-testid="template-card-title-skeleton"
                    size="base"
                    width="w-3/4"
                />
                {/* Description - two lines */}
                <div className="space-y-1">
                    <SkeletonText
                        data-testid="template-card-description-skeleton"
                        size="sm"
                        width="w-full"
                        className="opacity-70"
                    />
                    <SkeletonText
                        size="sm"
                        width="w-2/3"
                        className="opacity-70"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
