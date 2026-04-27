import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { FormEventHandler, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface DeleteUserFormProps {
    className?: string;
    accountDeletionEnabled?: boolean;
    isSuperAdmin?: boolean;
    pendingDeletion?: {
        scheduled_at: string;
        cancellation_token: string;
    } | null;
}

export default function DeleteUserForm({
    className = '',
    accountDeletionEnabled = true,
    isSuperAdmin = false,
    pendingDeletion,
}: DeleteUserFormProps) {
    const { t } = useTranslation();
    const { impersonating } = usePage<PageProps>().props;
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);

    const {
        post,
        processing,
        reset,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const requestDeletion: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('account.request-deletion'), {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                toast.success(t('Account deletion requested'));
            },
            onError: () => toast.error(t('Failed to request account deletion')),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    // Impersonation - block account deletion
    if (impersonating) {
        return (
            <section className={`space-y-6 ${className}`}>
                <header>
                    <h2 className="text-lg font-medium text-foreground">
                        {t('Delete Account')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('Account deletion is not available while impersonating.')}
                    </p>
                </header>
            </section>
        );
    }

    // Show pending deletion status
    if (pendingDeletion) {
        const scheduledDate = new Date(pendingDeletion.scheduled_at);
        const cancelUrl = route('account.cancel-deletion', { token: pendingDeletion.cancellation_token });

        return (
            <section className={`space-y-6 ${className}`}>
                <header>
                    <h2 className="text-lg font-medium text-foreground">
                        {t('Delete Account')}
                    </h2>
                </header>

                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('Account Deletion Scheduled')}</AlertTitle>
                    <AlertDescription className="mt-2">
                        <p>
                            {t('Your account is scheduled to be permanently deleted on :date at :time.', {
                                date: scheduledDate.toLocaleDateString(),
                                time: scheduledDate.toLocaleTimeString()
                            })}
                        </p>
                        <p className="mt-2">
                            {t('All your data including projects, subscriptions, and activity history will be permanently removed. This action cannot be undone.')}
                        </p>
                        <div className="mt-4">
                            <a
                                href={cancelUrl}
                                className="inline-flex items-center rounded-md bg-background px-3 py-2 text-sm font-semibold text-destructive shadow-sm ring-1 ring-inset ring-destructive/30 hover:bg-destructive/5"
                            >
                                {t('Cancel Deletion Request')}
                            </a>
                        </div>
                    </AlertDescription>
                </Alert>
            </section>
        );
    }

    // Account deletion disabled
    if (!accountDeletionEnabled) {
        return (
            <section className={`space-y-6 ${className}`}>
                <header>
                    <h2 className="text-lg font-medium text-foreground">
                        {t('Delete Account')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('Account deletion is currently disabled. Please contact support if you wish to delete your account.')}
                    </p>
                </header>
            </section>
        );
    }

    // Super admin cannot delete their account
    if (isSuperAdmin) {
        return (
            <section className={`space-y-6 ${className}`}>
                <header>
                    <h2 className="text-lg font-medium text-foreground">
                        {t('Delete Account')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('The super admin account cannot be deleted for security reasons.')}
                    </p>
                </header>
            </section>
        );
    }

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-lg font-medium text-foreground">
                    {t('Delete Account')}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    {t('Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.')}
                </p>
            </header>

            <Button variant="destructive" onClick={confirmUserDeletion}>
                {t('Delete Account')}
            </Button>

            <Dialog open={confirmingUserDeletion} onOpenChange={setConfirmingUserDeletion}>
                <DialogContent>
                    <form onSubmit={requestDeletion}>
                        <DialogHeader>
                            <DialogTitle>{t('Are you sure you want to delete your account?')}</DialogTitle>
                            <DialogDescription>
                                {t('Your account deletion will be scheduled with a grace period. You will receive an email with instructions to cancel the deletion if you change your mind.')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('After the grace period, all your data including projects, subscriptions, and activity history will be permanently removed. This action cannot be undone.')}
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeModal}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" variant="destructive" disabled={processing}>
                                {processing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {processing ? t('Requesting...') : t('Request Account Deletion')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
