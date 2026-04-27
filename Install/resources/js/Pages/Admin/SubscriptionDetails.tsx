import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useTranslation } from '@/contexts/LanguageContext';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { DetailPageSkeleton } from '@/components/Admin/skeletons';
import { StatusBadge } from '@/components/Admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    CalendarPlus,
    User,
    CreditCard,
    Calendar,
    FileText,
} from 'lucide-react';
import type { PageProps } from '@/types';
import type { Subscription, PaymentMethod, TransactionType } from '@/types/billing';

interface SubscriptionDetailsPageProps extends PageProps {
    subscription: Subscription;
}

const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'en') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(amount);
};

export default function SubscriptionDetails({
    auth,
    subscription,
}: SubscriptionDetailsPageProps) {
    const { t, locale } = useTranslation();
    const { isLoading } = useAdminLoading();

    const paymentMethodLabels: Record<PaymentMethod, string> = {
        paypal: 'PayPal',
        bank_transfer: t('Bank Transfer'),
        manual: t('Manual'),
    };

    const transactionTypeLabels: Record<TransactionType, string> = {
        subscription_new: t('New'),
        subscription_renewal: t('Renewal'),
        refund: t('Refund'),
        adjustment: t('Adjustment'),
        extension: t('Extension'),
    };
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

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

    const handleCancel = () => {
        router.post(
            route('admin.subscriptions.cancel', subscription.id),
            cancelForm,
            {
                onSuccess: () => {
                    setIsCancelDialogOpen(false);
                    setCancelForm({ reason: '', immediate: false });
                },
            }
        );
    };

    const handleExtend = () => {
        router.post(
            route('admin.subscriptions.extend', subscription.id),
            extendForm,
            {
                onSuccess: () => {
                    setIsExtendDialogOpen(false);
                    setExtendForm({ days: 30, reason: '' });
                },
            }
        );
    };

    const handleApprove = () => {
        router.post(
            route('admin.subscriptions.approve', subscription.id),
            approveForm,
            {
                onSuccess: () => {
                    setIsApproveDialogOpen(false);
                    setApproveForm({ notes: '' });
                },
            }
        );
    };

    if (isLoading) {
        return (
            <AdminLayout user={auth.user!} title={t('Subscription Details')}>
                <DetailPageSkeleton variant="subscription" />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={`${t('Subscription')} #${subscription.id}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="prose prose-sm dark:prose-invert">
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('Subscription')} #{subscription.id}
                    </h1>
                    <p className="text-muted-foreground">
                        {subscription.user?.name} - {subscription.plan?.name}
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={route('admin.subscriptions')}>
                        <ArrowLeft className="h-4 w-4 me-2" />
                        {t('Back')}
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* User Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                {t('User Information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {subscription.user ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Name')}</p>
                                        <p className="font-medium">{subscription.user.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Email')}</p>
                                        <p className="font-medium">{subscription.user.email}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">{t('User not available')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Subscription Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                {t('Subscription Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Plan')}</p>
                                    <p className="font-medium">
                                        {subscription.plan?.name ?? t('Unknown Plan')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Status')}</p>
                                    <StatusBadge status={subscription.status} />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Amount')}</p>
                                    <p className="font-medium">
                                        {formatCurrency(subscription.amount, 'USD', locale)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Payment Method')}</p>
                                    <Badge variant="secondary">
                                        {subscription.payment_method
                                            ? paymentMethodLabels[subscription.payment_method]
                                            : t('Unknown')}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Started')}</p>
                                    <p className="font-medium">
                                        {subscription.starts_at
                                            ? new Date(subscription.starts_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
                                            : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Renewal Date')}</p>
                                    <p className="font-medium">
                                        {subscription.renewal_at
                                            ? new Date(subscription.renewal_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
                                            : '-'}
                                    </p>
                                </div>
                                {subscription.cancelled_at && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Cancelled At')}</p>
                                        <p className="font-medium text-destructive">
                                            {new Date(subscription.cancelled_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                )}
                                {subscription.ends_at && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Ends At')}</p>
                                        <p className="font-medium">
                                            {new Date(subscription.ends_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction History Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                {t('Transaction History')}
                            </CardTitle>
                            <CardDescription>
                                {t('All transactions related to this subscription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {subscription.transactions && subscription.transactions.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('ID')}</TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Amount')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Date')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subscription.transactions.map((transaction) => (
                                            <TableRow key={transaction.id}>
                                                <TableCell className="font-mono text-sm">
                                                    {transaction.transaction_id}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {transactionTypeLabels[transaction.type] ||
                                                            transaction.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell
                                                    className={
                                                        transaction.amount < 0
                                                            ? 'text-destructive'
                                                            : 'text-success'
                                                    }
                                                >
                                                    {formatCurrency(
                                                        transaction.amount,
                                                        transaction.currency,
                                                        locale
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={transaction.status} />
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(transaction.transaction_date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    {t('No transactions found')}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Actions')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {subscription.status === 'pending' && (
                                <Button
                                    className="w-full"
                                    onClick={() => setIsApproveDialogOpen(true)}
                                >
                                    <CheckCircle className="me-2 h-4 w-4" />
                                    {t('Approve Subscription')}
                                </Button>
                            )}
                            {subscription.status === 'active' && (
                                <>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setIsExtendDialogOpen(true)}
                                    >
                                        <CalendarPlus className="me-2 h-4 w-4" />
                                        {t('Extend Subscription')}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => setIsCancelDialogOpen(true)}
                                    >
                                        <XCircle className="me-2 h-4 w-4" />
                                        {t('Cancel Subscription')}
                                    </Button>
                                </>
                            )}
                            {(subscription.status === 'cancelled' ||
                                subscription.status === 'expired') && (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                    {t('No actions available for :status subscriptions.', { status: subscription.status })}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Admin Notes Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                {t('Admin Notes')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {subscription.admin_notes ? (
                                <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                                    {subscription.admin_notes}
                                </pre>
                            ) : (
                                <p className="text-sm text-muted-foreground">{t('No admin notes')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Approval Info Card */}
                    {subscription.approved_at && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Approval Info')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Approved At')}</p>
                                    <p className="font-medium">
                                        {new Date(subscription.approved_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                                    </p>
                                </div>
                                {subscription.approvedBy && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Approved By')}</p>
                                        <p className="font-medium">
                                            {subscription.approvedBy.name}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata Card */}
                    {subscription.metadata &&
                        Object.keys(subscription.metadata).length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Metadata')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                                        {JSON.stringify(subscription.metadata, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        )}
                </div>
            </div>

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
                                placeholder={t('Reason for cancellation...')}
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
                            <Label htmlFor="immediate">{t('Cancel immediately')}</Label>
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
                            {t('Extend the renewal date of this subscription.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="extend_days">{t('Days to Extend')}</Label>
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
                                placeholder={t('Reason for extension...')}
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
                            {t('Approve this pending subscription and activate it.')}
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
                                placeholder={t('Add approval notes...')}
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
