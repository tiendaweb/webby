import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Shield, Check, Copy, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import type { AuthSettings } from './types';

interface Props {
    settings: AuthSettings;
}

export default function AuthSettingsTab({ settings }: Props) {
    const { t } = useTranslation();
    const [showRecaptchaSecret, setShowRecaptchaSecret] = useState(false);
    const [showGoogleSecret, setShowGoogleSecret] = useState(false);
    const [showFacebookSecret, setShowFacebookSecret] = useState(false);
    const [showGithubSecret, setShowGithubSecret] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        enable_registration: settings.enable_registration,
        require_email_verification: settings.require_email_verification,
        recaptcha_enabled: settings.recaptcha_enabled,
        recaptcha_site_key: settings.recaptcha_site_key || '',
        recaptcha_secret_key: '',
        google_login_enabled: settings.google_login_enabled,
        google_client_id: settings.google_client_id || '',
        google_client_secret: '',
        facebook_login_enabled: settings.facebook_login_enabled,
        facebook_client_id: settings.facebook_client_id || '',
        facebook_client_secret: '',
        github_login_enabled: settings.github_login_enabled,
        github_client_id: settings.github_client_id || '',
        github_client_secret: '',
        session_timeout: settings.session_timeout,
        password_min_length: settings.password_min_length,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.settings.auth'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Authentication settings updated')),
            onError: () => toast.error(t('Failed to update settings')),
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(t('Copied to clipboard'));
    };

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Authentication Settings')}</CardTitle>
                <CardDescription>{t('Configure login, registration, and security options')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-8">
                    {/* General Auth Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('General')}</h3>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{t('User Registration')}</Label>
                                <p className="text-sm text-muted-foreground">{t('Allow new users to register for an account')}</p>
                            </div>
                            <Switch
                                checked={data.enable_registration}
                                onCheckedChange={(checked) => setData('enable_registration', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{t('Email Verification')}</Label>
                                <p className="text-sm text-muted-foreground">{t('Require users to verify their email address')}</p>
                            </div>
                            <Switch
                                checked={data.require_email_verification}
                                onCheckedChange={(checked) => setData('require_email_verification', checked)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="session_timeout">{t('Session Timeout (minutes)')}</Label>
                                <Input
                                    id="session_timeout"
                                    type="number"
                                    min={5}
                                    max={1440}
                                    value={data.session_timeout}
                                    onChange={(e) => setData('session_timeout', parseInt(e.target.value) || 120)}
                                />
                                {errors.session_timeout && <p className="text-sm text-destructive">{errors.session_timeout}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password_min_length">{t('Minimum Password Length')}</Label>
                                <Input
                                    id="password_min_length"
                                    type="number"
                                    min={6}
                                    max={128}
                                    value={data.password_min_length}
                                    onChange={(e) => setData('password_min_length', parseInt(e.target.value) || 8)}
                                />
                                {errors.password_min_length && <p className="text-sm text-destructive">{errors.password_min_length}</p>}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* reCAPTCHA Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    <Label>{t('reCAPTCHA Protection')}</Label>
                                </div>
                                <p className="text-sm text-muted-foreground">{t('Protect login and registration forms with Google reCAPTCHA')}</p>
                            </div>
                            <Switch
                                checked={data.recaptcha_enabled}
                                onCheckedChange={(checked) => setData('recaptcha_enabled', checked)}
                            />
                        </div>

                        {data.recaptcha_enabled && (
                            <div className="grid gap-4 ps-6 border-s-2 border-muted">
                                <div className="space-y-2">
                                    <Label htmlFor="recaptcha_site_key">{t('Site Key')}</Label>
                                    <Input
                                        id="recaptcha_site_key"
                                        value={data.recaptcha_site_key}
                                        onChange={(e) => setData('recaptcha_site_key', e.target.value)}
                                        placeholder="6Lc..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="recaptcha_secret_key">{t('Secret Key')}</Label>
                                        {settings.recaptcha_has_secret && (
                                            <Badge variant="success" className="text-xs">
                                                <Check className="h-3 w-3 me-1" />
                                                {t('Configured')}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="recaptcha_secret_key"
                                            type={showRecaptchaSecret ? 'text' : 'password'}
                                            value={data.recaptcha_secret_key}
                                            onChange={(e) => setData('recaptcha_secret_key', e.target.value)}
                                            placeholder={settings.recaptcha_has_secret ? t('Leave blank to keep existing') : t('Enter secret key')}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute end-2 top-1/2 -translate-y-1/2"
                                            onClick={() => setShowRecaptchaSecret(!showRecaptchaSecret)}
                                        >
                                            {showRecaptchaSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* OAuth Providers */}
                    {/* Google */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{t('Google Login')}</Label>
                                <p className="text-sm text-muted-foreground">{t('Allow users to sign in with their Google account')}</p>
                            </div>
                            <Switch
                                checked={data.google_login_enabled}
                                onCheckedChange={(checked) => setData('google_login_enabled', checked)}
                            />
                        </div>

                        {data.google_login_enabled && (
                            <div className="grid gap-4 ps-6 border-s-2 border-muted">
                                <div className="space-y-2">
                                    <Label>{t('Callback URL')}</Label>
                                    <div className="flex gap-2">
                                        <Input value={`${baseUrl}/auth/google/callback`} readOnly className="bg-muted" />
                                        <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(`${baseUrl}/auth/google/callback`)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t('Add this URL to your Google OAuth configuration')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="google_client_id">{t('Client ID')}</Label>
                                    <Input
                                        id="google_client_id"
                                        value={data.google_client_id}
                                        onChange={(e) => setData('google_client_id', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="google_client_secret">{t('Client Secret')}</Label>
                                        {settings.google_has_secret && (
                                            <Badge variant="success" className="text-xs">
                                                <Check className="h-3 w-3 me-1" />
                                                {t('Configured')}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="google_client_secret"
                                            type={showGoogleSecret ? 'text' : 'password'}
                                            value={data.google_client_secret}
                                            onChange={(e) => setData('google_client_secret', e.target.value)}
                                            placeholder={settings.google_has_secret ? t('Leave blank to keep existing') : t('Enter client secret')}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute end-2 top-1/2 -translate-y-1/2"
                                            onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                                        >
                                            {showGoogleSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Facebook */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{t('Facebook Login')}</Label>
                                <p className="text-sm text-muted-foreground">{t('Allow users to sign in with their Facebook account')}</p>
                            </div>
                            <Switch
                                checked={data.facebook_login_enabled}
                                onCheckedChange={(checked) => setData('facebook_login_enabled', checked)}
                            />
                        </div>

                        {data.facebook_login_enabled && (
                            <div className="grid gap-4 ps-6 border-s-2 border-muted">
                                <div className="space-y-2">
                                    <Label>{t('Callback URL')}</Label>
                                    <div className="flex gap-2">
                                        <Input value={`${baseUrl}/auth/facebook/callback`} readOnly className="bg-muted" />
                                        <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(`${baseUrl}/auth/facebook/callback`)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="facebook_client_id">{t('App ID')}</Label>
                                    <Input
                                        id="facebook_client_id"
                                        value={data.facebook_client_id}
                                        onChange={(e) => setData('facebook_client_id', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="facebook_client_secret">{t('App Secret')}</Label>
                                        {settings.facebook_has_secret && (
                                            <Badge variant="success" className="text-xs">
                                                <Check className="h-3 w-3 me-1" />
                                                {t('Configured')}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="facebook_client_secret"
                                            type={showFacebookSecret ? 'text' : 'password'}
                                            value={data.facebook_client_secret}
                                            onChange={(e) => setData('facebook_client_secret', e.target.value)}
                                            placeholder={settings.facebook_has_secret ? t('Leave blank to keep existing') : t('Enter app secret')}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute end-2 top-1/2 -translate-y-1/2"
                                            onClick={() => setShowFacebookSecret(!showFacebookSecret)}
                                        >
                                            {showFacebookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* GitHub */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{t('GitHub Login')}</Label>
                                <p className="text-sm text-muted-foreground">{t('Allow users to sign in with their GitHub account')}</p>
                            </div>
                            <Switch
                                checked={data.github_login_enabled}
                                onCheckedChange={(checked) => setData('github_login_enabled', checked)}
                            />
                        </div>

                        {data.github_login_enabled && (
                            <div className="grid gap-4 ps-6 border-s-2 border-muted">
                                <div className="space-y-2">
                                    <Label>{t('Callback URL')}</Label>
                                    <div className="flex gap-2">
                                        <Input value={`${baseUrl}/auth/github/callback`} readOnly className="bg-muted" />
                                        <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(`${baseUrl}/auth/github/callback`)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="github_client_id">{t('Client ID')}</Label>
                                    <Input
                                        id="github_client_id"
                                        value={data.github_client_id}
                                        onChange={(e) => setData('github_client_id', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="github_client_secret">{t('Client Secret')}</Label>
                                        {settings.github_has_secret && (
                                            <Badge variant="success" className="text-xs">
                                                <Check className="h-3 w-3 me-1" />
                                                {t('Configured')}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="github_client_secret"
                                            type={showGithubSecret ? 'text' : 'password'}
                                            value={data.github_client_secret}
                                            onChange={(e) => setData('github_client_secret', e.target.value)}
                                            placeholder={settings.github_has_secret ? t('Leave blank to keep existing') : t('Enter client secret')}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute end-2 top-1/2 -translate-y-1/2"
                                            onClick={() => setShowGithubSecret(!showGithubSecret)}
                                        >
                                            {showGithubSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            {processing ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                            {t('Save Changes')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
