import { router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { TanStackDataTable } from '@/components/Admin/TanStackDataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { StatusBadge } from '@/components/Admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction, PaginatedResponse, PaymentMethod, TransactionType } from '@/types/billing';
import { useTranslation } from '@/contexts/LanguageContext';

interface BillingHistoryTableProps {
    transactions: PaginatedResponse<Transaction>;
}

const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(amount);
};

export default function BillingHistoryTable({ transactions }: BillingHistoryTableProps) {
    const { t, locale, isRtl } = useTranslation();

    const typeLabels: Record<TransactionType, string> = {
        subscription_new: t('New Subscription'),
        subscription_renewal: t('Renewal'),
        refund: t('Refund'),
        adjustment: t('Adjustment'),
        extension: t('Extension'),
    };

    const paymentLabels: Record<PaymentMethod, string> = {
        paypal: 'PayPal',
        bank_transfer: t('Bank Transfer'),
        manual: t('Manual'),
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('billing.index'),
            { page: page + 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const columns: ColumnDef<Transaction>[] = [
        {
            accessorKey: 'invoice_number',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Invoice')} />
            ),
            cell: ({ row }) => {
                // Generate invoice number format: #INV-YYYY-#####
                const year = new Date(row.original.created_at).getFullYear();
                const paddedId = String(row.original.id).padStart(5, '0');
                return (
                    <span className="font-mono text-sm font-medium">
                        #INV-{year}-{paddedId}
                    </span>
                );
            },
        },
        {
            accessorKey: 'transaction_date',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Date')} />
            ),
            cell: ({ row }) => {
                const date = new Date(row.original.transaction_date);
                return format(date, 'MMM d, yyyy');
            },
        },
        {
            accessorKey: 'description',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Description')} />
            ),
            cell: ({ row }) => {
                const transaction = row.original;
                const planName = transaction.subscription?.plan?.name;
                return (
                    <div>
                        <p className="font-medium">
                            {planName ? t(':name Plan', { name: planName }) : typeLabels[transaction.type]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {typeLabels[transaction.type]}
                        </p>
                    </div>
                );
            },
        },
        {
            accessorKey: 'amount',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Amount')} />
            ),
            cell: ({ row }) => {
                const amount = row.original.amount;
                const isNegative = amount < 0 || row.original.type === 'refund';
                return (
                    <span className={`font-medium ${isNegative ? 'text-destructive' : ''}`}>
                        {isNegative && amount > 0 ? '-' : ''}
                        {formatCurrency(Math.abs(amount), row.original.currency, isRtl ? 'ar-SA' : locale)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'payment_method',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Method')} />
            ),
            cell: ({ row }) => {
                const method = row.original.payment_method;
                return (
                    <Badge variant="secondary">
                        {paymentLabels[method] || method}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Status')} />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'actions',
            header: t('Invoice'),
            cell: ({ row }) => {
                const transaction = row.original;
                // Only show invoice for completed transactions
                if (transaction.status !== 'completed') {
                    return <span className="text-muted-foreground text-sm">-</span>;
                }
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8"
                    >
                        <a
                            href={route('billing.invoice', transaction.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FileText className="me-1.5 h-4 w-4" />
                            {t('View')}
                            <ExternalLink className="ms-1 h-3 w-3" />
                        </a>
                    </Button>
                );
            },
        },
    ];

    if (transactions.data.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">{t('No billing history')}</h3>
                <p className="text-muted-foreground">
                    {t('Your transactions will appear here once you make a purchase.')}
                </p>
            </div>
        );
    }

    return (
        <TanStackDataTable
            columns={columns}
            data={transactions.data}
            showSearch={false}
            serverPagination={{
                pageCount: transactions.last_page,
                pageIndex: transactions.current_page - 1,
                pageSize: transactions.per_page,
                total: transactions.total,
                onPageChange: handlePageChange,
            }}
        />
    );
}
