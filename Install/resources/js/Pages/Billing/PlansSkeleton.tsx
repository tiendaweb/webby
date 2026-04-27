import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { SkeletonButton, SkeletonText } from '@/components/ui/skeleton-primitives';

export function PlansSkeleton() {
    return (
        <div className="animate-in fade-in duration-300 space-y-6">
            {/* Page Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <SkeletonButton />
            </div>

            {/* Plan Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="flex flex-col">
                        <CardHeader className="pt-8">
                            <SkeletonText size="lg" width="w-24" />
                            <SkeletonText size="sm" width="w-full" className="opacity-70" />
                        </CardHeader>
                        <CardContent className="flex-1">
                            {/* Price */}
                            <div className="mb-6">
                                <Skeleton className="h-10 w-24" />
                                <Skeleton className="h-4 w-16 mt-1" />
                            </div>
                            {/* Features List */}
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <div key={j} className="flex items-center gap-3">
                                        <Skeleton className="h-5 w-5 rounded-full" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <SkeletonButton className="w-full" size="lg" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
