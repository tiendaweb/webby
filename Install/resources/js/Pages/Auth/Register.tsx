import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { toast } from 'sonner';
import { SocialLoginButtons } from '@/components/Auth/SocialLoginButtons';
import { useReCaptcha } from '@/components/Auth/ReCaptchaProvider';
import { useTranslation } from '@/contexts/LanguageContext';

export default function Register() {
    const { t } = useTranslation();
    const { getToken, isEnabled: recaptchaEnabled } = useReCaptcha();

    const { data, setData, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        recaptcha_token: '',
    });

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();

        // Get reCAPTCHA token if enabled
        let recaptchaToken = '';
        if (recaptchaEnabled) {
            recaptchaToken = await getToken('register');
        }

        router.post(route('register'), {
            ...data,
            recaptcha_token: recaptchaToken,
        }, {
            onFinish: () => reset('password', 'password_confirmation'),
            onError: () => toast.error(t('Registration failed')),
        });
    };

    return (
        <GuestLayout>
            <Head title={t('Register')} />

            <div className="prose prose-sm dark:prose-invert text-center mb-6">
                <h1 className="text-2xl font-bold text-foreground mb-2">{t('Create your account')}</h1>
                <p className="text-muted-foreground text-sm">{t('Start building with AI')}</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">{t('Name')}</Label>
                    <Input
                        id="name"
                        name="name"
                        value={data.name}
                        autoComplete="name"
                        autoFocus
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        placeholder={t('John Doe')}
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
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
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
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
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
                        required
                        placeholder="••••••••"
                    />
                    {errors.password_confirmation && (
                        <p className="text-sm text-destructive">
                            {errors.password_confirmation}
                        </p>
                    )}
                </div>

                {errors.recaptcha_token && (
                    <p className="text-sm text-destructive">{errors.recaptcha_token}</p>
                )}

                <Button
                    type="submit"
                    disabled={processing}
                    className="w-full"
                >
                    {processing ? t('Creating account...') : t('Create Account')}
                </Button>

                <p className="prose prose-sm dark:prose-invert text-center text-sm text-muted-foreground">
                    {t('Already have an account?')}{' '}
                    <Link
                        href={route('login')}
                        className="text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                        {t('Sign in')}
                    </Link>
                </p>
            </form>

            <SocialLoginButtons mode="register" />
        </GuestLayout>
    );
}
