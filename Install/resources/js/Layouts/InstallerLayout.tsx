import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import ApplicationLogo from '@/components/ApplicationLogo';
import { GradientBackground } from '@/components/Dashboard/GradientBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster } from '@/components/ui/sonner';
import StepIndicator from '@/components/Install/StepIndicator';

interface InstallerLayoutProps extends PropsWithChildren {
    currentStep?: number;
    title?: string;
}

export default function InstallerLayout({ children, currentStep, title }: InstallerLayoutProps) {
    return (
        <div className="relative min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <GradientBackground />

            {/* Theme Toggle */}
            <div className="absolute top-4 end-4 z-50 flex items-center gap-2">
                <ThemeToggle />
            </div>

            <div className="relative z-10 w-full max-w-xl">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center mb-6">
                    <ApplicationLogo showText size="lg" />
                </Link>

                {/* Step Indicator */}
                {currentStep !== undefined && (
                    <div className="mb-6">
                        <StepIndicator currentStep={currentStep} />
                    </div>
                )}

                {/* Card */}
                <Card>
                    <CardContent className="pt-6">
                        {title && (
                            <div className="text-center mb-6">
                                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                            </div>
                        )}
                        {children}
                    </CardContent>
                </Card>
            </div>

            <Toaster />
        </div>
    );
}
