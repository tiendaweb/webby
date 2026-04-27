import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonText, SkeletonIcon, SkeletonButton, SkeletonBadge } from '@/components/ui/skeleton-primitives';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function StatsCardSkeleton() {
    return (
        <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <SkeletonText size="sm" width="w-24" />
                    <SkeletonIcon size="lg" shape="square" className="rounded-lg" />
                </div>
                <div className="space-y-2">
                    <SkeletonText size="xl" width="w-32" />
                    <div className="flex items-center gap-1.5">
                        <SkeletonBadge width="w-14" />
                        <SkeletonText size="sm" width="w-20" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function StatsGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function ChartSkeleton({ height = 250 }: { height?: number }) {
    return (
        <div className="w-full" style={{ height }}>
            <div className="flex flex-col h-full">
                {/* Y-axis and chart area */}
                <div className="flex-1 flex">
                    <div className="w-12 flex flex-col justify-between py-4">
                        <SkeletonText size="sm" width="w-8" />
                        <SkeletonText size="sm" width="w-6" />
                        <SkeletonText size="sm" width="w-8" />
                        <SkeletonText size="sm" width="w-6" />
                    </div>
                    <div className="flex-1 relative">
                        {/* Simulated chart area */}
                        <Skeleton className="absolute inset-0 opacity-50" />
                    </div>
                </div>
                {/* X-axis */}
                <div className="h-8 flex justify-between px-12 pt-2">
                    <SkeletonText size="sm" width="w-10" />
                    <SkeletonText size="sm" width="w-10" />
                    <SkeletonText size="sm" width="w-10" />
                    <SkeletonText size="sm" width="w-10" />
                </div>
            </div>
        </div>
    );
}

export function PieChartSkeleton() {
    return (
        <div className="w-full h-[200px] flex flex-col items-center justify-center gap-4">
            <Skeleton className="h-[140px] w-[140px] rounded-full" />
            <div className="flex gap-4">
                <SkeletonText size="sm" width="w-16" />
                <SkeletonText size="sm" width="w-16" />
                <SkeletonText size="sm" width="w-16" />
            </div>
        </div>
    );
}

export function TrendChartSkeleton() {
    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
                <SkeletonButton size="sm" className="w-24" />
                <SkeletonButton size="sm" className="w-24" />
                <SkeletonButton size="sm" className="w-24" />
            </div>
            {/* Chart */}
            <ChartSkeleton height={250} />
        </div>
    );
}

export function AiUsageCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <SkeletonText size="base" width="w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                            <SkeletonText size="sm" width="w-16" />
                            <SkeletonText size="lg" width="w-20" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function ReferralStatsCardSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <SkeletonText size="base" width="w-32" />
                <SkeletonButton size="sm" className="w-24" />
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                            <SkeletonText size="sm" width="w-20" />
                            <SkeletonText size="lg" width="w-16" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function StorageCardSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <SkeletonText size="base" width="w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="text-center space-y-1">
                            <SkeletonText size="xl" width="w-16" className="mx-auto" />
                            <SkeletonText size="sm" width="w-12" className="mx-auto" />
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    <SkeletonText size="sm" width="w-24" />
                    <Skeleton className="h-2 w-full rounded-full" />
                    <div className="flex gap-3">
                        <SkeletonText size="sm" width="w-20" />
                        <SkeletonText size="sm" width="w-20" />
                        <SkeletonText size="sm" width="w-20" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function FirebaseCardSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <SkeletonText size="base" width="w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <SkeletonText size="sm" width="w-24" />
                        <SkeletonBadge width="w-20" />
                    </div>
                    <div className="flex items-center justify-between">
                        <SkeletonText size="sm" width="w-24" />
                        <SkeletonBadge width="w-20" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="text-center space-y-1">
                            <SkeletonText size="lg" width="w-8" className="mx-auto" />
                            <SkeletonText size="sm" width="w-16" className="mx-auto" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function OverviewSkeleton() {
    return (
        <div className="animate-in fade-in duration-300">
            {/* Core Stats Grid */}
            <StatsGridSkeleton />

            {/* Trend Chart */}
            <Card className="mb-8">
                <CardHeader>
                    <SkeletonText size="base" width="w-32" />
                </CardHeader>
                <CardContent>
                    <TrendChartSkeleton />
                </CardContent>
            </Card>

            {/* Distribution Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <SkeletonText size="base" width="w-40" />
                    </CardHeader>
                    <CardContent>
                        <PieChartSkeleton />
                    </CardContent>
                </Card>

                <ReferralStatsCardSkeleton />
            </div>

            {/* AI Usage Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <AiUsageCardSkeleton />

                <Card>
                    <CardHeader>
                        <SkeletonText size="base" width="w-36" />
                    </CardHeader>
                    <CardContent>
                        <PieChartSkeleton />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <SkeletonText size="base" width="w-36" />
                    </CardHeader>
                    <CardContent>
                        <ChartSkeleton height={200} />
                    </CardContent>
                </Card>
            </div>

            {/* Storage & Firebase Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StorageCardSkeleton />
                <FirebaseCardSkeleton />
            </div>
        </div>
    );
}
