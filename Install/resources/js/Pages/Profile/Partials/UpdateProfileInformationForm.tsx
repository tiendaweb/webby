import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const { t } = useTranslation();
    const user = usePage().props.auth.user!;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'), {
            onSuccess: () => toast.success(t('Profile updated successfully')),
            onError: () => toast.error(t('Failed to update profile')),
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-foreground">
                    {t('Profile Information')}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    {t("Update your account's profile information and email address.")}
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name">{t('Name')}</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoFocus
                        autoComplete="name"
                        placeholder={t('Your full name')}
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">{t('Email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                        placeholder={t('you@example.com')}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {t('Your email address is unverified.')}{' '}
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="text-primary hover:text-primary/80 underline"
                            >
                                {t('Click here to re-send the verification email.')}
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-primary">
                                {t('A new verification link has been sent to your email address.')}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <Button disabled={processing}>
                        {processing ? t('Saving...') : t('Save')}
                    </Button>

                    {recentlySuccessful && (
                        <p className="text-sm text-muted-foreground animate-in fade-in">
                            {t('Saved.')}
                        </p>
                    )}
                </div>
            </form>
        </section>
    );
}
