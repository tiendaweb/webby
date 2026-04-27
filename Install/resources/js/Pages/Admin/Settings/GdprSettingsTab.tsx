import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import type { GdprSettings } from './types';

interface Props {
    settings: GdprSettings;
}

export default function GdprSettingsTab({ settings }: Props) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        privacy_policy_version: settings.privacy_policy_version || '1.0',
        terms_policy_version: settings.terms_policy_version || '1.0',
        cookie_policy_version: settings.cookie_policy_version || '1.0',
        data_retention_days_transactions: settings.data_retention_days_transactions?.toString() || '2555',
        data_retention_days_inactive_accounts: settings.data_retention_days_inactive_accounts?.toString() || '730',
        data_retention_days_projects: settings.data_retention_days_projects?.toString() || '90',
        data_retention_days_audit_logs: settings.data_retention_days_audit_logs?.toString() || '365',
        data_retention_days_exports: settings.data_retention_days_exports?.toString() || '7',
        account_deletion_grace_days: settings.account_deletion_grace_days?.toString() || '7',
        data_export_rate_limit_hours: settings.data_export_rate_limit_hours?.toString() || '24',
        cookie_consent_enabled: settings.cookie_consent_enabled ?? true,
        data_export_enabled: settings.data_export_enabled ?? true,
        account_deletion_enabled: settings.account_deletion_enabled ?? true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.settings.gdpr'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Privacy settings updated')),
            onError: () => toast.error(t('Failed to update settings')),
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Privacy & GDPR Settings')}</CardTitle>
                <CardDescription>{t('Configure privacy, data retention, and GDPR compliance settings')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-8">
                    {/* Policy Versions */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Policy Versions')}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t('Track policy versions to prompt users to re-accept when updated')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="privacy_policy_version">{t('Privacy Policy')}</Label>
                                <Input
                                    id="privacy_policy_version"
                                    value={data.privacy_policy_version}
                                    onChange={(e) => setData('privacy_policy_version', e.target.value)}
                                    placeholder={t('e.g. 1.0')}
                                />
                                {errors.privacy_policy_version && (
                                    <p className="text-sm text-destructive">{errors.privacy_policy_version}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="terms_policy_version">{t('Terms of Service')}</Label>
                                <Input
                                    id="terms_policy_version"
                                    value={data.terms_policy_version}
                                    onChange={(e) => setData('terms_policy_version', e.target.value)}
                                    placeholder={t('e.g. 1.0')}
                                />
                                {errors.terms_policy_version && (
                                    <p className="text-sm text-destructive">{errors.terms_policy_version}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cookie_policy_version">{t('Cookie Policy')}</Label>
                                <Input
                                    id="cookie_policy_version"
                                    value={data.cookie_policy_version}
                                    onChange={(e) => setData('cookie_policy_version', e.target.value)}
                                    placeholder={t('e.g. 1.0')}
                                />
                                {errors.cookie_policy_version && (
                                    <p className="text-sm text-destructive">{errors.cookie_policy_version}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Data Retention */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Data Retention')}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t('Configure how long different types of data are retained')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="data_retention_days_transactions">{t('Transactions')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="data_retention_days_transactions"
                                        type="number"
                                        min="365"
                                        value={data.data_retention_days_transactions}
                                        onChange={(e) => setData('data_retention_days_transactions', e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('days')}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{t('Minimum 365 days for legal compliance')}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="data_retention_days_inactive_accounts">{t('Inactive Accounts')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="data_retention_days_inactive_accounts"
                                        type="number"
                                        min="30"
                                        value={data.data_retention_days_inactive_accounts}
                                        onChange={(e) => setData('data_retention_days_inactive_accounts', e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('days')}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="data_retention_days_projects">{t('Deleted Projects')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="data_retention_days_projects"
                                        type="number"
                                        min="7"
                                        value={data.data_retention_days_projects}
                                        onChange={(e) => setData('data_retention_days_projects', e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('days')}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="data_retention_days_audit_logs">{t('Audit Logs')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="data_retention_days_audit_logs"
                                        type="number"
                                        min="30"
                                        value={data.data_retention_days_audit_logs}
                                        onChange={(e) => setData('data_retention_days_audit_logs', e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('days')}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="data_retention_days_exports">{t('Data Exports')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="data_retention_days_exports"
                                        type="number"
                                        min="1"
                                        value={data.data_retention_days_exports}
                                        onChange={(e) => setData('data_retention_days_exports', e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('days')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Grace Periods & Rate Limits */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Grace Periods & Rate Limits')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="account_deletion_grace_days">{t('Account Deletion Grace Period')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="account_deletion_grace_days"
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={data.account_deletion_grace_days}
                                        onChange={(e) => setData('account_deletion_grace_days', e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('days')}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{t('Users can cancel deletion during this period')}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="data_export_rate_limit_hours">{t('Data Export Rate Limit')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="data_export_rate_limit_hours"
                                        type="number"
                                        min="1"
                                        value={data.data_export_rate_limit_hours}
                                        onChange={(e) => setData('data_export_rate_limit_hours', e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('hours')}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{t('Minimum time between data export requests')}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Feature Toggles */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Privacy Features')}</h3>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{t('Cookie Consent Banner')}</Label>
                                <p className="text-sm text-muted-foreground">{t('Show cookie consent banner to visitors')}</p>
                            </div>
                            <Switch
                                checked={data.cookie_consent_enabled}
                                onCheckedChange={(checked) => setData('cookie_consent_enabled', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{t('Data Export')}</Label>
                                <p className="text-sm text-muted-foreground">{t('Allow users to export their personal data')}</p>
                            </div>
                            <Switch
                                checked={data.data_export_enabled}
                                onCheckedChange={(checked) => setData('data_export_enabled', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label>{t('Account Deletion')}</Label>
                                <p className="text-sm text-muted-foreground">{t('Allow users to delete their own accounts')}</p>
                            </div>
                            <Switch
                                checked={data.account_deletion_enabled}
                                onCheckedChange={(checked) => setData('account_deletion_enabled', checked)}
                            />
                        </div>

                        {!data.account_deletion_enabled && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {t('Disabling account deletion may violate GDPR regulations')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

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
