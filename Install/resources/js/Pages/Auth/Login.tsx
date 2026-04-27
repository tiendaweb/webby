import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { PageProps } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { SocialLoginButtons } from '@/components/Auth/SocialLoginButtons';
import { useReCaptcha } from '@/components/Auth/ReCaptchaProvider';
import { useTranslation } from '@/contexts/LanguageContext';
import { Info } from 'lucide-react';

export default function Login({
    status,
    canResetPassword,
    demoCredentials,
}: {
    status?: string;
    canResetPassword: boolean;
    demoCredentials?: { email: string; password: string } | null;
}) {
    const { t } = useTranslation();
    const { appSettings } = usePage<PageProps>().props;
    const { getToken, isEnabled: recaptchaEnabled } = useReCaptcha();

    const { data, setData, processing, errors, reset } = useForm({
        email: demoCredentials?.email || '',
        password: demoCredentials?.password || '',
        remember: false as boolean,
        recaptcha_token: '',
    });

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();

        // Get reCAPTCHA token if enabled
        let recaptchaToken = '';
        if (recaptchaEnabled) {
            recaptchaToken = await getToken('login');
        }

        router.post(route('login'), {
            ...data,
            recaptcha_token: recaptchaToken,
        }, {
            onFinish: () => reset('password'),
            onError: () => toast.error(t('Invalid credentials')),
        });
    };

    return (
        <GuestLayout>
            <Head title={t('Log in')} />

            <div className="prose prose-sm dark:prose-invert text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">{t('Welcome back')}</h1>
                <p className="text-muted-foreground text-sm">{t('Sign in to continue building')}</p>
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-primary bg-primary/10 rounded-lg p-3 text-center">
                    {status}
                </div>
            )}

            {demoCredentials && (
                <Alert variant="info" className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Demo Mode</AlertTitle>
                    <AlertDescription>
                        Use the pre-filled credentials to explore the admin panel (read-only), or register a new account to test the AI website builder.
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('Email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="you@example.com"
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
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="••••••••"
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                </div>

                {errors.recaptcha_token && (
                    <p className="text-sm text-destructive">{errors.recaptcha_token}</p>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="remember"
                            checked={data.remember}
                            onCheckedChange={(checked) =>
                                setData('remember', checked as boolean)
                            }
                        />
                        <Label
                            htmlFor="remember"
                            className="text-sm text-muted-foreground cursor-pointer"
                        >
                            {t('Remember me')}
                        </Label>
                    </div>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                            {t('Forgot password?')}
                        </Link>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full"
                >
                    {processing ? t('Signing in...') : t('Sign in')}
                </Button>

                {appSettings.enable_registration && (
                    <p className="prose prose-sm dark:prose-invert text-center text-sm text-muted-foreground">
                        {t("Don't have an account?")}{' '}
                        <Link
                            href={route('register')}
                            className="text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                            {t('Sign up')}
                        </Link>
                    </p>
                )}
            </form>

            <SocialLoginButtons mode="login" />
        </GuestLayout>
    );
}
