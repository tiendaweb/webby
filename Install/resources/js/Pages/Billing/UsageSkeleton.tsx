import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SkeletonButton, SkeletonText } from '@/components/ui/skeleton-primitives';
import { TabsSkeleton } from '@/components/Admin/skeletons';

export function UsageSkeleton() {
    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            {/* Page Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <SkeletonButton />
            </div>

            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Credit Balance Card */}
                <Card>
                    <CardHeader>
                        <SkeletonText size="base" width="w-32" />
                        <SkeletonText size="sm" width="w-48" className="opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-2 w-full mt-4 rounded-full" />
                        <Skeleton className="h-3 w-40 mt-2" />
                    </CardContent>
                </Card>

                {/* Current Plan Card */}
                <Card>
                    <CardHeader>
                        <SkeletonText size="base" width="w-28" />
                        <SkeletonText size="sm" width="w-44" className="opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-4 w-32 mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Period Filter Buttons */}
            <div className="flex gap-2">
                <SkeletonButton />
                <SkeletonButton />
            </div>

            {/* Tabs with Table */}
            <TabsSkeleton tabCount={2} contentVariant="table" />
        </div>
    );
}
