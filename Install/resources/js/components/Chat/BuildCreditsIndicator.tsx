import { Coins, Key, Infinity as InfinityIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface BuildCreditsIndicatorProps {
    remaining: number;
    monthlyLimit: number;
    isUnlimited: boolean;
    usingOwnKey: boolean;
    isRefreshing?: boolean;
}

export function BuildCreditsIndicator({
    remaining,
    monthlyLimit,
    isUnlimited,
    usingOwnKey,
    isRefreshing = false,
}: BuildCreditsIndicatorProps) {
    const { t } = useTranslation();

    const formatCredits = (value: number): string => {
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
        return value.toLocaleString();
    };

    // Calculate percentage for warning colors
    const percentage = monthlyLimit > 0 ? (remaining / monthlyLimit) * 100 : 100;
    const isLow = percentage <= 20 && percentage > 5;
    const isCritical = percentage <= 5;

    // Using own API key - no credits shown (takes priority)
    if (usingOwnKey) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Key className="h-3 w-3" />
                <span>{t('Using your API key')}</span>
            </div>
        );
    }

    // Unlimited credits
    if (isUnlimited) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <InfinityIcon className="h-3 w-3" />
                <span>{t('Unlimited credits')}</span>
            </div>
        );
    }

    // Limited credits with count
    return (
        <div
            className={cn(
                'flex items-center gap-1.5 text-xs',
                isCritical
                    ? 'text-destructive'
                    : isLow
                      ? 'text-warning'
                      : 'text-muted-foreground'
            )}
        >
            {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
                <Coins className="h-3 w-3" />
            )}
            <span>
                {formatCredits(remaining)} / {formatCredits(monthlyLimit)} {t('credits')}
            </span>
        </div>
    );
}
