import { router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { StatsCard } from '@/components/Admin/StatsCard';
import { AiUsageCard } from '@/components/Admin/AiUsageCard';
import { ReferralStatsCard } from '@/components/Admin/ReferralStatsCard';
import { StorageStatsCard } from '@/components/Admin/StorageStatsCard';
import { FirebaseStatusCard } from '@/components/Admin/FirebaseStatusCard';
import { SubscriptionPieChart } from '@/components/Admin/Charts/SubscriptionPieChart';
import { TrendLineChart } from '@/components/Admin/Charts/TrendLineChart';
import { AiUsageTrendChart } from '@/components/Admin/Charts/AiUsageTrendChart';
import { AiProviderPieChart } from '@/components/Admin/Charts/AiProviderPieChart';
import { OverviewSkeleton } from '@/components/Admin/OverviewSkeleton';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Users,
    CreditCard,
    DollarSign,
    FolderOpen,
    TrendingUp,
    RefreshCw,
} from 'lucide-react';
import { User } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import type {
    OverviewStats,
    ChangeMetrics,
    SubscriptionDistributionItem,
    AiUsageStats,
    AiUsageByProvider,
    AiUsageTrendItem,
    ReferralStats,
    StorageStats,
    FirebaseStats,
    TrendData,
} from '@/types/admin';

interface Props {
    user: User;
    appVersion: string | null;
    stats: OverviewStats;
    changes: ChangeMetrics;
    subscriptionDistribution: SubscriptionDistributionItem[];
    aiUsage: AiUsageStats;
    aiUsageByProvider: AiUsageByProvider[];
    aiUsageTrend: AiUsageTrendItem[];
    referralStats: ReferralStats;
    storageStats: StorageStats;
    firebaseStats: FirebaseStats;
    trends: TrendData;
}

export default function Overview({
    user,
    appVersion,
    stats,
    changes,
    subscriptionDistribution,
    aiUsage,
    aiUsageByProvider,
    aiUsageTrend,
    referralStats,
    storageStats,
    firebaseStats,
    trends,
}: Props) {
    const { t } = useTranslation();
    const { isLoading, isRefreshing, startRefresh, endRefresh } = useAdminLoading();

    const handleRefresh = () => {
        startRefresh();
        router.post(
            '/admin/refresh-stats',
            {},
            {
                preserveScroll: true,
                onFinish: () => endRefresh(),
            }
        );
    };

    return (
        <AdminLayout user={user} title={t('Overview')}>
            <AdminPageHeader
                title={
                    <>
                        {t('Overview')}
                        {appVersion && (
                            <Badge variant="secondary" className="ml-2 align-middle text-[11px]">
                                v{appVersion}
                            </Badge>
                        )}
                    </>
                }
                subtitle={t('Dashboard overview and key metrics')}
                action={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                    >
                        <RefreshCw
                            className={`h-4 w-4 me-2 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                        {t('Refresh')}
                    </Button>
                }
            />

            {isLoading ? (
                <OverviewSkeleton />
            ) : (
                <>
                    {/* Core Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                        <StatsCard
                            title={t('Total Users')}
                            value={stats.total_users.toLocaleString()}
                            change={changes.users}
                            icon={Users}
                        />
                        <StatsCard
                            title={t('Active Subs')}
                            value={stats.active_subscriptions.toLocaleString()}
                            change={changes.subscriptions}
                            icon={CreditCard}
                        />
                        <StatsCard
                            title={t('MRR')}
                            value={`$${stats.mrr.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}`}
                            icon={TrendingUp}
                        />
                        <StatsCard
                            title={t('Revenue (MTD)')}
                            value={`$${stats.revenue_mtd.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}`}
                            change={changes.revenue}
                            icon={DollarSign}
                        />
                        <StatsCard
                            title={t('Total Projects')}
                            value={stats.total_projects.toLocaleString()}
                            change={changes.projects}
                            icon={FolderOpen}
                        />
                    </div>

                    {/* Trend Chart */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('30-Day Trends')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TrendLineChart data={trends} />
                        </CardContent>
                    </Card>

                    {/* Distribution Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {t('Subscriptions by Plan')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <SubscriptionPieChart data={subscriptionDistribution} />
                            </CardContent>
                        </Card>

                        <ReferralStatsCard stats={referralStats} />
                    </div>

                    {/* AI Usage Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <AiUsageCard stats={aiUsage} />

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('Usage by Provider')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AiProviderPieChart data={aiUsageByProvider} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('Token Usage Trend')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AiUsageTrendChart data={aiUsageTrend} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Storage & Firebase Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StorageStatsCard stats={storageStats} />
                        <FirebaseStatusCard stats={firebaseStats} />
                    </div>
                </>
            )}
        </AdminLayout>
    );
}
