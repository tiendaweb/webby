import { useEffect, useState } from 'react';

interface ChartColors {
    primary: string;
    border: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    tooltipBg: string;
    tooltipFg: string;
}

function getCSSColor(variable: string): string {
    if (typeof window === 'undefined') return '';
    const root = document.documentElement;
    // Get computed style - CSS variables in themes.css are already in hsl() format
    const value = getComputedStyle(root).getPropertyValue(variable).trim();
    return value || '';
}

export function useChartColors(): ChartColors {
    const [colors, setColors] = useState<ChartColors>({
        primary: '#10B981',
        border: '#e5e7eb',
        mutedForeground: '#6b7280',
        card: '#ffffff',
        cardForeground: '#111827',
        tooltipBg: '#ffffff',
        tooltipFg: '#111827',
    });

    useEffect(() => {
        const updateColors = () => {
            // Get theme colors directly from CSS variables (already in hsl() format)
            const popover = getCSSColor('--popover');
            const popoverFg = getCSSColor('--popover-foreground');
            const border = getCSSColor('--border');
            const mutedFg = getCSSColor('--muted-foreground');
            const card = getCSSColor('--card');
            const cardFg = getCSSColor('--card-foreground');
            const primary = getCSSColor('--primary');

            setColors({
                primary: primary || '#10B981',
                border: border || '#e5e7eb',
                mutedForeground: mutedFg || '#6b7280',
                card: card || '#ffffff',
                cardForeground: cardFg || '#111827',
                // Use popover colors from theme for tooltips
                tooltipBg: popover || '#ffffff',
                tooltipFg: popoverFg || '#111827',
            });
        };

        updateColors();

        // Listen for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
                    updateColors();
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style'],
        });

        return () => observer.disconnect();
    }, []);

    return colors;
}
