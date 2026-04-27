import { Skeleton } from '@/components/ui/skeleton';
import { GradientBackground } from '@/components/Dashboard/GradientBackground';

export function CreatePageSkeleton() {
    return (
        <div className="relative min-h-screen bg-background">
            <GradientBackground />

            {/* Header */}
            <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between px-4">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>

            {/* Hero Section */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 md:px-8">
                {/* Greeting */}
                <div className="text-center mb-8">
                    <Skeleton className="h-10 w-64 mx-auto" />
                </div>

                {/* Prompt Input */}
                <div className="w-full max-w-3xl">
                    <div className="bg-card rounded-2xl border border-border/50 shadow-lg overflow-hidden">
                        <Skeleton className="h-[100px] w-full rounded-none" />
                        <div className="flex items-center justify-between p-3 border-t border-border/50">
                            <Skeleton className="h-8 w-32 rounded-lg" />
                            <Skeleton className="h-9 w-24 rounded-lg" />
                        </div>
                    </div>

                    {/* Suggestions */}
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <Skeleton className="h-8 w-40 rounded-full" />
                        <Skeleton className="h-8 w-36 rounded-full" />
                        <Skeleton className="h-8 w-32 rounded-full" />
                        <Skeleton className="h-8 w-44 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
