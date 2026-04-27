import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { useReCaptcha } from '@/components/Auth/ReCaptchaProvider';
import { useTranslation } from '@/contexts/LanguageContext';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useTranslation();
    const { getToken, isEnabled: recaptchaEnabled } = useReCaptcha();

    const { data, setData, processing, errors } = useForm({
        email: '',
        recaptcha_token: '',
    });

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();

        // Get reCAPTCHA token if enabled
        let recaptchaToken = '';
        if (recaptchaEnabled) {
            recaptchaToken = await getToken('forgot_password');
        }

        router.post(route('password.email'), {
            ...data,
            recaptcha_token: recaptchaToken,
        }, {
            onSuccess: () => toast.success(t('Reset link sent to your email')),
            onError: () => toast.error(t('Failed to send reset link')),
        });
    };

    return (
        <GuestLayout>
            <Head title={t('Forgot Password')} />

            <div className="prose prose-sm dark:prose-invert text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">{t('Forgot password?')}</h1>
                <p className="text-muted-foreground text-sm">
                    {t("No problem. Enter your email and we'll send you a reset link.")}
                </p>
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-primary bg-primary/10 rounded-lg p-3 text-center">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('Email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="you@example.com"
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                </div>

                {errors.recaptcha_token && (
                    <p className="text-sm text-destructive">{errors.recaptcha_token}</p>
                )}

                <Button type="submit" disabled={processing} className="w-full">
                    {processing ? t('Sending...') : t('Send Reset Link')}
                </Button>

                <p className="prose prose-sm dark:prose-invert text-center text-sm text-muted-foreground">
                    {t('Remember your password?')}{' '}
                    <Link
                        href={route('login')}
                        className="text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                        {t('Sign in')}
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
