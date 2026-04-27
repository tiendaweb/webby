import { Skeleton } from '@/components/ui/skeleton';
import {
    FilterBarSkeleton,
    ProjectCardSkeleton,
    SimplePaginationSkeleton,
} from '@/components/skeletons';
import { TabsSkeleton } from '@/components/Admin/skeletons';

export function ProjectsSkeleton() {
    return (
        <div className="animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="prose prose-sm dark:prose-invert mb-6">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-64 mt-2" />
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <TabsSkeleton tabCount={3} contentVariant="custom" contentHeight="min-h-0" />
            </div>

            {/* Filter Bar */}
            <div className="mb-6">
                <FilterBarSkeleton
                    showSearch
                    showSort
                    showVisibility
                    showViewToggle
                />
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <ProjectCardSkeleton key={i} viewMode="grid" />
                ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-center">
                <SimplePaginationSkeleton />
            </div>
        </div>
    );
}
