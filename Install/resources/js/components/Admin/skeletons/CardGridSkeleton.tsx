import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
    SkeletonText,
    SkeletonBadge,
    SkeletonButton,
} from '@/components/ui/skeleton-primitives';

// Generic Card Skeleton
interface CardSkeletonProps extends React.ComponentProps<'div'> {
    showHeader?: boolean;
    showFooter?: boolean;
}

export function CardSkeleton({
    showHeader = true,
    showFooter = true,
    className,
    ...props
}: CardSkeletonProps) {
    return (
        <Card data-testid="card-skeleton" className={cn('flex flex-col', className)} {...props}>
            {showHeader && (
                <CardHeader data-testid="card-header-skeleton">
                    <div className="space-y-2">
                        <SkeletonText size="lg" width="w-32" />
                        <SkeletonText size="sm" width="w-48" className="opacity-70" />
                    </div>
                </CardHeader>
            )}
            <CardContent className="flex-1">
                <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </CardContent>
            {showFooter && (
                <CardFooter data-testid="card-footer-skeleton" className="gap-2">
                    <SkeletonButton />
                    <SkeletonButton />
                </CardFooter>
            )}
        </Card>
    );
}

// Plan Card Skeleton - matches Plans/Index.tsx structure
export function PlanCardSkeleton(props: React.ComponentProps<'div'>) {
    return (
        <Card
            data-testid="plan-card-skeleton"
            className="flex flex-col"
            {...props}
        >
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            {/* Drag handle */}
                            <Skeleton className="h-5 w-5" />
                            {/* Title */}
                            <SkeletonText size="lg" width="w-24" />
                            {/* Star icon */}
                            <Skeleton className="h-4 w-4" />
                        </div>
                        {/* Badges */}
                        <div className="flex gap-2 mt-2">
                            <SkeletonBadge width="w-16" />
                            <SkeletonBadge width="w-14" />
                        </div>
                    </div>
                </div>
                {/* Description */}
                <SkeletonText size="sm" width="w-full" className="mt-2 opacity-70" />
                {/* Price */}
                <div className="mt-4" data-testid="plan-price-skeleton">
                    <Skeleton className="h-8 w-24 inline-block" />
                    <Skeleton className="h-4 w-8 inline-block ml-1" />
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                {/* Features list */}
                <div data-testid="plan-features-skeleton" className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <SkeletonText size="sm" width={`w-${24 + (i % 3) * 8}`} />
                        </div>
                    ))}
                </div>

                {/* Stats section */}
                <div data-testid="plan-stats-skeleton" className="mt-4 pt-4 border-t space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4" />
                            <SkeletonText size="sm" width="w-32" />
                        </div>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="flex-col gap-2 pt-4 border-t">
                <div className="flex gap-2 w-full">
                    <SkeletonButton className="flex-1" />
                    <SkeletonButton className="flex-1" />
                    <SkeletonButton variant="icon" />
                </div>
            </CardFooter>
        </Card>
    );
}

// Plugin Card Skeleton - matches Plugins.tsx structure
export function PluginCardSkeleton(props: React.ComponentProps<'div'>) {
    return (
        <Card
            data-testid="plugin-card-skeleton"
            className="flex flex-col"
            {...props}
        >
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {/* Icon container */}
                        <Skeleton
                            data-testid="plugin-icon-skeleton"
                            className="h-10 w-10 rounded-lg"
                        />
                        <div>
                            {/* Title */}
                            <SkeletonText size="lg" width="w-24" />
                            {/* Version/Author */}
                            <SkeletonText size="sm" width="w-32" className="mt-1 opacity-70" />
                        </div>
                    </div>
                    {/* Toggle switch */}
                    <Skeleton className="h-5 w-9 rounded-full" />
                </div>
                {/* Badges */}
                <div className="flex gap-2 mt-2">
                    <SkeletonBadge width="w-12" />
                    <SkeletonBadge width="w-16" />
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                {/* Description */}
                <div data-testid="plugin-description-skeleton" className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                {/* Status message */}
                <div className="mt-3 flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <SkeletonText size="sm" width="w-24" />
                </div>
            </CardContent>

            <CardFooter className="gap-2">
                <SkeletonButton className="flex-1" />
                <SkeletonButton className="flex-1" />
            </CardFooter>
        </Card>
    );
}

// Grid Column Classes
const gridColumnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
} as const;

// Card Grid Skeleton
interface CardGridSkeletonProps extends React.ComponentProps<'div'> {
    count?: number;
    columns?: 1 | 2 | 3 | 4;
    cardVariant?: 'plan' | 'plugin' | 'generic';
}

export function CardGridSkeleton({
    count = 6,
    columns = 3,
    cardVariant = 'generic',
    className,
    ...props
}: CardGridSkeletonProps) {
    const CardComponent =
        cardVariant === 'plan'
            ? PlanCardSkeleton
            : cardVariant === 'plugin'
              ? PluginCardSkeleton
              : CardSkeleton;

    return (
        <div
            className={cn(
                'animate-in fade-in duration-300 grid gap-6',
                gridColumnClasses[columns],
                className
            )}
            {...props}
        >
            {Array.from({ length: count }).map((_, index) => (
                <CardComponent key={index} />
            ))}
        </div>
    );
}
