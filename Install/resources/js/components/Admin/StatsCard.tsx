import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface StatsCardProps {
    title: string;
    value: string | number;
    change?: {
        value: number;
        trend: 'up' | 'down' | 'neutral';
    };
    icon: LucideIcon;
}

export function StatsCard({ title, value, change, icon: Icon }: StatsCardProps) {
    const { t } = useTranslation();
    const trendConfig = {
        up: {
            color: 'text-success',
            bg: 'bg-success/10',
            icon: TrendingUp,
        },
        down: {
            color: 'text-destructive',
            bg: 'bg-destructive/10',
            icon: TrendingDown,
        },
        neutral: {
            color: 'text-muted-foreground',
            bg: 'bg-muted',
            icon: Minus,
        },
    };

    const trend = change ? trendConfig[change.trend] : null;
    const TrendIcon = trend?.icon;

    return (
        <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                        {title}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                    {change && trend && TrendIcon && (
                        <div className="flex items-center gap-1.5">
                            <span
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${trend.bg} ${trend.color}`}
                            >
                                <TrendIcon className="h-3 w-3" />
                                {change.value}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {t('vs last month')}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
