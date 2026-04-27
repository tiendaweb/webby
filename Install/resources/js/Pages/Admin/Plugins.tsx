import { useState } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { CardGridSkeleton } from '@/components/Admin/skeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Settings,
    CreditCard,
    Download,
    Check,
    AlertCircle,
    Building2,
    Wallet,
    Trash2,
    Shield,
    Upload,
} from 'lucide-react';
import UploadPluginModal from '@/components/Admin/UploadPluginModal';
import type { AdminPluginsPageProps } from '@/types/admin';
import type { Plugin, PluginConfigField } from '@/types/billing';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'credit-card': CreditCard,
    'plugins/paypal/icon.svg': Wallet,
    'plugins/bank-transfer/icon.svg': Building2,
};

export default function Plugins({ auth, plugins }: AdminPluginsPageProps) {
    const { t } = useTranslation();
    const { isLoading: isPageLoading } = useAdminLoading();
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [isUninstallDialogOpen, setIsUninstallDialogOpen] = useState(false);
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
    const [configValues, setConfigValues] = useState<Record<string, string | boolean>>({});
    const [configFormErrors, setConfigFormErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const handleInstall = (plugin: Plugin) => {
        setIsLoading(true);
        router.post(
            route('admin.plugins.install', plugin.slug),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`${plugin.name} ${t('installed successfully')}`);
                },
                onError: (errors) => {
                    toast.error(Object.values(errors)[0] as string);
                },
                onFinish: () => setIsLoading(false),
            }
        );
    };

    const handleToggle = (plugin: Plugin) => {
        if (!plugin.is_installed) {
            toast.error(t('Please install the plugin first'));
            return;
        }
        if (!plugin.is_configured && !plugin.is_active) {
            toast.error(t('Please configure the plugin first'));
            openConfigDialog(plugin);
            return;
        }

        router.post(
            route('admin.plugins.toggle', plugin.slug),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        plugin.is_active
                            ? t(':name deactivated', { name: plugin.name })
                            : t(':name activated', { name: plugin.name })
                    );
                },
                onError: (errors) => {
                    toast.error(Object.values(errors)[0] as string);
                },
            }
        );
    };

    const openConfigDialog = (plugin: Plugin) => {
        setSelectedPlugin(plugin);
        // Initialize config values from existing config
        const initialValues: Record<string, string | boolean> = {};
        plugin.config_schema.forEach((field) => {
            initialValues[field.name] =
                (plugin.config[field.name] as string | boolean) ?? field.default ?? '';
        });
        setConfigValues(initialValues);
        setConfigFormErrors({});
        setIsConfigDialogOpen(true);
    };

    const validateConfigForm = () => {
        if (!selectedPlugin) return false;
        const errors: Record<string, string> = {};
        selectedPlugin.config_schema.forEach((field) => {
            if (field.required) {
                const value = configValues[field.name];
                if (value === undefined || value === '' || value === null) {
                    errors[field.name] = t(':field is required', { field: field.label });
                }
            }
        });
        setConfigFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleConfigSave = () => {
        if (!selectedPlugin) return;

        if (!validateConfigForm()) {
            return;
        }

        setIsLoading(true);
        router.post(route('admin.plugins.configure', selectedPlugin.slug), configValues, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Plugin configured successfully'));
                setIsConfigDialogOpen(false);
                setSelectedPlugin(null);
                setConfigFormErrors({});
            },
            onError: (errors) => {
                setConfigFormErrors(errors as Record<string, string>);
                toast.error(Object.values(errors)[0] as string);
            },
            onFinish: () => setIsLoading(false),
        });
    };

    const openUninstallDialog = (plugin: Plugin) => {
        setSelectedPlugin(plugin);
        setIsUninstallDialogOpen(true);
    };

    const handleUninstall = () => {
        if (!selectedPlugin) return;

        setIsLoading(true);
        router.delete(route('admin.plugins.uninstall', selectedPlugin.slug), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`${selectedPlugin.name} ${t('uninstalled successfully')}`);
                setIsUninstallDialogOpen(false);
                setSelectedPlugin(null);
            },
            onError: (errors) => {
                toast.error(Object.values(errors)[0] as string);
            },
            onFinish: () => setIsLoading(false),
        });
    };

    const renderConfigField = (field: PluginConfigField) => {
        const value = configValues[field.name];
        const error = configFormErrors[field.name];

        switch (field.type) {
            case 'text':
            case 'password':
                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-destructive ms-1">*</span>}
                        </Label>
                        <Input
                            id={field.name}
                            type={field.type}
                            value={(value as string) || ''}
                            onChange={(e) =>
                                setConfigValues({ ...configValues, [field.name]: e.target.value })
                            }
                            placeholder={field.placeholder}
                            className={error ? 'border-destructive' : ''}
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        {field.help && (
                            <p className="text-xs text-muted-foreground">{field.help}</p>
                        )}
                    </div>
                );

            case 'textarea':
                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-destructive ms-1">*</span>}
                        </Label>
                        <Textarea
                            id={field.name}
                            value={(value as string) || ''}
                            onChange={(e) =>
                                setConfigValues({ ...configValues, [field.name]: e.target.value })
                            }
                            placeholder={field.placeholder}
                            rows={field.rows || 4}
                        />
                        {field.help && (
                            <p className="text-xs text-muted-foreground">{field.help}</p>
                        )}
                    </div>
                );

            case 'toggle':
                return (
                    <div key={field.name} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor={field.name}>{field.label}</Label>
                            {field.help && (
                                <p className="text-xs text-muted-foreground">{field.help}</p>
                            )}
                        </div>
                        <Switch
                            id={field.name}
                            checked={(value as boolean) || false}
                            onCheckedChange={(checked) =>
                                setConfigValues({ ...configValues, [field.name]: checked })
                            }
                        />
                    </div>
                );

            case 'select':
                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-destructive ms-1">*</span>}
                        </Label>
                        <Select
                            value={(value as string) || ''}
                            onValueChange={(v) =>
                                setConfigValues({ ...configValues, [field.name]: v })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={field.placeholder || t('Select an option...')} />
                            </SelectTrigger>
                            <SelectContent>
                                {field.options?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {field.help && (
                            <p className="text-xs text-muted-foreground">{field.help}</p>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    const getPluginIcon = (plugin: Plugin) => {
        // Try to match icon from map
        const Icon = iconMap[plugin.icon || ''] || CreditCard;
        return Icon;
    };

    const getStatusBadge = (plugin: Plugin) => {
        const badges = [];

        if (plugin.is_core) {
            badges.push(
                <Badge key="core" variant="outline" className="text-info border-info">
                    <Shield className="h-3 w-3 me-1" />
                    {t('Core plugin')}
                </Badge>
            );
        }

        if (!plugin.is_installed) {
            badges.push(<Badge key="status" variant="secondary">{t('Not Installed')}</Badge>);
        } else if (!plugin.is_configured) {
            badges.push(
                <Badge key="status" variant="outline" className="text-warning border-warning">
                    {t('Not Configured')}
                </Badge>
            );
        } else if (plugin.is_active) {
            badges.push(
                <Badge key="status" variant="default" className="bg-success">
                    {t('Active')}
                </Badge>
            );
        } else {
            badges.push(<Badge key="status" variant="secondary">{t('Inactive')}</Badge>);
        }

        return <div className="flex gap-1 flex-wrap">{badges}</div>;
    };

    if (isPageLoading) {
        return (
            <AdminLayout user={auth.user!} title={t('Payment Gateways')}>
                <AdminPageHeader
                    title={t('Payment Gateways')}
                    subtitle={t('Manage payment gateway plugins')}
                    action={
                        <Button onClick={() => setIsUploadModalOpen(true)}>
                            <Upload className="h-4 w-4 me-2" />
                            {t('Upload Plugin')}
                        </Button>
                    }
                />
                <CardGridSkeleton count={6} columns={3} cardVariant="plugin" />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={t('Payment Gateways')}>
            <AdminPageHeader
                title={t('Payment Gateways')}
                subtitle={t('Manage payment gateway plugins')}
                action={
                    <Button onClick={() => setIsUploadModalOpen(true)}>
                        <Upload className="h-4 w-4 me-2" />
                        {t('Upload Plugin')}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plugins.map((plugin) => {
                    const Icon = getPluginIcon(plugin);
                    return (
                        <Card key={plugin.slug} className={!plugin.is_active ? 'opacity-75' : ''}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{plugin.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground">
                                                {t('v:version by :author', { version: plugin.version, author: plugin.author })}
                                            </p>
                                        </div>
                                    </div>
                                    {plugin.is_installed && (
                                        <Switch
                                            checked={plugin.is_active}
                                            onCheckedChange={() => handleToggle(plugin)}
                                            disabled={!plugin.is_configured}
                                        />
                                    )}
                                </div>
                                <div className="mt-2">{getStatusBadge(plugin)}</div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    {plugin.description}
                                </p>
                                {plugin.is_installed && !plugin.is_configured && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-warning">
                                        <AlertCircle className="h-4 w-4" />
                                        {t('Configuration required')}
                                    </div>
                                )}
                                {plugin.is_installed && plugin.is_configured && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-success">
                                        <Check className="h-4 w-4" />
                                        {t('Configured')}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex gap-2">
                                {!plugin.is_installed ? (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleInstall(plugin)}
                                        disabled={isLoading}
                                    >
                                        <Download className="h-4 w-4 me-2" />
                                        {t('Install')}
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => openConfigDialog(plugin)}
                                        >
                                            <Settings className="h-4 w-4 me-2" />
                                            {t('Configure')}
                                        </Button>
                                        {!plugin.is_core && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => openUninstallDialog(plugin)}
                                                disabled={isLoading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </>
                                )}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {plugins.length === 0 && (
                <div className="text-center py-12">
                    <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">{t('No plugins available')}</h3>
                    <p className="text-muted-foreground">
                        {t('Payment gateway plugins will appear here once available.')}
                    </p>
                </div>
            )}

            {/* Configure Plugin Dialog */}
            <Dialog open={isConfigDialogOpen} onOpenChange={(open) => {
                setIsConfigDialogOpen(open);
                if (!open) setConfigFormErrors({});
            }}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Configure :name', { name: selectedPlugin?.name || '' })}</DialogTitle>
                        <DialogDescription>
                            {t('Enter your plugin configuration settings below.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {selectedPlugin?.config_schema.map((field) => renderConfigField(field))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleConfigSave} disabled={isLoading}>
                            {isLoading ? t('Saving...') : t('Save Configuration')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Uninstall Plugin Dialog */}
            <Dialog open={isUninstallDialogOpen} onOpenChange={setIsUninstallDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Uninstall :name', { name: selectedPlugin?.name || '' })}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to uninstall this plugin? All configuration will be lost.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsUninstallDialogOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleUninstall}
                            disabled={isLoading}
                        >
                            {isLoading ? t('Uninstalling...') : t('Uninstall')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Upload Plugin Modal */}
            <UploadPluginModal
                open={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
            />
        </AdminLayout>
    );
}
