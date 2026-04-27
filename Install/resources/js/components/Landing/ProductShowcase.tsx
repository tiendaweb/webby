import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ShowcaseTab {
    value: string;
    label: string;
    screenshot_light?: string | null;
    screenshot_dark?: string | null;
}

interface ProductShowcaseProps {
    content?: Record<string, unknown>;
    items?: ShowcaseTab[];
    settings?: {
        showcase_type?: 'video' | 'screenshots';
    };
}

// Default tabs with default screenshots - labels are translation keys
const DEFAULT_TAB_VALUES = [
    { value: 'preview', labelKey: 'Preview', screenshot_light: '/screenshots/preview-light.png', screenshot_dark: '/screenshots/preview-dark.png' },
    { value: 'inspect', labelKey: 'Inspect', screenshot_light: '/screenshots/inspect-light.png', screenshot_dark: '/screenshots/inspect-dark.png' },
    { value: 'code', labelKey: 'Code', screenshot_light: '/screenshots/code-light.png', screenshot_dark: '/screenshots/code-dark.png' },
];

export function ProductShowcase({ content, items, settings }: ProductShowcaseProps = {}) {
    const { resolvedTheme } = useTheme();
    const { t } = useTranslation();
    const [activeView, setActiveView] = useState<string>('preview');

    // Get content with defaults - DB content takes priority
    const title = (content?.title as string) || t('See it in action');
    const subtitle = (content?.subtitle as string) || t('A powerful development environment that lets you chat with AI, edit code, and manage projects all in one place.');
    const videoUrl = content?.video_url as string | undefined;
    const showcaseType = settings?.showcase_type || 'screenshots';

    // Use database items if provided, otherwise fall back to translated defaults
    const tabs = useMemo(() => {
        if (items && items.length > 0) {
            // Map database items to tab format
            return items.map(item => ({
                value: item.value || item.label?.toLowerCase().replace(/\s+/g, '-') || 'tab',
                label: item.label || 'Tab',
                screenshot_light: item.screenshot_light || null,
                screenshot_dark: item.screenshot_dark || null,
            }));
        }
        // Default tabs with translated labels
        return DEFAULT_TAB_VALUES.map(tab => ({
            ...tab,
            label: t(tab.labelKey),
        }));
    }, [items, t]);

    // Set initial active view to first tab
    const initialTab = tabs[0]?.value || 'preview';
    if (activeView !== initialTab && !tabs.find(t => t.value === activeView)) {
        setActiveView(initialTab);
    }

    // Get screenshot URL for a tab
    const getScreenshotUrl = (tab: ShowcaseTab) => {
        const isDark = resolvedTheme === 'dark';
        // Use custom screenshots if provided, otherwise fall back to default paths
        if (isDark && tab.screenshot_dark) {
            return tab.screenshot_dark;
        }
        if (!isDark && tab.screenshot_light) {
            return tab.screenshot_light;
        }
        // Fallback to default screenshot paths
        return `/screenshots/${tab.value}-${isDark ? 'dark' : 'light'}.png`;
    };

    // Extract YouTube video ID from URL
    const getYouTubeEmbedUrl = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const videoId = match && match[2].length === 11 ? match[2] : null;
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?rel=0`;
        }
        return null;
    };

    return (
        <section className="py-16 lg:py-24 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                        {title}
                    </h2>
                    <p className="text-lg text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {/* Video Mode */}
                {showcaseType === 'video' && videoUrl && (
                    <div className="max-w-5xl mx-auto">
                        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                            {/* Browser Header */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                                {/* Traffic Lights */}
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                            </div>

                            {/* Video Area */}
                            <div className="relative aspect-video bg-background">
                                {getYouTubeEmbedUrl(videoUrl) ? (
                                    <iframe
                                        src={getYouTubeEmbedUrl(videoUrl)!}
                                        title="Product demo video"
                                        className="absolute inset-0 w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        {t('Invalid video URL')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Screenshots Mode */}
                {(showcaseType === 'screenshots' || !videoUrl) && (
                    <>
                        {/* Tab Switcher */}
                        <div className="flex justify-center mb-8">
                            <Tabs value={activeView} onValueChange={setActiveView}>
                                <TabsList className={cn(
                                    "grid w-full max-w-sm",
                                    tabs.length === 2 && "grid-cols-2",
                                    tabs.length === 3 && "grid-cols-3",
                                    tabs.length === 4 && "grid-cols-4",
                                    tabs.length >= 5 && "grid-cols-5"
                                )}>
                                    {tabs.map((tab) => (
                                        <TabsTrigger key={tab.value} value={tab.value}>
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Browser Frame */}
                        <div className="max-w-5xl mx-auto">
                            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                                {/* Browser Header */}
                                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                                    {/* Traffic Lights */}
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                    </div>
                                </div>

                                {/* Screenshot Area */}
                                <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-background">
                                    {tabs.map((tab) => (
                                        <img
                                            key={tab.value}
                                            src={getScreenshotUrl(tab)}
                                            alt={`${tab.label} view`}
                                            className={cn(
                                                'absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300',
                                                activeView === tab.value ? 'opacity-100' : 'opacity-0'
                                            )}
                                            loading="lazy"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
