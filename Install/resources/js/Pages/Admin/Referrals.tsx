import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { TanStackDataTable } from '@/components/Admin/TanStackDataTable';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { TableSkeleton, type TableColumnConfig } from '@/components/Admin/skeletons';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PageProps } from '@/types';

interface ReferralTransaction {
    id: number;
    user_id: number;
    user: {
        id: number;
        name: string;
        email: string;
    };
    amount: number;
    balance_after: number;
    type: string;
    type_label: string;
    description: string | null;
    created_at: string;
}

interface PaginatedTransactions {
    data: ReferralTransaction[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface ReferralsPageProps extends PageProps {
    transactions: PaginatedTransactions;
    filters: {
        type?: string;
        search?: string;
    };
    types: string[];
}

// Skeleton column configuration for Referrals table
const skeletonColumns: TableColumnConfig[] = [
    { type: 'text', width: 'w-16' },          // ID
    { type: 'avatar-text', width: 'w-40' },   // User
    { type: 'badge', width: 'w-28' },         // Type
    { type: 'amount', width: 'w-20' },        // Amount
    { type: 'text', width: 'w-20' },          // Balance After
    { type: 'text', width: 'w-40' },          // Description
    { type: 'date', width: 'w-24' },          // Date
];

export default function Referrals() {
    const { t, locale } = useTranslation();
    const { auth, transactions, filters, types } = usePage<ReferralsPageProps>().props;
    const { isLoading } = useAdminLoading();
    const [searchValue, setSearchValue] = useState(filters.search || '');

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const typeLabels: Record<string, string> = {
        signup_bonus: t('Signup Bonus'),
        purchase_commission: t('Purchase Commission'),
        billing_redemption: t('Billing Redemption'),
        admin_adjustment: t('Admin Adjustment'),
        refund_clawback: t('Refund Clawback'),
    };

    const handleSearch = (value: string) => {
        setSearchValue(value);
        router.get(
            route('admin.referrals'),
            { ...filters, search: value, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleFilterChange = (key: string, value: string | undefined) => {
        router.get(
            route('admin.referrals'),
            { ...filters, [key]: value || undefined, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('admin.referrals'),
            { ...filters, page: page + 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageSizeChange = (size: number) => {
        router.get(
            route('admin.referrals'),
            { ...filters, per_page: size, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const columns: ColumnDef<ReferralTransaction>[] = [
        {
            accessorKey: 'id',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('ID')} />
            ),
            cell: ({ row }) => (
                <span className="font-mono text-sm">#{row.original.id}</span>
            ),
        },
        {
            accessorKey: 'user',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('User')} />
            ),
            cell: ({ row }) => {
                const user = row.original.user;
                return (
                    <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                );
            },
        },
        {
            accessorKey: 'type',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Type')} />
            ),
            cell: ({ row }) => (
                <Badge variant="outline" className="capitalize">
                    {typeLabels[row.original.type] || row.original.type}
                </Badge>
            ),
        },
        {
            accessorKey: 'amount',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Amount')} />
            ),
            cell: ({ row }) => {
                const amount = row.original.amount;
                const isPositive = amount >= 0;
                return (
                    <span className={`font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(amount)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'balance_after',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Balance After')} />
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {formatCurrency(row.original.balance_after)}
                </span>
            ),
        },
        {
            accessorKey: 'description',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Description')} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                    {row.original.description || '-'}
                </span>
            ),
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Date')} />
            ),
            cell: ({ row }) => {
                const date = new Date(row.original.created_at);
                return (
                    <div>
                        <p>{date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-sm text-muted-foreground">
                            {date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}
                        </p>
                    </div>
                );
            },
        },
    ];

    return (
        <AdminLayout user={auth.user!} title={t('Referral Transactions')}>
            <AdminPageHeader
                title={t('Referral Transactions')}
                subtitle={t('View and manage all referral transactions')}
            />

            {isLoading ? (
                <TableSkeleton
                    columns={skeletonColumns}
                    rows={10}
                    showSearch
                    filterCount={1}
                />
            ) : (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative max-w-sm">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('Search by user name or email...')}
                                value={searchValue}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="ps-9 w-[300px]"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <Select
                                value={filters.type || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('type', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[180px] h-8">
                                    <SelectValue placeholder={t('Filter by Type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Types')}</SelectItem>
                                    {types.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {typeLabels[type] || type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
                            onPageSizeChange: handlePageSizeChange,
                        }}
                    />
                </div>
            )}
        </AdminLayout>
    );
}
