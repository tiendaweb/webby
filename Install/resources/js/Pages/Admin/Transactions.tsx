import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { TanStackDataTable } from '@/components/Admin/TanStackDataTable';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { TableSkeleton, type TableColumnConfig } from '@/components/Admin/skeletons';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { StatusBadge } from '@/components/Admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/LanguageContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TableActionMenu,
    TableActionMenuTrigger,
    TableActionMenuContent,
    TableActionMenuItem,
    TableActionMenuSeparator,
} from '@/components/ui/table-action-menu';
import {
    Eye,
    CheckCircle,
    XCircle,
    RefreshCcw,
    Search,
} from 'lucide-react';
import type { AdminTransactionsPageProps } from '@/types/admin';
import type { Transaction, PaymentMethod, TransactionType } from '@/types/billing';

// Skeleton column configuration for Transactions table
const skeletonColumns: TableColumnConfig[] = [
    { type: 'text', width: 'w-24' },          // ID
    { type: 'avatar-text', width: 'w-40' },   // User
    { type: 'amount', width: 'w-20' },        // Amount
    { type: 'badge', width: 'w-24' },         // Type
    { type: 'badge', width: 'w-20' },         // Status
    { type: 'badge', width: 'w-24' },         // Method
    { type: 'date', width: 'w-24' },          // Date
    { type: 'actions', width: 'w-12' },       // Actions
];

export default function Transactions({
    auth,
    transactions,
    filters,
}: AdminTransactionsPageProps) {
    const { t, locale } = useTranslation();
    const { isLoading } = useAdminLoading();
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [searchValue, setSearchValue] = useState(filters.search || '');

    // Helper to format currency
    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
        }).format(amount);
    };

    // Approve form state
    const [approveForm, setApproveForm] = useState({
        notes: '',
    });

    // Reject form state
    const [rejectForm, setRejectForm] = useState({
        reason: '',
    });

    // Refund form state
    const [refundForm, setRefundForm] = useState({
        amount: 0,
        reason: '',
    });

    const handleSearch = (value: string) => {
        setSearchValue(value);
        router.get(
            route('admin.transactions'),
            { ...filters, search: value, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('admin.transactions'),
            { ...filters, page: page + 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageSizeChange = (size: number) => {
        router.get(
            route('admin.transactions'),
            { ...filters, per_page: size, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleFilterChange = (key: string, value: string | undefined) => {
        router.get(
            route('admin.transactions'),
            { ...filters, [key]: value || undefined, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleApprove = () => {
        if (!selectedTransaction) return;
        router.post(
            route('admin.transactions.approve', selectedTransaction.id),
            approveForm,
            {
                onSuccess: () => {
                    setIsApproveDialogOpen(false);
                    setSelectedTransaction(null);
                    setApproveForm({ notes: '' });
                },
            }
        );
    };

    const handleReject = () => {
        if (!selectedTransaction) return;
        router.post(
            route('admin.transactions.reject', selectedTransaction.id),
            rejectForm,
            {
                onSuccess: () => {
                    setIsRejectDialogOpen(false);
                    setSelectedTransaction(null);
                    setRejectForm({ reason: '' });
                },
            }
        );
    };

    const handleRefund = () => {
        if (!selectedTransaction) return;
        router.post(
            route('admin.transactions.refund', selectedTransaction.id),
            refundForm,
            {
                onSuccess: () => {
                    setIsRefundDialogOpen(false);
                    setSelectedTransaction(null);
                    setRefundForm({ amount: 0, reason: '' });
                },
            }
        );
    };

    const typeLabels: Record<TransactionType, string> = {
        subscription_new: t('New Subscription'),
        subscription_renewal: t('Renewal'),
        refund: t('Refund'),
        adjustment: t('Adjustment'),
        extension: t('Extension'),
    };

    const paymentLabels: Record<PaymentMethod, string> = {
        paypal: t('PayPal'),
        bank_transfer: t('Bank Transfer'),
        manual: t('Manual'),
    };

    const columns: ColumnDef<Transaction>[] = [
        {
            accessorKey: 'transaction_id',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('ID')} />
            ),
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.transaction_id}</span>
            ),
        },
        {
            accessorKey: 'user',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('User')} />
            ),
            cell: ({ row }) => {
                const user = row.original.user;
                return user ? (
                    <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                ) : (
                    <span className="text-muted-foreground">-</span>
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
                const isNegative = amount < 0;
                return (
                    <span
                        className={`font-medium ${isNegative ? 'text-destructive' : 'text-success'}`}
                    >
                        {formatCurrency(amount, row.original.currency)}
                    </span>
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
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Status')} />
            ),
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
            accessorKey: 'transaction_date',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Date')} />
            ),
            cell: ({ row }) => {
                const date = new Date(row.original.transaction_date);
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
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const transaction = row.original;
                return (
                    <TableActionMenu>
                        <TableActionMenuTrigger />
                        <TableActionMenuContent>
                            <TableActionMenuItem
                                onClick={() =>
                                    router.visit(
                                        route('admin.transactions.show', transaction.id)
                                    )
                                }
                            >
                                <Eye className="me-2 h-4 w-4" />
                                {t('View Details')}
                            </TableActionMenuItem>
                            {transaction.status === 'pending' && (
                                <>
                                    <TableActionMenuItem
                                        onClick={() => {
                                            setSelectedTransaction(transaction);
                                            setIsApproveDialogOpen(true);
                                        }}
                                    >
                                        <CheckCircle className="me-2 h-4 w-4" />
                                        {t('Approve')}
                                    </TableActionMenuItem>
                                    <TableActionMenuItem
                                        variant="destructive"
                                        onClick={() => {
                                            setSelectedTransaction(transaction);
                                            setIsRejectDialogOpen(true);
                                        }}
                                    >
                                        <XCircle className="me-2 h-4 w-4" />
                                        {t('Reject')}
                                    </TableActionMenuItem>
                                </>
                            )}
                            {transaction.status === 'completed' &&
                                transaction.type !== 'refund' && (
                                    <>
                                        <TableActionMenuSeparator />
                                        <TableActionMenuItem
                                            onClick={() => {
                                                setSelectedTransaction(transaction);
                                                setRefundForm({
                                                    amount: transaction.amount,
                                                    reason: '',
                                                });
                                                setIsRefundDialogOpen(true);
                                            }}
                                        >
                                            <RefreshCcw className="me-2 h-4 w-4" />
                                            {t('Refund')}
                                        </TableActionMenuItem>
                                    </>
                                )}
                        </TableActionMenuContent>
                    </TableActionMenu>
                );
            },
        },
    ];

    return (
        <AdminLayout user={auth.user!} title={t('Transactions')}>
            <AdminPageHeader
                title={t('Transactions')}
                subtitle={t('View and manage all payment transactions')}
            />

            {isLoading ? (
                <TableSkeleton
                    columns={skeletonColumns}
                    rows={10}
                    showSearch
                    filterCount={3}
                />
            ) : (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative max-w-sm">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('Search by transaction ID, user...')}
                                value={searchValue}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="ps-9 w-[300px]"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('status', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[130px] h-8">
                                    <SelectValue placeholder={t('Status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Status')}</SelectItem>
                                    <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                    <SelectItem value="failed">{t('Failed')}</SelectItem>
                                    <SelectItem value="refunded">{t('Refunded')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="date"
                                    value={filters.date_from || ''}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                    className="w-[140px] h-8"
                                />
                                <span className="text-muted-foreground text-sm">{t('to')}</span>
                                <Input
                                    type="date"
                                    value={filters.date_to || ''}
                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                    className="w-[140px] h-8"
                                />
                            </div>
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

            {/* Approve Dialog */}
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Approve Transaction')}</DialogTitle>
                        <DialogDescription>
                            {t('Approve this bank transfer payment. This will activate the associated subscription.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {selectedTransaction && (
                            <div className="bg-muted p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">{t('Amount:')}</span>
                                    <span className="font-medium">
                                        {formatCurrency(
                                            selectedTransaction.amount,
                                            selectedTransaction.currency
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">{t('User:')}</span>
                                    <span>{selectedTransaction.user?.name}</span>
                                    <span className="text-muted-foreground">{t('Method:')}</span>
                                    <span>
                                        {paymentLabels[selectedTransaction.payment_method]}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="approve_notes">{t('Notes (optional)')}</Label>
                            <Textarea
                                id="approve_notes"
                                value={approveForm.notes}
                                onChange={(e) =>
                                    setApproveForm({ ...approveForm, notes: e.target.value })
                                }
                                placeholder={t('Add any notes about the approval')}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleApprove}>{t('Approve Payment')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Reject Transaction')}</DialogTitle>
                        <DialogDescription>
                            {t('Reject this payment. The associated subscription will be cancelled.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reject_reason">{t('Reason')}</Label>
                            <Textarea
                                id="reject_reason"
                                value={rejectForm.reason}
                                onChange={(e) =>
                                    setRejectForm({ ...rejectForm, reason: e.target.value })
                                }
                                placeholder={t('Reason for rejection (required)')}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectForm.reason.trim()}
                        >
                            {t('Reject Payment')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Refund Dialog */}
            <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Process Refund')}</DialogTitle>
                        <DialogDescription>
                            {t('Process a refund for this transaction.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {selectedTransaction && (
                            <div className="bg-muted p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">{t('Original Amount:')}</span>
                                    <span className="font-medium">
                                        {formatCurrency(
                                            selectedTransaction.amount,
                                            selectedTransaction.currency
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">{t('User:')}</span>
                                    <span>{selectedTransaction.user?.name}</span>
                                </div>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="refund_amount">{t('Refund Amount')}</Label>
                            <Input
                                id="refund_amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={selectedTransaction?.amount || 0}
                                placeholder="0.00"
                                value={refundForm.amount}
                                onChange={(e) =>
                                    setRefundForm({
                                        ...refundForm,
                                        amount: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('Max:')} {formatCurrency(selectedTransaction?.amount || 0)}
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="refund_reason">{t('Reason')}</Label>
                            <Textarea
                                id="refund_reason"
                                value={refundForm.reason}
                                onChange={(e) =>
                                    setRefundForm({ ...refundForm, reason: e.target.value })
                                }
                                placeholder={t('Reason for refund (required)')}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button
                            onClick={handleRefund}
                            disabled={!refundForm.reason.trim() || refundForm.amount <= 0}
                        >
                            {t('Process Refund')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
