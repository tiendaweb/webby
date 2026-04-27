import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
    SkeletonText,
    SkeletonBadge,
    SkeletonAvatar,
    SkeletonButton,
    SkeletonInput,
} from '@/components/ui/skeleton-primitives';

// Column configuration
export interface TableColumnConfig {
    width?: string;
    type?: 'text' | 'badge' | 'avatar-text' | 'status' | 'actions' | 'date' | 'amount';
}

// Column type renderers
const columnTypeRenderers: Record<string, React.ReactNode> = {
    text: <SkeletonText width="w-24" />,
    badge: <SkeletonBadge width="w-16" />,
    'avatar-text': (
        <div className="flex items-center gap-2">
            <SkeletonAvatar size="sm" />
            <div className="space-y-1">
                <SkeletonText size="sm" width="w-24" />
                <SkeletonText size="sm" width="w-32" className="opacity-70" />
            </div>
        </div>
    ),
    status: (
        <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <SkeletonBadge width="w-14" />
        </div>
    ),
    actions: <SkeletonButton variant="icon" size="sm" />,
    date: (
        <div className="space-y-1">
            <SkeletonText size="sm" width="w-20" />
            <SkeletonText size="sm" width="w-14" className="opacity-70" />
        </div>
    ),
    amount: <SkeletonText width="w-20" />,
};

// Table Row Skeleton
interface TableRowSkeletonProps {
    columns: TableColumnConfig[] | number;
}

export function TableRowSkeleton({ columns }: TableRowSkeletonProps) {
    const columnConfigs: TableColumnConfig[] =
        typeof columns === 'number'
            ? Array.from({ length: columns }, () => ({ type: 'text' as const }))
            : columns;

    return (
        <tr data-testid="table-row-skeleton" className="border-b">
            {columnConfigs.map((col, index) => (
                <td
                    key={index}
                    data-testid="table-cell-skeleton"
                    className={cn('p-4', col.width)}
                >
                    {columnTypeRenderers[col.type || 'text']}
                </td>
            ))}
        </tr>
    );
}

// Table Header Skeleton
interface TableHeaderSkeletonProps {
    columns: TableColumnConfig[] | number;
}

function TableHeaderSkeleton({ columns }: TableHeaderSkeletonProps) {
    const columnCount = typeof columns === 'number' ? columns : columns.length;

    return (
        <thead data-testid="table-header-skeleton">
            <tr className="border-b bg-muted/50">
                {Array.from({ length: columnCount }).map((_, index) => (
                    <th key={index} className="p-4 text-left">
                        <SkeletonText size="sm" width="w-16" />
                    </th>
                ))}
            </tr>
        </thead>
    );
}

// Table Toolbar Skeleton
interface TableToolbarSkeletonProps {
    showSearch?: boolean;
    searchWidth?: string;
    filterCount?: number;
    className?: string;
}

export function TableToolbarSkeleton({
    showSearch = true,
    searchWidth = 'w-[300px]',
    filterCount = 0,
    className,
}: TableToolbarSkeletonProps) {
    return (
        <div
            data-testid="table-toolbar-skeleton"
            className={cn(
                'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between',
                className
            )}
        >
            {showSearch && (
                <div className="relative max-w-sm" data-testid="search-skeleton">
                    <SkeletonInput width={searchWidth} />
                </div>
            )}
            {filterCount > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    {Array.from({ length: filterCount }).map((_, index) => (
                        <Skeleton
                            key={index}
                            data-testid="filter-skeleton"
                            className="h-8 w-[140px] rounded-md"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Table Pagination Skeleton
interface TablePaginationSkeletonProps {
    className?: string;
}

export function TablePaginationSkeleton({ className }: TablePaginationSkeletonProps) {
    return (
        <div
            data-testid="table-pagination-skeleton"
            className={cn('flex items-center justify-between px-2 py-4', className)}
        >
            <div className="flex items-center gap-2" data-testid="rows-per-page-skeleton">
                <SkeletonText size="sm" width="w-32" />
                <Skeleton className="h-8 w-[70px] rounded-md" />
            </div>
            <div className="flex items-center gap-2">
                <SkeletonText size="sm" width="w-24" />
                <div className="flex items-center gap-1">
                    <SkeletonButton variant="icon" size="sm" />
                    <SkeletonButton variant="icon" size="sm" />
                    <SkeletonButton variant="icon" size="sm" />
                    <SkeletonButton variant="icon" size="sm" />
                </div>
            </div>
        </div>
    );
}

// Main Table Skeleton
interface TableSkeletonProps extends React.ComponentProps<'div'> {
    columns?: TableColumnConfig[] | number;
    rows?: number;
    showToolbar?: boolean;
    showSearch?: boolean;
    filterCount?: number;
    showPagination?: boolean;
}

export function TableSkeleton({
    columns = 5,
    rows = 5,
    showToolbar = true,
    showSearch = true,
    filterCount = 0,
    showPagination = true,
    className,
    ...props
}: TableSkeletonProps) {
    return (
        <div
            className={cn('animate-in fade-in duration-300 space-y-4', className)}
            {...props}
        >
            {showToolbar && (
                <TableToolbarSkeleton
                    showSearch={showSearch}
                    filterCount={filterCount}
                />
            )}

            <div className="rounded-md border bg-card">
                <table className="w-full">
                    <TableHeaderSkeleton columns={columns} />
                    <tbody>
                        {Array.from({ length: rows }).map((_, index) => (
                            <TableRowSkeleton key={index} columns={columns} />
                        ))}
                    </tbody>
                </table>
            </div>

            {showPagination && <TablePaginationSkeleton />}
        </div>
    );
}
