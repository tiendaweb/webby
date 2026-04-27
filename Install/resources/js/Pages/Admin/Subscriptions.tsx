import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from '@/contexts/LanguageContext';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { TanStackDataTable } from '@/components/Admin/TanStackDataTable';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { TableSkeleton, type TableColumnConfig } from '@/components/Admin/skeletons';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { StatusBadge } from '@/components/Admin/StatusBadge';
import { UserSelect } from '@/components/Admin/UserSelect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    XCircle,
    Plus,
    CheckCircle,
    CalendarPlus,
    Search,
} from 'lucide-react';
import { format } from 'date-fns';
import type { AdminSubscriptionsPageProps } from '@/types/admin';
import type { Subscription, PaymentMethod } from '@/types/billing';

// Skeleton column configuration for Subscriptions table
const skeletonColumns: TableColumnConfig[] = [
    { type: 'avatar-text', width: 'w-40' },   // User
    { type: 'badge', width: 'w-20' },         // Plan
    { type: 'badge', width: 'w-20' },         // Status
    { type: 'badge', width: 'w-24' },         // Payment
    { type: 'date', width: 'w-24' },          // Started
    { type: 'date', width: 'w-24' },          // Expires
    { type: 'actions', width: 'w-12' },       // Actions
];

export default function Subscriptions({
    auth,
    subscriptions,
    plans,
    filters,
}: AdminSubscriptionsPageProps) {
    const { t } = useTranslation();
    const { isLoading } = useAdminLoading();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [searchValue, setSearchValue] = useState(filters.search || '');

    // Create form state
    const [createForm, setCreateForm] = useState({
        user_id: '',
        plan_id: '',
        status: 'active' as 'active' | 'pending',
        admin_notes: '',
    });
    const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});

    // Cancel form state
    const [cancelForm, setCancelForm] = useState({
        reason: '',
        immediate: false,
    });

    // Extend form state
    const [extendForm, setExtendForm] = useState({
        days: 30,
        reason: '',
    });

    // Approve form state
    const [approveForm, setApproveForm] = useState({
        notes: '',
    });

    const handleSearch = (value: string) => {
        setSearchValue(value);
        router.get(
            route('admin.subscriptions'),
            { ...filters, search: value, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('admin.subscriptions'),
            { ...filters, page: page + 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageSizeChange = (size: number) => {
        router.get(
            route('admin.subscriptions'),
            { ...filters, per_page: size, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleFilterChange = (key: string, value: string | undefined) => {
        router.get(
            route('admin.subscriptions'),
            { ...filters, [key]: value || undefined, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const validateCreateForm = () => {
        const errors: Record<string, string> = {};
        if (!createForm.user_id) {
            errors.user_id = t('User is required');
        }
        if (!createForm.plan_id) {
            errors.plan_id = t('Plan is required');
        }
        setCreateFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = () => {
        if (!validateCreateForm()) {
            return;
        }
        router.post(route('admin.subscriptions.store'), createForm, {
            onSuccess: () => {
                setIsCreateDialogOpen(false);
                setCreateForm({
                    user_id: '',
                    plan_id: '',
                    status: 'active',
                    admin_notes: '',
                });
                setCreateFormErrors({});
            },
            onError: (errors) => {
                setCreateFormErrors(errors as Record<string, string>);
            },
        });
    };

    const handleCancel = () => {
        if (!selectedSubscription) return;
        router.post(
            route('admin.subscriptions.cancel', selectedSubscription.id),
            cancelForm,
            {
                onSuccess: () => {
                    setIsCancelDialogOpen(false);
                    setSelectedSubscription(null);
                    setCancelForm({ reason: '', immediate: false });
                },
            }
        );
    };

    const handleExtend = () => {
        if (!selectedSubscription) return;
        router.post(
            route('admin.subscriptions.extend', selectedSubscription.id),
            extendForm,
            {
                onSuccess: () => {
                    setIsExtendDialogOpen(false);
                    setSelectedSubscription(null);
                    setExtendForm({ days: 30, reason: '' });
                },
            }
        );
    };

    const handleApprove = () => {
        if (!selectedSubscription) return;
        router.post(
            route('admin.subscriptions.approve', selectedSubscription.id),
            approveForm,
            {
                onSuccess: () => {
                    setIsApproveDialogOpen(false);
                    setSelectedSubscription(null);
                    setApproveForm({ notes: '' });
                },
            }
        );
    };

    const columns: ColumnDef<Subscription>[] = [
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
            accessorKey: 'plan',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Plan')} />
            ),
            cell: ({ row }) => {
                const plan = row.original.plan;
                return plan ? (
                    <Badge variant="outline" className="font-medium">
                        {plan.name}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">-</span>
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
            accessorKey: 'payment_method',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Payment')} />
            ),
            cell: ({ row }) => {
                const method = row.original.payment_method;
                const labels: Record<PaymentMethod, string> = {
                    paypal: t('PayPal'),
                    bank_transfer: t('Bank Transfer'),
                    manual: t('Manual'),
                };
                return method ? (
                    <Badge variant="secondary">{labels[method] || method}</Badge>
                ) : (
                    <span className="text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: 'starts_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Started')} />
            ),
            cell: ({ row }) =>
                row.original.starts_at
                    ? format(new Date(row.original.starts_at), 'MMM d, yyyy')
                    : '-',
        },
        {
            accessorKey: 'renewal_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Expires')} />
            ),
            cell: ({ row }) =>
                row.original.renewal_at
                    ? format(new Date(row.original.renewal_at), 'MMM d, yyyy')
                    : '-',
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const subscription = row.original;
                return (
                    <TableActionMenu>
                        <TableActionMenuTrigger />
                        <TableActionMenuContent>
                            <TableActionMenuItem
                                onClick={() =>
                                    router.visit(
                                        route('admin.subscriptions.show', subscription.id)
                                    )
                                }
                            >
                                <Eye className="me-2 h-4 w-4" />
                                {t('View Details')}
                            </TableActionMenuItem>
                            {subscription.status === 'pending' && (
                                <TableActionMenuItem
                                    onClick={() => {
                                        setSelectedSubscription(subscription);
                                        setIsApproveDialogOpen(true);
                                    }}
                                >
                                    <CheckCircle className="me-2 h-4 w-4" />
                                    {t('Approve')}
                                </TableActionMenuItem>
                            )}
                            {subscription.status === 'active' && (
                                <>
                                    <TableActionMenuItem
                                        onClick={() => {
                                            setSelectedSubscription(subscription);
                                            setIsExtendDialogOpen(true);
                                        }}
                                    >
                                        <CalendarPlus className="me-2 h-4 w-4" />
                                        {t('Extend')}
                                    </TableActionMenuItem>
                                    <TableActionMenuSeparator />
                                    <TableActionMenuItem
                                        variant="destructive"
                                        onClick={() => {
                                            setSelectedSubscription(subscription);
                                            setIsCancelDialogOpen(true);
                                        }}
                                    >
                                        <XCircle className="me-2 h-4 w-4" />
                                        {t('Cancel')}
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
        <AdminLayout user={auth.user!} title={t('Subscriptions')}>
            <AdminPageHeader
                title={t('Subscriptions')}
                subtitle={t('Manage all user subscriptions')}
                action={
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="me-2 h-4 w-4" />
                        {t('Create Subscription')}
                    </Button>
                }
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
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative max-w-sm">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('Search by user name or email...')}
                                value={searchValue}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="ps-9 w-[300px]"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
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
                                    <SelectItem value="active">{t('Active')}</SelectItem>
                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                    <SelectItem value="expired">{t('Expired')}</SelectItem>
                                    <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.plan_id?.toString() || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('plan_id', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[130px] h-8">
                                    <SelectValue placeholder={t('Plan')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Plans')}</SelectItem>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id.toString()}>
                                            {plan.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.payment_method || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange('payment_method', value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger className="w-[140px] h-8">
                                    <SelectValue placeholder={t('Payment')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Methods')}</SelectItem>
                                    <SelectItem value="paypal">{t('PayPal')}</SelectItem>
                                    <SelectItem value="bank_transfer">{t('Bank Transfer')}</SelectItem>
                                    <SelectItem value="manual">{t('Manual')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <TanStackDataTable
                        columns={columns}
                        data={subscriptions.data}
                        showSearch={false}
                        serverPagination={{
                            pageCount: subscriptions.last_page,
                            pageIndex: subscriptions.current_page - 1,
                            pageSize: subscriptions.per_page,
                            total: subscriptions.total,
                            onPageChange: handlePageChange,
                            onPageSizeChange: handlePageSizeChange,
                        }}
                    />
                </div>
            )}

            {/* Create Subscription Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) setCreateFormErrors({});
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Create Subscription')}</DialogTitle>
                        <DialogDescription>
                            {t('Manually create a subscription for a user.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="user_id">{t('User')}</Label>
                            <UserSelect
                                value={createForm.user_id}
                                onChange={(value) =>
                                    setCreateForm({ ...createForm, user_id: value })
                                }
                                error={!!createFormErrors.user_id}
                            />
                            {createFormErrors.user_id && (
                                <p className="text-sm text-destructive">{createFormErrors.user_id}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="plan_id">{t('Plan')}</Label>
                            <Select
                                value={createForm.plan_id}
                                onValueChange={(value) =>
                                    setCreateForm({ ...createForm, plan_id: value })
                                }
                            >
                                <SelectTrigger className={createFormErrors.plan_id ? 'border-destructive' : ''}>
                                    <SelectValue placeholder={t('Select a plan')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id.toString()}>
                                            {plan.name} - ${plan.price}/{plan.billing_period}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {createFormErrors.plan_id && (
                                <p className="text-sm text-destructive">{createFormErrors.plan_id}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">{t('Status')}</Label>
                            <Select
                                value={createForm.status}
                                onValueChange={(value: 'active' | 'pending') =>
                                    setCreateForm({ ...createForm, status: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t('Active (starts immediately)')}</SelectItem>
                                    <SelectItem value="pending">{t('Pending (awaiting approval)')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin_notes">{t('Admin Notes')}</Label>
                            <Textarea
                                id="admin_notes"
                                value={createForm.admin_notes}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, admin_notes: e.target.value })
                                }
                                placeholder={t('Optional notes about this subscription')}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleCreate}>{t('Create')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Subscription Dialog */}
            <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Cancel Subscription')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to cancel this subscription?')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cancel_reason">{t('Reason (optional)')}</Label>
                            <Textarea
                                id="cancel_reason"
                                value={cancelForm.reason}
                                onChange={(e) =>
                                    setCancelForm({ ...cancelForm, reason: e.target.value })
                                }
                                placeholder={t('Reason for cancellation')}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="immediate"
                                checked={cancelForm.immediate}
                                onChange={(e) =>
                                    setCancelForm({ ...cancelForm, immediate: e.target.checked })
                                }
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="immediate">{t('Cancel immediately (ends access now)')}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                            {t('Keep Subscription')}
                        </Button>
                        <Button variant="destructive" onClick={handleCancel}>
                            {t('Cancel Subscription')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extend Subscription Dialog */}
            <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Extend Subscription')}</DialogTitle>
                        <DialogDescription>
                            {t('Extend the subscription period for this user.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="extend_days">{t('Days to extend')}</Label>
                            <Input
                                id="extend_days"
                                type="number"
                                min={1}
                                max={365}
                                placeholder="30"
                                value={extendForm.days}
                                onChange={(e) =>
                                    setExtendForm({
                                        ...extendForm,
                                        days: parseInt(e.target.value) || 0,
                                    })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="extend_reason">{t('Reason (optional)')}</Label>
                            <Textarea
                                id="extend_reason"
                                value={extendForm.reason}
                                onChange={(e) =>
                                    setExtendForm({ ...extendForm, reason: e.target.value })
                                }
                                placeholder={t('Reason for extension')}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleExtend}>{t('Extend')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Subscription Dialog */}
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Approve Subscription')}</DialogTitle>
                        <DialogDescription>
                            {t('Approve this pending subscription to activate it.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
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
                        <Button onClick={handleApprove}>{t('Approve')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
