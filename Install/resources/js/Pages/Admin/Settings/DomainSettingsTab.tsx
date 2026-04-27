import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState, KeyboardEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Globe, AlertTriangle, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import type { DomainSettings } from './types';

interface Props {
    settings: DomainSettings;
}

export default function DomainSettingsTab({ settings }: Props) {
    const { t } = useTranslation();
    const [subdomainInput, setSubdomainInput] = useState('');
    const { data, setData, put, processing, errors } = useForm({
        domain_enable_subdomains: settings.domain_enable_subdomains,
        domain_enable_custom_domains: settings.domain_enable_custom_domains,
        domain_base_domain: settings.domain_base_domain,
        domain_server_ip: settings.domain_server_ip,
        domain_blocked_subdomains: settings.domain_blocked_subdomains || [],
    });

    const addBlockedSubdomain = (value: string) => {
        const subdomain = value.trim().toLowerCase();
        if (subdomain && !data.domain_blocked_subdomains.includes(subdomain)) {
            setData('domain_blocked_subdomains', [...data.domain_blocked_subdomains, subdomain]);
        }
        setSubdomainInput('');
    };

    const removeBlockedSubdomain = (subdomain: string) => {
        setData('domain_blocked_subdomains', data.domain_blocked_subdomains.filter(s => s !== subdomain));
    };

    const handleSubdomainKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addBlockedSubdomain(subdomainInput);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.settings.domains'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Domain settings updated')),
            onError: () => toast.error(t('Failed to update settings')),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            {/* Support Notice */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    {t('Manual domain configuration is not covered by customer support.')}
                    {' '}
                    {t('For a complete ready-to-use setup, use the autosetup VPS script.')}
                </AlertDescription>
            </Alert>

            {/* Subdomain Publishing */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                {t('Subdomain Publishing')}
                            </CardTitle>
                            <CardDescription>
                                {t('Allow projects to be published to subdomains')}
                            </CardDescription>
                        </div>
                        <Switch
                            checked={data.domain_enable_subdomains}
                            onCheckedChange={(checked) => setData('domain_enable_subdomains', checked)}
                        />
                    </div>
                </CardHeader>
                {data.domain_enable_subdomains && (
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="domain_base_domain">{t('Base Domain')}</Label>
                        <Input
                            id="domain_base_domain"
                            type="text"
                            value={data.domain_base_domain}
                            onChange={(e) => setData('domain_base_domain', e.target.value)}
                            placeholder="example.com"
                            className="max-w-md"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t('The domain used for subdomain publishing (e.g., webby.io)')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t('Recommended: Use the same domain as your Webby installation.')}
                        </p>
                        {errors.domain_base_domain && (
                            <p className="text-sm text-destructive">{errors.domain_base_domain}</p>
                        )}
                    </div>

                    {/* Blocked Subdomains */}
                    <div className="space-y-2">
                        <Label htmlFor="domain_blocked_subdomains">{t('Blocked Subdomains')}</Label>
                        <div className="max-w-md">
                            <div className="flex gap-2">
                                <Input
                                    id="domain_blocked_subdomains"
                                    type="text"
                                    value={subdomainInput}
                                    onChange={(e) => setSubdomainInput(e.target.value.toLowerCase())}
                                    onKeyDown={handleSubdomainKeyDown}
                                    placeholder={t('Type subdomain and press Enter')}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => addBlockedSubdomain(subdomainInput)}
                                    disabled={!subdomainInput.trim()}
                                >
                                    {t('Add')}
                                </Button>
                            </div>
                            {data.domain_blocked_subdomains.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {data.domain_blocked_subdomains.map((subdomain) => (
                                        <Badge
                                            key={subdomain}
                                            variant="secondary"
                                            className="pl-2 pr-1 py-1 gap-1"
                                        >
                                            <span className="font-mono">{subdomain}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeBlockedSubdomain(subdomain)}
                                                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('These will be blocked in addition to the system reserved subdomains.')}
                        </p>
                        <details className="text-sm">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                {t('View system reserved subdomains')}
                            </summary>
                            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                                www, api, app, admin, dashboard, mail, smtp, ftp, blog, shop, store, help, support, docs, status, cdn, assets, static, img, images, dev, staging, test, demo, preview, beta, echo
                            </div>
                        </details>
                        {errors.domain_blocked_subdomains && (
                            <p className="text-sm text-destructive">{errors.domain_blocked_subdomains}</p>
                        )}
                    </div>

                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>{t('Wildcard DNS Required')}</strong>
                            <br />
                            {t('Subdomain publishing requires a wildcard DNS record pointing to your server.')}
                            <br />
                            <code className="text-xs bg-muted px-1 py-0.5 rounded mt-1 inline-block">
                                *.yourdomain.com → server IP
                            </code>
                        </AlertDescription>
                    </Alert>
                </CardContent>
                )}
            </Card>

            {/* Custom Domain Publishing */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('Custom Domain Publishing')}</CardTitle>
                            <CardDescription>
                                {t('Allow users to connect their own domains')}
                            </CardDescription>
                        </div>
                        <Switch
                            checked={data.domain_enable_custom_domains}
                            onCheckedChange={(checked) => setData('domain_enable_custom_domains', checked)}
                        />
                    </div>
                </CardHeader>
                {data.domain_enable_custom_domains && (
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="domain_server_ip">{t('Server IP Address')}</Label>
                            <Input
                                id="domain_server_ip"
                                type="text"
                                value={data.domain_server_ip}
                                onChange={(e) => setData('domain_server_ip', e.target.value.trim())}
                                placeholder="123.45.67.89"
                                className="max-w-md"
                            />
                            <p className="text-sm text-muted-foreground">
                                {t('The public IP address of your server. Users will be instructed to create an A record pointing to this IP.')}
                            </p>
                            {errors.domain_server_ip && (
                                <p className="text-sm text-destructive">{errors.domain_server_ip}</p>
                            )}
                        </div>
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                {t('Custom domains require proper DNS and SSL configuration. This feature is specifically for VPS deployments with full server control.')}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                )}
            </Card>

            {/* Submit */}
            <div className="flex items-center gap-4">
                <Button type="submit" disabled={processing}>
                    {processing ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                    {t('Save Changes')}
                </Button>
            </div>
        </form>
    );
}
