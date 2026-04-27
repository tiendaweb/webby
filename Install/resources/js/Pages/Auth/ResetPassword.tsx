import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
            onSuccess: () => toast.success(t('Password reset successfully')),
            onError: () => toast.error(t('Failed to reset password')),
        });
    };

    return (
        <GuestLayout>
            <Head title={t('Reset Password')} />

            <div className="prose prose-sm dark:prose-invert text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">{t('Reset password')}</h1>
                <p className="text-muted-foreground text-sm">{t('Enter your new password below')}</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('Email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">{t('Password')}</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••"
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password_confirmation">{t('Confirm Password')}</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        placeholder="••••••••"
                    />
                    {errors.password_confirmation && (
                        <p className="text-sm text-destructive">
                            {errors.password_confirmation}
                        </p>
                    )}
                </div>

                <Button type="submit" disabled={processing} className="w-full">
                    {processing ? t('Resetting...') : t('Reset Password')}
                </Button>
            </form>
        </GuestLayout>
    );
}
