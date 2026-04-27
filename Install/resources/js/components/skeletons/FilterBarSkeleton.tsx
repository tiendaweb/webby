import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonInput, SkeletonButton } from '@/components/ui/skeleton-primitives';

interface FilterBarSkeletonProps extends React.ComponentProps<'div'> {
    /** Show search input placeholder */
    showSearch?: boolean;
    /** Show sort dropdown placeholder */
    showSort?: boolean;
    /** Show filter dropdown placeholder */
    showFilter?: boolean;
    /** Show visibility dropdown placeholder */
    showVisibility?: boolean;
    /** Show view mode toggle placeholder (grid/list icons) */
    showViewToggle?: boolean;
}

export function FilterBarSkeleton({
    showSearch = false,
    showSort = false,
    showFilter = false,
    showVisibility = false,
    showViewToggle = false,
    className,
    ...props
}: FilterBarSkeletonProps) {
    return (
        <div
            data-testid="filter-bar-skeleton"
            className={cn(
                'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
                className
            )}
            {...props}
        >
            <div className="flex flex-1 items-center gap-2">
                {showSearch && (
                    <SkeletonInput
                        data-testid="filter-bar-search-skeleton"
                        width="w-full sm:w-[300px]"
                    />
                )}
            </div>
            <div className="flex items-center gap-2">
                {showSort && (
                    <Skeleton
                        data-testid="filter-bar-sort-skeleton"
                        className="h-9 w-[140px] rounded-md"
                    />
                )}
                {showFilter && (
                    <Skeleton
                        data-testid="filter-bar-filter-skeleton"
                        className="h-9 w-[140px] rounded-md"
                    />
                )}
                {showVisibility && (
                    <Skeleton
                        data-testid="filter-bar-visibility-skeleton"
                        className="h-9 w-[140px] rounded-md"
                    />
                )}
                {showViewToggle && (
                    <div
                        data-testid="filter-bar-view-toggle-skeleton"
                        className="flex items-center rounded-md border p-1 gap-1"
                    >
                        <SkeletonButton variant="icon" size="sm" />
                        <SkeletonButton variant="icon" size="sm" />
                        <SkeletonButton variant="icon" size="sm" />
                    </div>
                )}
            </div>
        </div>
    );
}
