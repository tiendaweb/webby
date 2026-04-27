import { useState, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface FinalCTAProps {
    auth: {
        user: { id: number; name: string; email: string } | null;
    };
    isPusherConfigured?: boolean;
    canCreateProject?: boolean;
    cannotCreateReason?: string | null;
    content?: Record<string, unknown>;
}

export function FinalCTA({
    auth,
    isPusherConfigured = true,
    canCreateProject = true,
    cannotCreateReason = null,
    content,
}: FinalCTAProps) {
    const { t, isRtl } = useTranslation();

    // Extract content with defaults - DB content takes priority
    const title = (content?.title as string) || t('Ready to build something amazing?');
    const subtitle = (content?.subtitle as string) || t('Start building for free. No credit card required.');
    const [prompt, setPrompt] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Compute disabled state for logged-in users
    const isDisabled = !!(auth.user && (!isPusherConfigured || !canCreateProject));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        if (!auth.user) {
            sessionStorage.setItem('landing_prompt', prompt.trim());
            router.visit('/register');
        } else {
            router.post('/projects', { prompt: prompt.trim() });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <section className="py-16 lg:py-24 bg-muted/30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                {/* Headline */}
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter mb-4">
                    {title}
                </h2>

                {/* Subtitle */}
                <p className="text-lg md:text-xl text-muted-foreground/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                    {subtitle}
                </p>

                {/* Cannot create project warning (for logged-in users) */}
                {auth.user && !isPusherConfigured && (
                    <Alert variant="destructive" className="max-w-2xl mx-auto mb-4 text-left">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {t('Real-time features are not configured. Please contact support.')}
                        </AlertDescription>
                    </Alert>
                )}

                {auth.user && !canCreateProject && isPusherConfigured && (
                    <Alert variant="destructive" className="max-w-2xl mx-auto mb-4 text-left">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {cannotCreateReason}{' '}
                            <Link href="/billing/plans" className="underline font-semibold">
                                {t('View Plans')}
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Prompt Input */}
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="relative bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('Describe what you want to build...')}
                                disabled={isDisabled}
                                className="w-full px-4 py-4 text-base resize-none focus:outline-none focus:ring-0 border-0 min-h-[100px] bg-transparent text-start disabled:opacity-50 disabled:cursor-not-allowed"
                                rows={3}
                            />
                            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/50 border-t border-border">
                                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{t('Press')}</span>
                                    <kbd className="px-2 py-0.5 bg-card rounded border text-xs">
                                        ⌘ Enter
                                    </kbd>
                                    <span>{t('to start')}</span>
                                </div>
                                <div className="flex items-center gap-2 ms-auto">
                                    <Button
                                        type="submit"
                                        disabled={!prompt.trim() || isDisabled}
                                        className="shrink-0 h-10 min-w-[100px] transition-all hover:scale-[1.02] hover:shadow-md"
                                    >
                                        <span className="text-sm sm:text-base">
                                            {auth.user ? t('Start') : t('Go')}
                                        </span>
                                        {isRtl ? (
                                            <ArrowLeft className="h-4 w-4 me-1.5" />
                                        ) : (
                                            <ArrowRight className="h-4 w-4 ms-1.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Trust Note */}
                <p className="mt-6 text-sm text-muted-foreground">
                    {t('Start building today')}
                </p>
            </div>
        </section>
    );
}
