import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, Key, CreditCard } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { AiUsageStats } from '@/types/admin';

interface AiUsageCardProps {
    stats: AiUsageStats;
}

function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
}

export function AiUsageCard({ stats }: AiUsageCardProps) {
    const { t, locale } = useTranslation();

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-primary" />
                    {t('AI Usage (This Month)')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">{t('Total Tokens')}</p>
                        <p className="text-2xl font-semibold">
                            {formatTokens(stats.total_tokens)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{t('Estimated Cost')}</p>
                        <p className="text-2xl font-semibold">
                            ${stats.estimated_cost.toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{t('Requests')}</p>
                        <p className="text-xl font-semibold">
                            {stats.request_count.toLocaleString(locale)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{t('Unique Users')}</p>
                        <p className="text-xl font-semibold">{stats.unique_users}</p>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">{t('API Key Usage')}</p>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-info" />
                            <span>{t('Own API Keys')}</span>
                        </div>
                        <span className="font-medium">{t(':count users', { count: stats.own_key_users })}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-success" />
                            <span>{t('Platform Credits')}</span>
                        </div>
                        <span className="font-medium">
                            {t(':count users', { count: stats.platform_users })}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
