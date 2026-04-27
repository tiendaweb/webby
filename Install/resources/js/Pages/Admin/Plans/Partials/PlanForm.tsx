import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Bot, Server, Loader2, Coins, Key, FolderOpen, Globe, Database, HardDrive } from 'lucide-react';
import FeatureManager, { type PlanFeature } from './FeatureManager';
import type { BillingPeriod } from '@/types/billing';

interface AiProvider {
    id: number;
    name: string;
    type: string;
    is_default: boolean;
}

interface Builder {
    id: number;
    name: string;
}

interface Plan {
    id: number;
    name: string;
    description: string | null;
    price: number;
    billing_period: BillingPeriod;
    features: PlanFeature[];
    is_active: boolean;
    is_popular: boolean;
    ai_provider_id: number | null;
    fallback_ai_provider_ids: number[] | null;
    builder_id: number | null;
    monthly_build_credits: number | null;
    allow_user_ai_api_key: boolean;
    max_projects: number | null;
    // Subdomain settings
    enable_subdomains: boolean;
    max_subdomains_per_user: number | null;
    allow_private_visibility: boolean;
    // Custom domain settings
    enable_custom_domains: boolean;
    max_custom_domains_per_user: number | null;
    // Firebase settings
    enable_firebase: boolean;
    allow_user_firebase_config: boolean;
    // File storage settings
    enable_file_storage: boolean;
    max_storage_mb: number | null;
    max_file_size_mb: number;
    allowed_file_types: string[] | null;
}

interface DomainSettings {
    subdomainsEnabled: boolean;
    customDomainsEnabled: boolean;
}

interface PlanFormProps {
    plan?: Plan;
    aiProviders: AiProvider[];
    builders: Builder[];
    domainSettings?: DomainSettings;
    onCancel: () => void;
}

export default function PlanForm({ plan, aiProviders, builders, domainSettings, onCancel }: PlanFormProps) {
    const { t } = useTranslation();
    const isEdit = !!plan;
    const [isUnlimitedCredits, setIsUnlimitedCredits] = useState(
        plan?.monthly_build_credits === -1
    );

    const { data, setData, post, put, processing, errors } = useForm({
        name: plan?.name ?? '',
        description: plan?.description ?? '',
        price: plan?.price ?? 0,
        billing_period: plan?.billing_period ?? 'monthly' as BillingPeriod,
        features: plan?.features ?? [] as PlanFeature[],
        is_active: plan?.is_active ?? true,
        is_popular: plan?.is_popular ?? false,
        ai_provider_id: plan?.ai_provider_id ?? null as number | null,
        fallback_ai_provider_ids: plan?.fallback_ai_provider_ids ?? [] as number[],
        builder_id: plan?.builder_id ?? null as number | null,
        monthly_build_credits: plan?.monthly_build_credits ?? 0,
        allow_user_ai_api_key: plan?.allow_user_ai_api_key ?? false,
        max_projects: plan?.max_projects ?? null as number | null,
        // Subdomain settings
        enable_subdomains: plan?.enable_subdomains ?? false,
        max_subdomains_per_user: plan?.max_subdomains_per_user ?? null as number | null,
        allow_private_visibility: plan?.allow_private_visibility ?? false,
        // Custom domain settings
        enable_custom_domains: plan?.enable_custom_domains ?? false,
        max_custom_domains_per_user: plan?.max_custom_domains_per_user ?? null as number | null,
        // Firebase settings
        enable_firebase: plan?.enable_firebase ?? false,
        allow_user_firebase_config: plan?.allow_user_firebase_config ?? false,
        // File storage settings
        enable_file_storage: plan?.enable_file_storage ?? false,
        max_storage_mb: plan?.max_storage_mb ?? null as number | null,
        max_file_size_mb: plan?.max_file_size_mb ?? 10,
        allowed_file_types: plan?.allowed_file_types ?? null as string[] | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEdit) {
            put(route('admin.plans.update', plan.id), {
                onSuccess: () => toast.success(t('Plan updated successfully')),
                onError: () => toast.error(t('Failed to update plan')),
            });
        } else {
            post(route('admin.plans.store'), {
                onSuccess: () => toast.success(t('Plan created successfully')),
                onError: () => toast.error(t('Failed to create plan')),
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Basic Information')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('Plan Name')} *</Label>
                                <Input
                                    id="name"
                                    placeholder={t('e.g. Pro, Business, Enterprise')}
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className={errors.name ? 'border-destructive' : ''}
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">{t('Description')}</Label>
                                <Textarea
                                    id="description"
                                    placeholder={t('Brief description of the plan')}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">{t('Price')} *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="9.99"
                                        value={data.price}
                                        onChange={(e) => setData('price', parseFloat(e.target.value) || 0)}
                                        className={errors.price ? 'border-destructive' : ''}
                                    />
                                    {errors.price && (
                                        <p className="text-sm text-destructive">{errors.price}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="billing_period">{t('Billing Period')} *</Label>
                                    <Select
                                        value={data.billing_period}
                                        onValueChange={(value: BillingPeriod) => setData('billing_period', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                                            <SelectItem value="yearly">{t('Yearly')}</SelectItem>
                                            <SelectItem value="lifetime">{t('Lifetime')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Display Options */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Display Options')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>{t('Active')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Plan is visible and available for purchase')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>{t('Mark as Popular')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Highlight this plan as the recommended option')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.is_popular}
                                    onCheckedChange={(checked) => setData('is_popular', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Project Limit */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                {t('Project Limit')}
                            </CardTitle>
                            <CardDescription>
                                {t('Set the maximum number of projects users can create')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>{t('Unlimited Projects')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Allow users to create unlimited projects')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.max_projects === null}
                                    onCheckedChange={(checked) => {
                                        setData('max_projects', checked ? null : 1);
                                    }}
                                />
                            </div>

                            {data.max_projects !== null && (
                                <div className="space-y-2">
                                    <Label htmlFor="max_projects">{t('Maximum Projects')}</Label>
                                    <Input
                                        id="max_projects"
                                        type="number"
                                        min="0"
                                        placeholder="3"
                                        value={data.max_projects}
                                        onChange={(e) => setData('max_projects', parseInt(e.target.value) || 0)}
                                        className={errors.max_projects ? 'border-destructive' : ''}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('Set to 0 for no projects allowed')}
                                    </p>
                                    {errors.max_projects && (
                                        <p className="text-sm text-destructive">{errors.max_projects}</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* User API Keys */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                {t('User API Keys')}
                            </CardTitle>
                            <CardDescription>
                                {t('Allow users to use their own AI provider API keys')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>{t('Allow Own API Keys')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Users can configure their own API keys for AI providers')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.allow_user_ai_api_key}
                                    onCheckedChange={(checked) => setData('allow_user_ai_api_key', checked)}
                                />
                            </div>
                            {data.allow_user_ai_api_key && (
                                <p className="text-xs text-muted-foreground p-3 bg-muted rounded-md border">
                                    {t('When users provide their own API keys, usage will not be deducted from their credits')}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Custom Subdomains - only show if globally enabled */}
                    {domainSettings?.subdomainsEnabled !== false && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    {t('Custom Subdomains')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Allow users to publish projects to custom subdomains')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label>{t('Enable Custom Subdomains')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('Users can publish projects to custom subdomains')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.enable_subdomains}
                                        onCheckedChange={(checked) => setData('enable_subdomains', checked)}
                                    />
                                </div>

                                {data.enable_subdomains && (
                                    <>
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-0.5">
                                                <Label>{t('Unlimited Subdomains')}</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    {t('Allow unlimited custom subdomains per user')}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={data.max_subdomains_per_user === null}
                                                onCheckedChange={(checked) => {
                                                    setData('max_subdomains_per_user', checked ? null : 1);
                                                }}
                                            />
                                        </div>

                                        {data.max_subdomains_per_user !== null && (
                                            <div className="space-y-2">
                                                <Label htmlFor="max_subdomains">{t('Maximum Subdomains')}</Label>
                                                <Input
                                                    id="max_subdomains"
                                                    type="number"
                                                    min="0"
                                                    placeholder="5"
                                                    value={data.max_subdomains_per_user ?? ''}
                                                    onChange={(e) => setData('max_subdomains_per_user', parseInt(e.target.value) || 0)}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    {t('Set maximum number of subdomains per user')}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Custom Domains - only show if globally enabled */}
                    {domainSettings?.customDomainsEnabled !== false && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    {t('Custom Domains')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Allow users to use custom domains for their projects')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label>{t('Enable Custom Domains')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('Users can connect their own domains to projects')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.enable_custom_domains}
                                        onCheckedChange={(checked) => setData('enable_custom_domains', checked)}
                                    />
                                </div>

                                {data.enable_custom_domains && (
                                    <>
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-0.5">
                                                <Label>{t('Unlimited Custom Domains')}</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    {t('Allow unlimited custom domains per user')}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={data.max_custom_domains_per_user === null}
                                                onCheckedChange={(checked) => {
                                                    setData('max_custom_domains_per_user', checked ? null : 1);
                                                }}
                                            />
                                        </div>

                                        {data.max_custom_domains_per_user !== null && (
                                            <div className="space-y-2">
                                                <Label htmlFor="max_custom_domains">{t('Maximum Custom Domains')}</Label>
                                                <Input
                                                    id="max_custom_domains"
                                                    type="number"
                                                    min="0"
                                                    placeholder="3"
                                                    value={data.max_custom_domains_per_user ?? ''}
                                                    onChange={(e) => setData('max_custom_domains_per_user', parseInt(e.target.value) || 0)}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    {t('Set maximum number of custom domains per user')}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Private Visibility */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {t('Private Project Visibility')}
                            </CardTitle>
                            <CardDescription>
                                {t('Control whether users can make their projects private')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>{t('Allow Private Visibility')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Users can set their projects to private (not publicly accessible)')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.allow_private_visibility}
                                    onCheckedChange={(checked) => setData('allow_private_visibility', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* AI Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                {t('AI Provider')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="ai_provider_id">{t('Primary AI Provider')}</Label>
                                <Select
                                    value={data.ai_provider_id?.toString() ?? 'system_default'}
                                    onValueChange={(value) =>
                                        setData('ai_provider_id', value === 'system_default' ? null : parseInt(value))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('System Default')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="system_default">{t('System Default')}</SelectItem>
                                        {aiProviders.map((provider) => (
                                            <SelectItem key={provider.id} value={provider.id.toString()}>
                                                {provider.name} ({provider.type})
                                                {provider.is_default && ` - ${t('Default')}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {t('Select which AI provider to use for this plan')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Builder Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Server className="h-4 w-4" />
                                {t('AI Builder')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="builder_id">{t('Primary Builder')}</Label>
                                <Select
                                    value={data.builder_id?.toString() ?? 'system_default'}
                                    onValueChange={(value) =>
                                        setData('builder_id', value === 'system_default' ? null : parseInt(value))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('System Default')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="system_default">{t('System Default')}</SelectItem>
                                        {builders.map((builder) => (
                                            <SelectItem key={builder.id} value={builder.id.toString()}>
                                                {builder.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {t('Select which builder service to use for this plan')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Build Credits */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Coins className="h-4 w-4" />
                                {t('Build Credits')}
                            </CardTitle>
                            <CardDescription>
                                {t('Set the monthly AI usage credits for this plan')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>{t('Unlimited Credits')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Allow unlimited AI usage')}
                                    </p>
                                </div>
                                <Switch
                                    checked={isUnlimitedCredits}
                                    onCheckedChange={(checked) => {
                                        setIsUnlimitedCredits(checked);
                                        setData('monthly_build_credits', checked ? -1 : 0);
                                    }}
                                />
                            </div>

                            {!isUnlimitedCredits && (
                                <div className="space-y-2">
                                    <Label htmlFor="monthly_build_credits">{t('Monthly Token Limit')}</Label>
                                    <Input
                                        id="monthly_build_credits"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        placeholder="1000000"
                                        value={data.monthly_build_credits === -1 ? '' : data.monthly_build_credits}
                                        onChange={(e) => setData('monthly_build_credits', parseInt(e.target.value) || 0)}
                                        className={errors.monthly_build_credits ? 'border-destructive' : ''}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('Total AI tokens allowed per month (input + output)')}
                                    </p>
                                    {errors.monthly_build_credits && (
                                        <p className="text-sm text-destructive">{errors.monthly_build_credits}</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Firebase Database */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {t('Firebase Database')}
                            </CardTitle>
                            <CardDescription>
                                {t('Configure Firebase Firestore database access for projects')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>{t('Enable Firebase')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Allow projects to use Firebase Firestore database')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.enable_firebase}
                                    onCheckedChange={(checked) => setData('enable_firebase', checked)}
                                />
                            </div>

                            {data.enable_firebase && (
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label>{t('Allow Custom Firebase Config')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('Users can configure their own Firebase project')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.allow_user_firebase_config}
                                        onCheckedChange={(checked) => setData('allow_user_firebase_config', checked)}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* File Storage */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <HardDrive className="h-4 w-4" />
                                {t('File Storage')}
                            </CardTitle>
                            <CardDescription>
                                {t('Configure file storage limits for projects')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>{t('Enable File Storage')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Allow projects to upload and store files')}
                                    </p>
                                </div>
                                <Switch
                                    checked={data.enable_file_storage}
                                    onCheckedChange={(checked) => setData('enable_file_storage', checked)}
                                />
                            </div>

                            {data.enable_file_storage && (
                                <>
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label>{t('Unlimited Storage')}</Label>
                                            <p className="text-sm text-muted-foreground">
                                                {t('Allow unlimited file storage per project')}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={data.max_storage_mb === null}
                                            onCheckedChange={(checked) => {
                                                setData('max_storage_mb', checked ? null : 100);
                                            }}
                                        />
                                    </div>

                                    {data.max_storage_mb !== null && (
                                        <div className="space-y-2">
                                            <Label htmlFor="max_storage_mb">{t('Maximum Storage (MB)')}</Label>
                                            <Input
                                                id="max_storage_mb"
                                                type="number"
                                                min="0"
                                                placeholder="100"
                                                value={data.max_storage_mb}
                                                onChange={(e) => setData('max_storage_mb', parseInt(e.target.value) || 0)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t('Total storage limit per project in megabytes')}
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="max_file_size_mb">{t('Maximum File Size (MB)')}</Label>
                                        <Input
                                            id="max_file_size_mb"
                                            type="number"
                                            min="1"
                                            max="500"
                                            placeholder="10"
                                            value={data.max_file_size_mb}
                                            onChange={(e) => setData('max_file_size_mb', parseInt(e.target.value) || 10)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t('Maximum size for individual file uploads')}
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Features */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Features')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FeatureManager
                                features={data.features}
                                onChange={(features) => setData('features', features)}
                                error={errors.features}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                    {t('Cancel')}
                </Button>
                <Button type="submit" disabled={processing}>
                    {processing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    {isEdit ? t('Save Changes') : t('Create Plan')}
                </Button>
            </div>
        </form>
    );
}
