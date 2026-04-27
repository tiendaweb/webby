import { Key, Infinity as InfinityIcon, Coins } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { UserCredits } from '@/types/notifications';

/**
 * Compact credit display for dashboard headers.
 * Shows "Using your API key" for own API key users (takes priority).
 * Shows "Unlimited Credits" for unlimited plans.
 * Shows "remaining / total credits" for limited plans.
 */
export function GlobalCredits({
    remaining,
    monthlyLimit,
    isUnlimited,
    usingOwnKey,
}: UserCredits) {
    const { t } = useTranslation();

    // Using own API key takes priority
    if (usingOwnKey) {
        return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Key className="h-3 w-3" />
                {t('Using your API key')}
            </span>
        );
    }

    // Unlimited credits
    if (isUnlimited) {
        return (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <InfinityIcon className="h-3 w-3" />
                {t('Unlimited Credits')}
            </span>
        );
    }

    // Limited credits
    return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Coins className="h-3 w-3" />
            {remaining.toLocaleString()} / {monthlyLimit.toLocaleString()} {t('credits')}
        </span>
    );
}
