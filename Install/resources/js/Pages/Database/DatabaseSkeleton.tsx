import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeaderSkeleton } from '@/components/skeletons';

export function DatabaseSkeleton() {
    return (
        <div className="animate-in fade-in duration-300 max-w-7xl mx-auto space-y-6">
            {/* Page Header with Project Selector */}
            <PageHeaderSkeleton showTitle showProjectSelector />

            {/* Firebase Browser Card */}
            <Card>
                <CardContent className="p-6">
                    {/* Tree View Placeholder */}
                    <div className="space-y-3">
                        {/* Root level items */}
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                {/* Collection */}
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                {/* Nested documents */}
                                {i === 0 && (
                                    <div className="ml-6 space-y-2">
                                        {Array.from({ length: 2 }).map((_, j) => (
                                            <div key={j} className="flex items-center gap-2">
                                                <Skeleton className="h-4 w-4" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
