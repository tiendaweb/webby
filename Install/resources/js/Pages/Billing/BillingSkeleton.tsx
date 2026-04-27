import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SkeletonButton, SkeletonText } from '@/components/ui/skeleton-primitives';
import { TableSkeleton } from '@/components/Admin/skeletons';

export function BillingSkeleton() {
    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            {/* Page Header with Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center gap-2">
                    <SkeletonButton />
                    <SkeletonButton />
                    <SkeletonButton />
                </div>
            </div>

            {/* Current Subscription Card */}
            <Card>
                <CardHeader>
                    <SkeletonText size="base" width="w-40" />
                    <SkeletonText size="sm" width="w-56" className="opacity-70" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-32" />
                    <div className="flex flex-wrap gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </CardContent>
            </Card>

            {/* Billing History Card */}
            <Card>
                <CardHeader>
                    <SkeletonText size="base" width="w-36" />
                </CardHeader>
                <CardContent>
                    <TableSkeleton
                        rows={5}
                        columns={4}
                        showToolbar={false}
                        showPagination={false}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
