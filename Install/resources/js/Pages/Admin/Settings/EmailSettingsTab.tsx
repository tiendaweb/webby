import { useForm, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, Send, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EmailSettings, NotificationEvent, MailDriver, MailEncryption } from './types';

interface Props {
    settings: EmailSettings;
    notificationEvents: NotificationEvent[];
}

export default function EmailSettingsTab({ settings, notificationEvents }: Props) {
    const { t } = useTranslation();
    const [testingSending, setTestingSending] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const MAIL_DRIVERS: { value: MailDriver; label: string }[] = [
        { value: 'sendmail', label: t('Sendmail') },
        { value: 'smtp', label: t('SMTP') },
    ];

    const ENCRYPTION_OPTIONS: { value: MailEncryption; label: string }[] = [
        { value: 'tls', label: t('TLS') },
        { value: 'ssl', label: t('SSL') },
        { value: 'none', label: t('None') },
    ];

    const { data, setData, put, processing, errors } = useForm({
        mail_mailer: settings.mail_mailer || 'smtp',
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port?.toString() || '587',
        smtp_username: settings.smtp_username || '',
        smtp_password: '',
        smtp_encryption: settings.smtp_encryption || 'tls',
        mail_from_address: settings.mail_from_address || '',
        mail_from_name: settings.mail_from_name || '',
        admin_notification_email: settings.admin_notification_email || '',
        admin_notification_events: settings.admin_notification_events || [],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.settings.email'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Email settings updated')),
            onError: () => toast.error(t('Failed to update settings')),
        });
    };

    const sendTestEmail = () => {
        if (!testEmail) {
            toast.error(t('Please enter an email address'));
            return;
        }
        setTestingSending(true);
        router.post(
            route('admin.settings.email.test'),
            { email: testEmail },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('Test email sent to :email', { email: testEmail }));
                    setTestingSending(false);
                },
                onError: (errors) => {
                    toast.error(errors.email || t('Failed to send test email'));
                    setTestingSending(false);
                },
            }
        );
    };

    const toggleEvent = (event: string) => {
        const events = data.admin_notification_events.includes(event)
            ? data.admin_notification_events.filter((e) => e !== event)
            : [...data.admin_notification_events, event];
        setData('admin_notification_events', events);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Email Settings')}</CardTitle>
                <CardDescription>{t('Configure email delivery and notification settings')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-8">
                    {/* Sender Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Sender Information')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mail_from_name">{t('From Name')}</Label>
                                <Input
                                    id="mail_from_name"
                                    value={data.mail_from_name}
                                    onChange={(e) => setData('mail_from_name', e.target.value)}
                                    placeholder={t('Your Site Name')}
                                />
                                {errors.mail_from_name && <p className="text-sm text-destructive">{errors.mail_from_name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mail_from_address">{t('From Email')}</Label>
                                <Input
                                    id="mail_from_address"
                                    type="email"
                                    value={data.mail_from_address}
                                    onChange={(e) => setData('mail_from_address', e.target.value)}
                                    placeholder={t('noreply@example.com')}
                                />
                                {errors.mail_from_address && <p className="text-sm text-destructive">{errors.mail_from_address}</p>}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Mail Driver */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Mail Driver')}</h3>
                        <div className="space-y-2">
                            <Label htmlFor="mail_mailer">{t('Email Driver')}</Label>
                            <Select
                                value={data.mail_mailer}
                                onValueChange={(value: MailDriver) => setData('mail_mailer', value)}
                            >
                                <SelectTrigger className="max-w-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MAIL_DRIVERS.map((driver) => (
                                        <SelectItem key={driver.value} value={driver.value}>
                                            {driver.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* SMTP Configuration - Conditional */}
                        {data.mail_mailer === 'smtp' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ps-6 border-s-2 border-muted">
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_host">{t('SMTP Host')}</Label>
                                    <Input
                                        id="smtp_host"
                                        value={data.smtp_host}
                                        onChange={(e) => setData('smtp_host', e.target.value)}
                                        placeholder={t('smtp.example.com')}
                                    />
                                    {errors.smtp_host && <p className="text-sm text-destructive">{errors.smtp_host}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_port">{t('SMTP Port')}</Label>
                                    <Input
                                        id="smtp_port"
                                        type="number"
                                        value={data.smtp_port}
                                        onChange={(e) => setData('smtp_port', e.target.value)}
                                        placeholder="587"
                                    />
                                    {errors.smtp_port && <p className="text-sm text-destructive">{errors.smtp_port}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_username">{t('SMTP Username')}</Label>
                                    <Input
                                        id="smtp_username"
                                        value={data.smtp_username}
                                        onChange={(e) => setData('smtp_username', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="smtp_password">{t('SMTP Password')}</Label>
                                        {settings.smtp_has_password && (
                                            <Badge variant="success" className="text-xs">
                                                <Check className="h-3 w-3 me-1" />
                                                {t('Configured')}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="smtp_password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.smtp_password}
                                            onChange={(e) => setData('smtp_password', e.target.value)}
                                            placeholder={settings.smtp_has_password ? t('Leave blank to keep existing') : t('Enter password')}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute end-2 top-1/2 -translate-y-1/2"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtp_encryption">{t('Encryption')}</Label>
                                    <Select
                                        value={data.smtp_encryption}
                                        onValueChange={(value: MailEncryption) => setData('smtp_encryption', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ENCRYPTION_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Admin Notifications */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Admin Notifications')}</h3>
                        <div className="space-y-2">
                            <Label htmlFor="admin_notification_email">{t('Admin Email')}</Label>
                            <Input
                                id="admin_notification_email"
                                type="email"
                                value={data.admin_notification_email}
                                onChange={(e) => setData('admin_notification_email', e.target.value)}
                                placeholder={t('admin@example.com')}
                                className="max-w-md"
                            />
                            <p className="text-sm text-muted-foreground">{t('Receive notifications for important events')}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('Notification Events')}</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {notificationEvents.map((event) => (
                                    <div key={event.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={event.value}
                                            checked={data.admin_notification_events.includes(event.value)}
                                            onCheckedChange={() => toggleEvent(event.value)}
                                        />
                                        <Label htmlFor={event.value} className="text-sm font-normal cursor-pointer">
                                            {event.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Test Email */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Test Email')}</h3>
                        <div className="flex gap-2 max-w-md">
                            <Input
                                type="email"
                                placeholder={t('Enter email address')}
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={sendTestEmail}
                                disabled={testingSending || !data.mail_from_address}
                            >
                                {testingSending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Send className="h-4 w-4 me-2" />}
                                {t('Send Test Email')}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">{t('Save your settings before sending a test email')}</p>
                    </div>

                    {/* Actions */}
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
