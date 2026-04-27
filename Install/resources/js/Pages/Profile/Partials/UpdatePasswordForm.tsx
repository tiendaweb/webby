import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { FormEventHandler, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

export default function UpdatePasswordForm({
    className = '',
}: {
    className?: string;
}) {
    const { t } = useTranslation();
    const { impersonating } = usePage<PageProps>().props;
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                toast.success(t('Password updated successfully'));
            },
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
                toast.error(t('Failed to update password'));
            },
        });
    };

    if (impersonating) {
        return (
            <section className={className}>
                <header>
                    <h2 className="text-lg font-medium text-foreground">
                        {t('Update Password')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t('Password change is not available while impersonating.')}
                    </p>
                </header>
            </section>
        );
    }

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-foreground">
                    {t('Update Password')}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    {t('Ensure your account is using a long, random password to stay secure.')}
                </p>
            </header>

            <form onSubmit={updatePassword} className="mt-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="current_password">{t('Current Password')}</Label>
                    <Input
                        id="current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) =>
                            setData('current_password', e.target.value)
                        }
                        type="password"
                        autoComplete="current-password"
                        placeholder={t('Enter your current password')}
                    />
                    {errors.current_password && (
                        <p className="text-sm text-destructive">{errors.current_password}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">{t('New Password')}</Label>
                    <Input
                        id="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('Enter a new password')}
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password_confirmation">{t('Confirm Password')}</Label>
                    <Input
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('Confirm your new password')}
                    />
                    {errors.password_confirmation && (
                        <p className="text-sm text-destructive">{errors.password_confirmation}</p>
                    )}
                </div>

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
