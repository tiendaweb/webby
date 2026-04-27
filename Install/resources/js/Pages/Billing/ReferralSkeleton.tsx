import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SkeletonButton, SkeletonText } from '@/components/ui/skeleton-primitives';
import { TableSkeleton } from '@/components/Admin/skeletons';

export function ReferralSkeleton() {
    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            {/* Page Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <SkeletonButton />
            </div>

            {/* Credit Balance Card */}
            <Card>
                <CardHeader>
                    <SkeletonText size="base" width="w-32" />
                    <SkeletonText size="sm" width="w-48" className="opacity-70" />
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-8 w-24" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                        <SkeletonButton />
                    </div>
                </CardContent>
            </Card>

            {/* Referral Link Card */}
            <Card>
                <CardHeader>
                    <SkeletonText size="base" width="w-36" />
                    <SkeletonText size="sm" width="w-64" className="opacity-70" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-10" />
                    </div>
                </CardContent>
            </Card>

            {/* Credit History Card */}
            <Card>
                <CardHeader>
                    <SkeletonText size="base" width="w-32" />
                    <SkeletonText size="sm" width="w-48" className="opacity-70" />
                </CardHeader>
                <CardContent>
                    <TableSkeleton
                        rows={5}
                        columns={4}
                        showToolbar={false}
                        showPagination
                    />
                </CardContent>
            </Card>
        </div>
    );
}
