import { usePage } from '@inertiajs/react';
import { HTMLAttributes, useState, useEffect } from 'react';
import { PageProps, ColorTheme } from '@/types';
import { Paintbrush } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ApplicationLogoProps extends HTMLAttributes<HTMLDivElement> {
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

// Theme color mappings for the default logo icon
const themeColors: Record<ColorTheme, {
    gradient: string;
    shadow: string;
    shadowDark: string;
    hoverShadow: string;
    hoverShadowDark: string;
    textGradient: string;
    textGradientDark: string;
}> = {
    neutral: {
        gradient: 'from-zinc-600 via-zinc-700 to-zinc-800',
        shadow: 'shadow-zinc-500/30',
        shadowDark: 'dark:shadow-zinc-500/20',
        hoverShadow: 'group-hover:shadow-zinc-500/50',
        hoverShadowDark: 'dark:group-hover:shadow-zinc-500/30',
        textGradient: 'from-zinc-700 to-zinc-900',
        textGradientDark: 'dark:from-zinc-300 dark:to-zinc-500',
    },
    blue: {
        gradient: 'from-blue-500 via-blue-600 to-blue-700',
        shadow: 'shadow-blue-500/30',
        shadowDark: 'dark:shadow-blue-500/20',
        hoverShadow: 'group-hover:shadow-blue-500/50',
        hoverShadowDark: 'dark:group-hover:shadow-blue-500/30',
        textGradient: 'from-blue-600 to-blue-800',
        textGradientDark: 'dark:from-blue-400 dark:to-blue-600',
    },
    green: {
        gradient: 'from-green-500 via-green-600 to-green-700',
        shadow: 'shadow-green-500/30',
        shadowDark: 'dark:shadow-green-500/20',
        hoverShadow: 'group-hover:shadow-green-500/50',
        hoverShadowDark: 'dark:group-hover:shadow-green-500/30',
        textGradient: 'from-green-600 to-green-800',
        textGradientDark: 'dark:from-green-400 dark:to-green-600',
    },
    orange: {
        gradient: 'from-orange-500 via-orange-600 to-orange-700',
        shadow: 'shadow-orange-500/30',
        shadowDark: 'dark:shadow-orange-500/20',
        hoverShadow: 'group-hover:shadow-orange-500/50',
        hoverShadowDark: 'dark:group-hover:shadow-orange-500/30',
        textGradient: 'from-orange-600 to-orange-800',
        textGradientDark: 'dark:from-orange-400 dark:to-orange-600',
    },
    red: {
        gradient: 'from-red-500 via-red-600 to-red-700',
        shadow: 'shadow-red-500/30',
        shadowDark: 'dark:shadow-red-500/20',
        hoverShadow: 'group-hover:shadow-red-500/50',
        hoverShadowDark: 'dark:group-hover:shadow-red-500/30',
        textGradient: 'from-red-600 to-red-800',
        textGradientDark: 'dark:from-red-400 dark:to-red-600',
    },
    rose: {
        gradient: 'from-rose-500 via-rose-600 to-rose-700',
        shadow: 'shadow-rose-500/30',
        shadowDark: 'dark:shadow-rose-500/20',
        hoverShadow: 'group-hover:shadow-rose-500/50',
        hoverShadowDark: 'dark:group-hover:shadow-rose-500/30',
        textGradient: 'from-rose-600 to-rose-800',
        textGradientDark: 'dark:from-rose-400 dark:to-rose-600',
    },
    violet: {
        gradient: 'from-violet-500 via-violet-600 to-violet-700',
        shadow: 'shadow-violet-500/30',
        shadowDark: 'dark:shadow-violet-500/20',
        hoverShadow: 'group-hover:shadow-violet-500/50',
        hoverShadowDark: 'dark:group-hover:shadow-violet-500/30',
        textGradient: 'from-violet-600 to-violet-800',
        textGradientDark: 'dark:from-violet-400 dark:to-violet-600',
    },
    yellow: {
        gradient: 'from-yellow-500 via-yellow-600 to-yellow-700',
        shadow: 'shadow-yellow-500/30',
        shadowDark: 'dark:shadow-yellow-500/20',
        hoverShadow: 'group-hover:shadow-yellow-500/50',
        hoverShadowDark: 'dark:group-hover:shadow-yellow-500/30',
        textGradient: 'from-yellow-600 to-yellow-800',
        textGradientDark: 'dark:from-yellow-400 dark:to-yellow-600',
    },
};

export default function ApplicationLogo({
    className,
    showText = false,
    size = 'md',
    ...props
}: ApplicationLogoProps) {
    const { appSettings } = usePage<PageProps>().props;
    const { resolvedTheme } = useTheme();

    // Listen for color theme preview changes from settings page
    const [previewTheme, setPreviewTheme] = useState<ColorTheme | null>(null);

    useEffect(() => {
        const handlePreview = (e: CustomEvent<ColorTheme | null>) => {
            setPreviewTheme(e.detail);
        };

        window.addEventListener('colorThemePreview', handlePreview as EventListener);
        return () => window.removeEventListener('colorThemePreview', handlePreview as EventListener);
    }, []);

    // Determine which logo to use based on theme
    const logoUrl = resolvedTheme === 'dark' && appSettings?.site_logo_dark
        ? `/storage/${appSettings.site_logo_dark}`
        : appSettings?.site_logo
            ? `/storage/${appSettings.site_logo}`
            : null;

    const containerSizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-11 h-11',
    };

    const imageSizeClasses = {
        sm: 'h-8 w-auto',
        md: 'h-10 w-auto',
        lg: 'h-14 w-auto',
    };

    const iconSizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-7 h-7',
    };

    const textSizeClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
    };

    const dotSizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
    };

    const siteName = appSettings?.site_name || 'App';
    const siteTagline = appSettings?.site_tagline || 'Build websites with AI';
    // Use preview theme if available (from settings page), otherwise use saved setting
    const colorTheme = previewTheme || appSettings?.color_theme || 'neutral';
    const colors = themeColors[colorTheme];

    // If logo exists, show image (uses dark logo when in dark mode if available)
    if (logoUrl) {
        return (
            <div className={`flex items-center ${className || ''}`} {...props}>
                <img
                    src={logoUrl}
                    alt={siteName}
                    className={`${imageSizeClasses[size]} object-contain`}
                />
            </div>
        );
    }

    // Fallback to styled icon logo (matching appy style)
    return (
        <div className={`flex items-center gap-3 ${className || ''}`} {...props}>
            <div className="relative group">
                <div className={`${containerSizeClasses[size]} bg-gradient-to-br ${colors.gradient} rounded-2xl flex items-center justify-center shadow-lg ${colors.shadow} ${colors.shadowDark} ${colors.hoverShadow} ${colors.hoverShadowDark} transition-all duration-300 group-hover:scale-105`}>
                    <Paintbrush className={`${iconSizeClasses[size]} text-white`} />
                </div>
                <div className={`absolute -top-0.5 -right-0.5 ${dotSizeClasses[size]} bg-green-500 rounded-full border-2 border-background`} />
            </div>
            {showText && (
                <div>
                    <span className={`font-bold bg-gradient-to-r ${colors.textGradient} ${colors.textGradientDark} bg-clip-text text-transparent ${textSizeClasses[size]}`}>
                        {siteName}
                    </span>
                    {siteTagline && (size === 'lg' || size === 'md') && (
                        <p className="text-[10px] font-medium text-muted-foreground">{siteTagline}</p>
                    )}
                </div>
            )}
        </div>
    );
}
