import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import { usePageLoading } from '@/hooks/usePageLoading';
import { ReferralSkeleton } from './ReferralSkeleton';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/Layouts/AdminLayout';
import { PageProps } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TanStackDataTable } from '@/components/Admin/TanStackDataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Copy, Check, AlertCircle, ArrowLeft, Gift, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface ReferralStats {
    has_code: boolean;
    code: string | null;
    share_url: string | null;
    credit_balance: number;
    pending_earnings: number;
}

interface Transaction {
    id: number;
    amount: number;
    balance_after: number;
    type_label: string;
    created_at: string;
}

const getColumns = (t: (key: string) => string): ColumnDef<Transaction>[] => [
    {
        accessorKey: 'type_label',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Type')} />
        ),
        cell: ({ row }) => (
            <span className="font-medium">{row.original.type_label}</span>
        ),
    },
    {
        accessorKey: 'created_at',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Date')} />
        ),
        cell: ({ row }) => (
            <span className="text-muted-foreground">{row.original.created_at}</span>
        ),
    },
    {
        accessorKey: 'amount',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Amount')} className="text-end" />
        ),
        cell: ({ row }) => {
            const amount = row.original.amount;
            return (
                <span className={`text-end font-medium block ${amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {amount >= 0 ? '+' : ''}${amount.toFixed(2)}
                </span>
            );
        },
    },
    {
        accessorKey: 'balance_after',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Balance')} className="text-end" />
        ),
        cell: ({ row }) => (
            <span className="text-end text-muted-foreground block">
                ${row.original.balance_after.toFixed(2)}
            </span>
        ),
    },
];

interface PaginatedTransactions {
    data: Transaction[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props extends PageProps {
    stats: ReferralStats;
    transactions: PaginatedTransactions;
    referralEnabled: boolean;
}

export default function ReferralIndex({
    auth,
    stats,
    transactions,
    referralEnabled = false,
}: Props) {
    const { t } = useTranslation();
    const { isLoading } = usePageLoading();
    const [copied, setCopied] = useState(false);
    const columns = getColumns(t);

    // Safety check if stats not loaded
    if (!stats) {
        return (
            <AdminLayout user={auth.user!} title={t('Referral')}>
                <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">{t('Loading...')}</p>
                </div>
            </AdminLayout>
        );
    }

    const copyToClipboard = async () => {
        if (!stats.share_url) return;
        try {
            // Try modern Clipboard API first
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(stats.share_url);
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = stats.share_url;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            toast.success(t('Link copied to clipboard!'));
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('Failed to copy link'));
        }
    };

    const handleGenerateCode = () => {
        router.post(route('referral.generate-code'), {}, { preserveScroll: true });
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('billing.referral'),
            { page: page + 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    if (!referralEnabled) {
        return (
            <AdminLayout user={auth.user!} title={t('Referral')}>
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="prose prose-sm dark:prose-invert">
                            <h1 className="text-2xl font-bold text-foreground">{t('Referral')}</h1>
                            <p className="text-muted-foreground">{t('Share your link and earn credits')}</p>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/billing">
                                <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                                {t('Back')}
                            </Link>
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                <h3 className="mt-4 text-lg font-semibold">{t('Referral Program Unavailable')}</h3>
                                <p className="text-muted-foreground">
                                    {t('The referral program is currently not available.')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={t('Referral')}>
            {isLoading ? (
                <ReferralSkeleton />
            ) : (
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="prose prose-sm dark:prose-invert">
                        <h1 className="text-2xl font-bold text-foreground">{t('Referral')}</h1>
                        <p className="text-muted-foreground">{t('Share your link and earn credits')}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/billing">
                            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                            {t('Back')}
                        </Link>
                    </Button>
                </div>

                {/* Credit Balance Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Credit Balance')}</CardTitle>
                        <CardDescription>{t('Your available referral credits')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Wallet className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold">${stats.credit_balance.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">{t('Available to use')}</p>
                                </div>
                            </div>
                            {stats.credit_balance > 0 && (
                                <Button asChild>
                                    <Link href="/billing/plans">{t('Use Credits on a Plan')}</Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Referral Link Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Your Referral Link')}</CardTitle>
                        <CardDescription>{t('Share this link to earn credits when friends subscribe')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.has_code ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={stats.share_url || ''}
                                    readOnly
                                    className="font-mono text-sm"
                                />
                                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Gift className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                <h3 className="mt-4 text-lg font-semibold">{t('No referral link yet')}</h3>
                                <p className="text-muted-foreground mb-4">
                                    {t('Generate your referral link to start earning credits.')}
                                </p>
                                <Button onClick={handleGenerateCode}>
                                    {t('Generate Referral Link')}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Credit History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Credit History')}</CardTitle>
                        <CardDescription>{t('Your referral credit transactions')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {transactions?.data?.length > 0 ? (
                            <TanStackDataTable
                                columns={columns}
                                data={transactions.data}
                                showSearch={false}
                                showPagination={true}
                                serverPagination={{
                                    pageCount: transactions.last_page,
                                    pageIndex: transactions.current_page - 1,
                                    pageSize: transactions.per_page,
                                    total: transactions.total,
                                    onPageChange: handlePageChange,
                                }}
                            />
                        ) : (
                            <div className="text-center py-12">
                                <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                <h3 className="mt-4 text-lg font-semibold">{t('No transactions yet')}</h3>
                                <p className="text-muted-foreground">
                                    {t('Your credit transactions will appear here.')}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            )}
        </AdminLayout>
    );
}
