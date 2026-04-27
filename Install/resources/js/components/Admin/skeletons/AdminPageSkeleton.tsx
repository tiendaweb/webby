import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    SkeletonText,
    SkeletonButton,
    SkeletonBadge,
    SkeletonIcon,
} from '@/components/ui/skeleton-primitives';

// Admin Page Header Skeleton
interface AdminPageHeaderSkeletonProps {
    showAction?: boolean;
}

function AdminPageHeaderSkeleton({ showAction = false }: AdminPageHeaderSkeletonProps) {
    return (
        <div
            data-testid="admin-page-header-skeleton"
            className="flex items-center justify-between mb-6"
        >
            <div className="space-y-1">
                <SkeletonText size="xl" width="w-48" />
                <SkeletonText size="sm" width="w-64" className="opacity-70" />
            </div>
            {showAction && (
                <div data-testid="header-action-skeleton">
                    <SkeletonButton />
                </div>
            )}
        </div>
    );
}

// Admin Page Skeleton - wrapper with header
interface AdminPageSkeletonProps extends React.ComponentProps<'div'> {
    showAction?: boolean;
    children: React.ReactNode;
}

export function AdminPageSkeleton({
    showAction = false,
    children,
    className,
    ...props
}: AdminPageSkeletonProps) {
    return (
        <div
            className={cn('animate-in fade-in duration-300', className)}
            {...props}
        >
            <AdminPageHeaderSkeleton showAction={showAction} />
            {children}
        </div>
    );
}

// Detail Page Skeleton - for SubscriptionDetails page
interface DetailPageSkeletonProps extends React.ComponentProps<'div'> {
    variant?: 'subscription';
}

export function DetailPageSkeleton({
    variant: _variant = 'subscription',
    className,
    ...props
}: DetailPageSkeletonProps) {
    return (
        <div
            data-testid="detail-page-skeleton"
            className={cn('animate-in fade-in duration-300', className)}
            {...props}
        >
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                    <SkeletonText size="xl" width="w-48" />
                    <SkeletonText size="sm" width="w-40" className="opacity-70" />
                </div>
                <SkeletonButton />
            </div>

            {/* Main content grid */}
            <div
                data-testid="detail-content-skeleton"
                className="grid gap-6 lg:grid-cols-3"
            >
                {/* Main content - 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* User Info Card */}
                    <Card data-testid="user-info-card-skeleton">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <SkeletonIcon size="md" />
                                <SkeletonText size="lg" width="w-36" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="space-y-1">
                                        <SkeletonText size="sm" width="w-16" className="opacity-70" />
                                        <SkeletonText width="w-32" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subscription Details Card */}
                    <Card data-testid="subscription-details-card-skeleton">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <SkeletonIcon size="md" />
                                <SkeletonText size="lg" width="w-40" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="space-y-1">
                                        <SkeletonText size="sm" width="w-20" className="opacity-70" />
                                        {i === 1 ? (
                                            <SkeletonBadge width="w-16" />
                                        ) : i === 3 ? (
                                            <SkeletonBadge width="w-20" />
                                        ) : (
                                            <SkeletonText width="w-28" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction History Card */}
                    <Card data-testid="transaction-history-card-skeleton">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <SkeletonIcon size="md" />
                                <SkeletonText size="lg" width="w-40" />
                            </div>
                            <SkeletonText size="sm" width="w-64" className="opacity-70" />
                        </CardHeader>
                        <CardContent>
                            {/* Table skeleton */}
                            <div className="space-y-3">
                                {/* Header row */}
                                <div className="flex gap-4 pb-2 border-b">
                                    {['w-16', 'w-16', 'w-20', 'w-16', 'w-20'].map((width, i) => (
                                        <SkeletonText key={i} size="sm" width={width} />
                                    ))}
                                </div>
                                {/* Data rows */}
                                {Array.from({ length: 3 }).map((_, rowIndex) => (
                                    <div key={rowIndex} className="flex gap-4 py-2">
                                        <SkeletonText size="sm" width="w-20" />
                                        <SkeletonBadge width="w-16" />
                                        <SkeletonText size="sm" width="w-16" />
                                        <SkeletonBadge width="w-14" />
                                        <SkeletonText size="sm" width="w-20" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - 1 column */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    <Card data-testid="actions-card-skeleton">
                        <CardHeader>
                            <SkeletonText size="lg" width="w-20" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-9 w-full rounded-md" />
                            <Skeleton className="h-9 w-full rounded-md" />
                        </CardContent>
                    </Card>

                    {/* Admin Notes Card */}
                    <Card data-testid="admin-notes-card-skeleton">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <SkeletonIcon size="md" />
                                <SkeletonText size="lg" width="w-28" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-20 w-full rounded-md" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
