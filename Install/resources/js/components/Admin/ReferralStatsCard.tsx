import { Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { ReferralStats } from '@/types/admin';

interface ReferralStatsCardProps {
    stats: ReferralStats;
}

export function ReferralStatsCard({ stats }: ReferralStatsCardProps) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {t('Referrals')}
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/admin/referrals" className="flex items-center gap-1">
                            {t('View All')}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">{t('Total')}</p>
                        <p className="text-2xl font-semibold">{stats.total}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{t('Converted')}</p>
                        <p className="text-2xl font-semibold text-success">
                            {stats.converted}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{t('Credited')}</p>
                        <p className="text-xl font-semibold">{stats.credited}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{t('Commission Paid')}</p>
                        <p className="text-xl font-semibold">
                            ${stats.commission_paid.toFixed(2)}
                        </p>
                    </div>
                </div>

                {stats.pending_earnings > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                {t('Pending Earnings')}
                            </span>
                            <span className="font-semibold text-warning">
                                ${stats.pending_earnings.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
