import { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { usePageLoading } from '@/hooks/usePageLoading';
import { UsageSkeleton } from './UsageSkeleton';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/Layouts/AdminLayout';
import { PageProps } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TanStackDataTable } from '@/components/Admin/TanStackDataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Coins,
    Sparkles,
    Key,
    ArrowLeft,
    Infinity as InfinityIcon,
    Bot,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface UsageRecord {
    id: number;
    project_id: number | null;
    project_name: string | null;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
    action: string;
    used_own_api_key: boolean;
    created_at: string;
}

interface PaginatedHistory {
    data: UsageRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface UsageStats {
    credits_remaining: number;
    credits_used: number;
    monthly_limit: number;
    is_unlimited: boolean;
    reset_date: string;
    percentage_used: number;
}

interface Plan {
    name: string;
    monthly_build_credits: number;
    is_unlimited: boolean;
    allows_own_api_key: boolean;
}

interface UsageProps extends PageProps {
    stats: UsageStats;
    plan: Plan | null;
    history: PaginatedHistory;
    period: string;
    used_own_api_key: boolean | null;
}

const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(2)}M`;
    }
    if (tokens >= 1_000) {
        return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toLocaleString();
};

const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
};

const formatDate = (dateString: string, locale: string = 'en-US') => {
    return new Date(dateString).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function Usage({ stats, plan, history, period, used_own_api_key }: UsageProps) {
    const { auth } = usePage<PageProps>().props;
    const { t, locale, isRtl } = useTranslation();
    const { isLoading } = usePageLoading();
    const [activeTab, setActiveTab] = useState(
        used_own_api_key === true ? 'own-key' : 'plan'
    );

    const dateLocale = isRtl ? 'ar-SA' : locale;

    const formatCredits = (credits: number) => {
        if (credits >= 1_000_000) {
            return `${(credits / 1_000_000).toFixed(1)}M`;
        }
        if (credits >= 1_000) {
            return `${(credits / 1_000).toFixed(0)}K`;
        }
        return credits.toLocaleString();
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('billing.usage'),
            { page: page + 1, period, used_own_api_key },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        const newUsedOwnApiKey = tab === 'own-key' ? true : false;
        router.get(
            route('billing.usage'),
            {
                period,
                used_own_api_key: newUsedOwnApiKey
            },
            { preserveState: false, preserveScroll: true }
        );
    };

    // Plan usage columns (simplified - only credits used)
    const planUsageColumns: ColumnDef<UsageRecord>[] = [
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Date')} />
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {formatDate(row.original.created_at, dateLocale)}
                </span>
            ),
        },
        {
            accessorKey: 'project_name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Project')} />
            ),
            cell: ({ row }) => {
                const record = row.original;
                return record.project_name ? (
                    <Link
                        href={`/project/${record.project_id}`}
                        className="hover:underline"
                    >
                        {record.project_name}
                    </Link>
                ) : (
                    <span className="text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: 'total_tokens',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Credits Used')} className="text-end" />
            ),
            cell: ({ row }) => (
                <span className="text-end font-mono text-sm font-medium block">
                    {formatTokens(row.original.total_tokens)}
                </span>
            ),
        },
    ];

    // Own API key usage columns (full details)
    const ownKeyUsageColumns: ColumnDef<UsageRecord>[] = [
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Date')} />
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {formatDate(row.original.created_at, dateLocale)}
                </span>
            ),
        },
        {
            accessorKey: 'project_name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Project')} />
            ),
            cell: ({ row }) => {
                const record = row.original;
                return record.project_name ? (
                    <Link
                        href={`/project/${record.project_id}`}
                        className="hover:underline"
                    >
                        {record.project_name}
                    </Link>
                ) : (
                    <span className="text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: 'model',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Model')} />
            ),
            cell: ({ row }) => (
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {row.original.model}
                </code>
            ),
        },
        {
            accessorKey: 'prompt_tokens',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Input')} className="text-end" />
            ),
            cell: ({ row }) => (
                <span className="text-end font-mono text-sm block">
                    {formatTokens(row.original.prompt_tokens)}
                </span>
            ),
        },
        {
            accessorKey: 'completion_tokens',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Output')} className="text-end" />
            ),
            cell: ({ row }) => (
                <span className="text-end font-mono text-sm block">
                    {formatTokens(row.original.completion_tokens)}
                </span>
            ),
        },
        {
            accessorKey: 'total_tokens',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Total')} className="text-end" />
            ),
            cell: ({ row }) => (
                <span className="text-end font-mono text-sm font-medium block">
                    {formatTokens(row.original.total_tokens)}
                </span>
            ),
        },
        {
            accessorKey: 'estimated_cost',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Est. Cost')} className="text-end" />
            ),
            cell: ({ row }) => (
                <span className="text-end font-mono text-sm text-muted-foreground block">
                    {formatCost(row.original.estimated_cost)}
                </span>
            ),
        },
    ];

    return (
        <AdminLayout user={auth.user!} title={t('Usage')}>
            {isLoading ? (
                <UsageSkeleton />
            ) : (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="prose prose-sm dark:prose-invert">
                        <h1 className="text-2xl font-bold text-foreground">
                            {t('Usage')}
                        </h1>
                        <p className="text-muted-foreground">{t('Monitor your AI usage and credit balance')}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/billing">
                            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                            {t('Back')}
                        </Link>
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Credits Overview */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Coins className="h-4 w-4" />
                                    {t('Credit Balance')}
                                </span>
                                {stats.is_unlimited && (
                                    <Badge variant="secondary" className="gap-1">
                                        <InfinityIcon className="h-3 w-3" />
                                        {t('Unlimited')}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stats.is_unlimited ? (
                                <div className="text-center py-4">
                                    <div className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                                        <InfinityIcon className="h-8 w-8" />
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {t('You have unlimited build credits')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{t('Remaining')}</span>
                                            <span className="font-medium">
                                                {formatCredits(stats.credits_remaining)} / {formatCredits(stats.monthly_limit)}
                                            </span>
                                        </div>
                                        <Progress value={100 - stats.percentage_used} className="h-2" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">{t('Used this month')}</p>
                                            <p className="font-medium">{formatCredits(stats.credits_used)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">{t('Resets on')}</p>
                                            <p className="font-medium">{stats.reset_date}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Current Plan */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                {t('Current Plan')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {plan ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold">{plan.name}</span>
                                        {plan.is_unlimited && (
                                            <Badge variant="default">{t('Unlimited')}</Badge>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {plan.is_unlimited
                                                    ? t('Unlimited build credits')
                                                    : t(':count credits/month', { count: plan.monthly_build_credits.toLocaleString() })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Key className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {plan.allows_own_api_key
                                                    ? t('Can use your own API keys')
                                                    : t('System AI provider only')}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-muted-foreground">
                                        {t('No active subscription')}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Usage History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Usage History')}</CardTitle>
                        <CardDescription>{t('Your recent AI credit usage')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Period Filter */}
                        <div className="flex gap-2 mb-4">
                            <Button
                                variant={period === 'current_month' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => router.get(route('billing.usage'), {
                                    period: 'current_month',
                                    used_own_api_key
                                })}
                            >
                                {t('Current Month')}
                            </Button>
                            <Button
                                variant={period === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => router.get(route('billing.usage'), {
                                    period: 'all',
                                    used_own_api_key
                                })}
                            >
                                {t('All Time')}
                            </Button>
                        </div>

                        {/* Tabs for API Key Source */}
                        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="plan">
                                    <Coins className="h-4 w-4 me-2" />
                                    {t('Plan Usage')}
                                </TabsTrigger>
                                <TabsTrigger value="own-key">
                                    <Key className="h-4 w-4 me-2" />
                                    {t('Your API Key Usage')}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="plan" className="space-y-4">
                                {history.data.length > 0 ? (
                                    <TanStackDataTable
                                        columns={planUsageColumns}
                                        data={history.data}
                                        showSearch={false}
                                        serverPagination={{
                                            pageCount: history.last_page,
                                            pageIndex: history.current_page - 1,
                                            pageSize: history.per_page,
                                            total: history.total,
                                            onPageChange: handlePageChange,
                                        }}
                                    />
                                ) : (
                                    <div className="text-center py-12">
                                        <Bot className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                        <h3 className="mt-4 text-lg font-semibold">{t('No plan usage')}</h3>
                                        <p className="text-muted-foreground">
                                            {t("Usage from your plan's AI credits will appear here.")}
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="own-key" className="space-y-4">
                                {history.data.length > 0 ? (
                                    <TanStackDataTable
                                        columns={ownKeyUsageColumns}
                                        data={history.data}
                                        showSearch={false}
                                        serverPagination={{
                                            pageCount: history.last_page,
                                            pageIndex: history.current_page - 1,
                                            pageSize: history.per_page,
                                            total: history.total,
                                            onPageChange: handlePageChange,
                                        }}
                                    />
                                ) : (
                                    <div className="text-center py-12">
                                        <Bot className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                        <h3 className="mt-4 text-lg font-semibold">{t('No API key usage')}</h3>
                                        <p className="text-muted-foreground">
                                            {t('Usage from your own API keys will appear here.')}
                                        </p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            )}
        </AdminLayout>
    );
}
