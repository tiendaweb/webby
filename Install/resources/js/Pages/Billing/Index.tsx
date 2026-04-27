import { Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { usePageLoading } from '@/hooks/usePageLoading';
import { useTranslation } from '@/contexts/LanguageContext';
import { BillingSkeleton } from './BillingSkeleton';
import CurrentSubscriptionCard from './Partials/CurrentSubscriptionCard';
import BankTransferPending from './Partials/BankTransferPending';
import NoSubscriptionAlert from './Partials/NoSubscriptionAlert';
import BillingHistoryTable from './Partials/BillingHistoryTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BillingPageProps } from '@/types/billing';

export default function Index({
    subscription,
    pendingSubscription,
    transactions,
}: BillingPageProps) {
    const { auth } = usePage<BillingPageProps>().props;
    const { isLoading } = usePageLoading();
    const { t } = useTranslation();

    return (
        <AdminLayout user={auth.user!} title={t('Billing')}>
            {isLoading ? (
                <BillingSkeleton />
            ) : (
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="prose prose-sm dark:prose-invert">
                        <h1 className="text-2xl font-bold text-foreground">
                            {t('Billing')}
                        </h1>
                        <p className="text-muted-foreground">
                            {t('Manage your subscription and view billing history')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/billing/usage">{t('Usage')}</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/billing/referral">{t('Referral')}</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/billing/plans">
                                {subscription ? t('Change Plan') : t('Choose Plan')}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Current Subscription or No Subscription Alert */}
                {subscription ? (
                    <CurrentSubscriptionCard subscription={subscription} />
                ) : pendingSubscription ? (
                    <BankTransferPending subscription={pendingSubscription} />
                ) : (
                    <NoSubscriptionAlert />
                )}

                {/* Billing History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Billing History')}</CardTitle>
                        <CardDescription>{t('Your recent transactions and invoices')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BillingHistoryTable transactions={transactions} />
                    </CardContent>
                </Card>
            </div>
            )}
        </AdminLayout>
    );
}
