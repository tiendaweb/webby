import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
    SkeletonText,
    SkeletonButton,
    SkeletonInput,
    SkeletonIcon,
} from '@/components/ui/skeleton-primitives';
import { TableSkeleton } from './TableSkeleton';

// Form Skeleton - for form content areas
interface FormSkeletonProps extends React.ComponentProps<'div'> {
    fieldCount?: number;
    showTitle?: boolean;
    showSubmit?: boolean;
}

export function FormSkeleton({
    fieldCount = 4,
    showTitle = true,
    showSubmit = true,
    className,
    ...props
}: FormSkeletonProps) {
    return (
        <div className={cn('space-y-6', className)} {...props}>
            {showTitle && (
                <div data-testid="form-title-skeleton" className="space-y-1">
                    <SkeletonText size="xl" width="w-48" />
                    <SkeletonText size="sm" width="w-64" className="opacity-70" />
                </div>
            )}
            <div className="space-y-4">
                {Array.from({ length: fieldCount }).map((_, index) => (
                    <div key={index} data-testid="form-field-skeleton" className="space-y-2">
                        <SkeletonText size="sm" width="w-24" />
                        <SkeletonInput />
                    </div>
                ))}
            </div>
            {showSubmit && (
                <div data-testid="form-submit-skeleton">
                    <SkeletonButton />
                </div>
            )}
        </div>
    );
}

// Sidebar Navigation Skeleton - for Settings page style
interface SidebarNavSkeletonProps extends React.ComponentProps<'div'> {
    itemCount?: number;
    showSearch?: boolean;
    categories?: number;
}

export function SidebarNavSkeleton({
    itemCount = 7,
    showSearch = true,
    categories = 2,
    className,
    ...props
}: SidebarNavSkeletonProps) {
    // Distribute items across categories
    const itemsPerCategory = Math.ceil(itemCount / categories);

    return (
        <Card className={cn('lg:w-64 shrink-0', className)} {...props}>
            <CardContent className="p-4 space-y-4">
                {showSearch && (
                    <div data-testid="sidebar-search-skeleton">
                        <SkeletonInput />
                    </div>
                )}
                <div className="space-y-4">
                    {Array.from({ length: categories }).map((_, catIndex) => (
                        <div key={catIndex} className="space-y-1">
                            <div
                                data-testid="nav-category-skeleton"
                                className="px-3 py-2"
                            >
                                <SkeletonText size="sm" width="w-16" className="opacity-70" />
                            </div>
                            {Array.from({ length: itemsPerCategory }).map((_, itemIndex) => {
                                const globalIndex = catIndex * itemsPerCategory + itemIndex;
                                if (globalIndex >= itemCount) return null;
                                return (
                                    <div
                                        key={itemIndex}
                                        data-testid="nav-item-skeleton"
                                        className="flex items-center gap-2 px-3 py-2 rounded-md"
                                    >
                                        <SkeletonIcon size="sm" />
                                        <SkeletonText size="sm" width="w-20" />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// Tabs Skeleton - for Cronjobs page style
interface TabsSkeletonProps extends React.ComponentProps<'div'> {
    tabCount?: number;
    contentVariant?: 'table' | 'form' | 'cards' | 'custom';
    contentHeight?: string;
}

export function TabsSkeleton({
    tabCount = 2,
    contentVariant = 'table',
    contentHeight = 'min-h-[400px]',
    className,
    ...props
}: TabsSkeletonProps) {
    const renderContent = () => {
        switch (contentVariant) {
            case 'table':
                return <TableSkeleton rows={5} columns={5} showToolbar={false} />;
            case 'form':
                return <FormSkeleton fieldCount={4} />;
            case 'cards':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-lg" />
                        ))}
                    </div>
                );
            default:
                return <Skeleton className={cn('w-full rounded-lg', contentHeight)} />;
        }
    };

    return (
        <div
            className={cn('animate-in fade-in duration-300 space-y-4', className)}
            {...props}
        >
            {/* Tabs List */}
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 gap-1">
                {Array.from({ length: tabCount }).map((_, index) => (
                    <div
                        key={index}
                        data-testid="tab-trigger-skeleton"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-sm"
                    >
                        <SkeletonIcon size="sm" />
                        <SkeletonText size="sm" width="w-20" />
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div data-testid="tabs-content-skeleton" className={contentHeight}>
                {renderContent()}
            </div>
        </div>
    );
}

// Settings Page Skeleton - combines sidebar and form
interface SettingsPageSkeletonProps extends React.ComponentProps<'div'> {
    sidebarItemCount?: number;
}

export function SettingsPageSkeleton({
    sidebarItemCount = 7,
    className,
    ...props
}: SettingsPageSkeletonProps) {
    return (
        <div
            className={cn(
                'animate-in fade-in duration-300 flex flex-col lg:flex-row gap-6',
                className
            )}
            {...props}
        >
            <SidebarNavSkeleton itemCount={sidebarItemCount} categories={2} showSearch />
            <div className="flex-1">
                <Card>
                    <CardContent className="p-6">
                        <FormSkeleton fieldCount={5} showTitle showSubmit />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
