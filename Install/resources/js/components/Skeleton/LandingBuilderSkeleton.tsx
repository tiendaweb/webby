import { Skeleton } from '@/components/ui/skeleton';

function SectionCardSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="w-8 h-8 rounded-md" />
            <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
        </div>
    );
}

function ContentEditorSkeleton() {
    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-9 rounded-full" />
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-24 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            </div>

            {/* Items Section */}
            <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border rounded-lg p-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-4 w-4" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <Skeleton className="h-5 w-9 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-4 w-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PreviewTabSkeleton() {
    return (
        <div className="h-full bg-muted/30 flex flex-col">
            {/* Browser Chrome */}
            <div className="h-10 bg-muted/50 border-b flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-3 rounded-full" />
                </div>
                <Skeleton className="flex-1 h-6 rounded-md mx-4" />
            </div>

            {/* Preview Content */}
            <div className="flex-1 p-8 space-y-8">
                {/* Hero Section */}
                <div className="text-center space-y-4 py-12">
                    <Skeleton className="h-10 w-3/4 mx-auto" />
                    <Skeleton className="h-6 w-1/2 mx-auto" />
                    <Skeleton className="h-12 w-64 mx-auto rounded-xl" />
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-6 border rounded-lg space-y-3">
                            <Skeleton className="h-10 w-10 rounded-md" />
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>

                {/* Testimonials */}
                <div className="flex gap-4 justify-center">
                    {[1, 2].map((i) => (
                        <div key={i} className="w-72 p-4 border rounded-lg space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                            <div className="flex items-center gap-2 pt-2">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function LandingBuilderSkeleton() {
    return (
        <div className="h-screen flex bg-background" data-testid="landing-builder-skeleton">
            {/* LEFT PANEL - Section List */}
            <div
                className="w-full md:w-[420px] shrink-0 md:border-e flex flex-col"
                data-testid="section-list-skeleton"
            >
                {/* Header */}
                <div className="h-14 px-4 border-b flex items-center justify-between shrink-0">
                    <Skeleton className="h-5 w-40" />
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                </div>

                {/* Section List */}
                <div className="flex-1 p-4 space-y-2 overflow-hidden">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <SectionCardSkeleton key={i} />
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL - Editor/Preview */}
            <div
                className="hidden md:flex flex-1 flex-col overflow-hidden"
                data-testid="editor-panel-skeleton"
            >
                {/* Tab Header */}
                <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-background">
                    {/* Tab Toggle Buttons */}
                    <div className="flex items-center border rounded-lg overflow-hidden">
                        <Skeleton className="h-9 w-24" />
                        <div className="w-px h-6 bg-border" />
                        <Skeleton className="h-9 w-24" />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-[140px] rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden p-6">
                    <div className="max-w-2xl">
                        <ContentEditorSkeleton />
                    </div>
                </div>
            </div>
        </div>
    );
}

export { SectionCardSkeleton, ContentEditorSkeleton, PreviewTabSkeleton };
