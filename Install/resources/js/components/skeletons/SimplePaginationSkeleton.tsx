import { cn } from '@/lib/utils';
import { SkeletonText, SkeletonButton } from '@/components/ui/skeleton-primitives';

type SimplePaginationSkeletonProps = React.ComponentProps<'div'>;

export function SimplePaginationSkeleton({
    className,
    ...props
}: SimplePaginationSkeletonProps) {
    return (
        <div
            data-testid="simple-pagination-skeleton"
            className={cn('flex items-center justify-between', className)}
            {...props}
        >
            {/* Previous button */}
            <SkeletonButton
                data-testid="pagination-prev-skeleton"
                size="sm"
            />
            {/* Page info */}
            <SkeletonText
                data-testid="pagination-info-skeleton"
                size="sm"
                width="w-24"
            />
            {/* Next button */}
            <SkeletonButton
                data-testid="pagination-next-skeleton"
                size="sm"
            />
        </div>
    );
}
