import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeaderSkeleton, FileGridSkeleton } from '@/components/skeletons';
import { SkeletonButton } from '@/components/ui/skeleton-primitives';

export function FileManagerSkeleton() {
    return (
        <div className="animate-in fade-in duration-300 max-w-7xl mx-auto space-y-6">
            {/* Page Header with Project Selector */}
            <PageHeaderSkeleton showTitle showProjectSelector />

            {/* File Manager Card */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    {/* Upload Zone Placeholder */}
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>

                    <Separator />

                    {/* File Grid */}
                    <FileGridSkeleton count={6} />
                </CardContent>
            </Card>

            {/* Load More Button */}
            <SkeletonButton className="w-full" />
        </div>
    );
}
