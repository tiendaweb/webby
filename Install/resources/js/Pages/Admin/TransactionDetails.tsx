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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    RefreshCcw,
    User,
    CreditCard,
    FileText,
    Receipt,
} from 'lucide-react';
import type { PageProps } from '@/types';
import type { Transaction, PaymentMethod, TransactionType } from '@/types/billing';

interface TransactionDetailsPageProps extends PageProps {
    transaction: Transaction;
}

export default function TransactionDetails({
    auth,
    transaction,
}: TransactionDetailsPageProps) {
    const { t, locale } = useTranslation();
    const { isLoading } = useAdminLoading();

    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);

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
        amount: transaction.amount,
        reason: '',
    });

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
        }).format(amount);
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

    const handleApprove = () => {
        router.post(
            route('admin.transactions.approve', transaction.id),
            approveForm,
            {
                onSuccess: () => {
                    setIsApproveDialogOpen(false);
                    setApproveForm({ notes: '' });
                },
            }
        );
    };

    const handleReject = () => {
        router.post(
            route('admin.transactions.reject', transaction.id),
            rejectForm,
            {
                onSuccess: () => {
                    setIsRejectDialogOpen(false);
                    setRejectForm({ reason: '' });
                },
            }
        );
    };

    const handleRefund = () => {
        router.post(
            route('admin.transactions.refund', transaction.id),
            refundForm,
            {
                onSuccess: () => {
                    setIsRefundDialogOpen(false);
                    setRefundForm({ amount: 0, reason: '' });
                },
            }
        );
    };

    if (isLoading) {
        return (
            <AdminLayout user={auth.user!} title={t('Transaction Details')}>
                <DetailPageSkeleton variant="subscription" />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={`${t('Transaction')} ${transaction.transaction_id}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="prose prose-sm dark:prose-invert">
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('Transaction')} {transaction.transaction_id}
                    </h1>
                    <p className="text-muted-foreground">
                        {transaction.user?.name} - {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={route('admin.transactions')}>
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
                            {transaction.user ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Name')}</p>
                                        <p className="font-medium">{transaction.user.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Email')}</p>
                                        <p className="font-medium">{transaction.user.email}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">{t('User not available')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Transaction Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                {t('Transaction Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Transaction ID')}</p>
                                    <p className="font-mono font-medium">{transaction.transaction_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Status')}</p>
                                    <StatusBadge status={transaction.status} />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Amount')}</p>
                                    <p className={`font-medium ${transaction.amount < 0 ? 'text-destructive' : 'text-success'}`}>
                                        {formatCurrency(transaction.amount, transaction.currency)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Type')}</p>
                                    <Badge variant="outline">
                                        {typeLabels[transaction.type] || transaction.type}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Payment Method')}</p>
                                    <Badge variant="secondary">
                                        {paymentLabels[transaction.payment_method] || transaction.payment_method}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('Date')}</p>
                                    <p className="font-medium">
                                        {new Date(transaction.transaction_date).toLocaleDateString(locale, {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: 'numeric',
                                        })}
                                    </p>
                                </div>
                                {transaction.external_transaction_id && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('External Transaction ID')}</p>
                                        <p className="font-mono font-medium text-sm">{transaction.external_transaction_id}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subscription Info Card */}
                    {transaction.subscription && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="h-5 w-5" />
                                    {t('Related Subscription')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Plan')}</p>
                                        <p className="font-medium">
                                            {transaction.subscription.plan?.name || t('Unknown Plan')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Subscription Status')}</p>
                                        <StatusBadge status={transaction.subscription.status} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={route('admin.subscriptions.show', transaction.subscription.id)}>
                                            {t('View Subscription')}
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Actions')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {transaction.status === 'pending' && (
                                <>
                                    <Button
                                        className="w-full"
                                        onClick={() => setIsApproveDialogOpen(true)}
                                    >
                                        <CheckCircle className="me-2 h-4 w-4" />
                                        {t('Approve Payment')}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => setIsRejectDialogOpen(true)}
                                    >
                                        <XCircle className="me-2 h-4 w-4" />
                                        {t('Reject Payment')}
                                    </Button>
                                </>
                            )}
                            {transaction.status === 'completed' && transaction.type !== 'refund' && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setRefundForm({
                                            amount: transaction.amount,
                                            reason: '',
                                        });
                                        setIsRefundDialogOpen(true);
                                    }}
                                >
                                    <RefreshCcw className="me-2 h-4 w-4" />
                                    {t('Process Refund')}
                                </Button>
                            )}
                            {(transaction.status === 'failed' || transaction.status === 'refunded') && (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                    {t('No actions available for this transaction.')}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notes Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                {t('Notes')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {transaction.notes ? (
                                <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                                    {transaction.notes}
                                </pre>
                            ) : (
                                <p className="text-sm text-muted-foreground">{t('No notes')}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Processed By Card */}
                    {transaction.processed_by_user && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Processed By')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="font-medium">{transaction.processed_by_user.name}</p>
                                <p className="text-sm text-muted-foreground">{transaction.processed_by_user.email}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata Card */}
                    {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Metadata')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                                    {JSON.stringify(transaction.metadata, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

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
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">{t('Amount:')}</span>
                                <span className="font-medium">
                                    {formatCurrency(transaction.amount, transaction.currency)}
                                </span>
                                <span className="text-muted-foreground">{t('User:')}</span>
                                <span>{transaction.user?.name}</span>
                            </div>
                        </div>
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
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-muted-foreground">{t('Original Amount:')}</span>
                                <span className="font-medium">
                                    {formatCurrency(transaction.amount, transaction.currency)}
                                </span>
                                <span className="text-muted-foreground">{t('User:')}</span>
                                <span>{transaction.user?.name}</span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="refund_amount">{t('Refund Amount')}</Label>
                            <Input
                                id="refund_amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={transaction.amount}
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
                                {t('Max:')} {formatCurrency(transaction.amount, transaction.currency)}
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
