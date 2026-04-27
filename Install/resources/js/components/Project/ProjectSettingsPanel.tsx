import { useState, useEffect, useCallback, FormEvent, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
    Check,
    Copy,
    Database,
    Eye,
    EyeOff,
    Globe,
    HardDrive,
    ImagePlus,
    Key,
    Loader2,
    Lock,
    RefreshCw,
    Settings2,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { FirebaseConfig } from './FirebaseConfig';
import { CustomDomainCard } from './CustomDomainCard';
import type { FirebaseConfig as FirebaseConfigType } from '@/types/storage';
import { useTranslation } from '@/contexts/LanguageContext';

interface SubdomainUsage {
    used: number;
    limit: number | null;
    unlimited: boolean;
    remaining: number;
}

interface FirebaseSettings {
    enabled: boolean;
    canUseOwnConfig: boolean;
    usesSystemFirebase: boolean;
    customConfig: FirebaseConfigType | null;
    systemConfigured: boolean;
    collectionPrefix: string;
    adminSdkConfigured: boolean;
    adminSdkStatus: {
        configured: boolean;
        is_system: boolean;
        project_id: string | null;
        client_email: string | null;
    };
}

interface StorageSettings {
    enabled: boolean;
    usedBytes: number;
    limitMb: number | null;
    unlimited: boolean;
}

interface CustomDomainUsage {
    used: number;
    limit: number | null;
    unlimited: boolean;
    remaining: number;
}

export interface CustomDomainSettings {
    enabled: boolean;
    canCreateMore: boolean;
    usage: CustomDomainUsage;
    baseDomain: string | null;
}

interface ProjectSettingsPanelProps {
    project: {
        id: string;
        name: string;
        subdomain: string | null;
        published_title: string | null;
        published_description: string | null;
        published_visibility: string;
        share_image: string | null;
        custom_instructions: string | null;
        api_token?: string | null;
        custom_domain?: string | null;
        custom_domain_verified?: boolean;
        custom_domain_ssl_status?: string | null;
    };
    baseDomain: string;
    canUseSubdomains: boolean;
    canCreateMoreSubdomains: boolean;
    canUsePrivateVisibility: boolean;
    subdomainUsage: SubdomainUsage;
    suggestedSubdomain: string;
    firebase?: FirebaseSettings;
    storage?: StorageSettings;
    customDomain?: CustomDomainSettings;
    subdomainsGloballyEnabled?: boolean;
    customDomainsGloballyEnabled?: boolean;
}

type SettingsTab = 'general' | 'domains' | 'knowledge' | 'storage' | 'database';
export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid';

export function ProjectSettingsPanel({
    project,
    baseDomain,
    canUseSubdomains,
    canCreateMoreSubdomains,
    canUsePrivateVisibility,
    subdomainUsage,
    suggestedSubdomain,
    firebase,
    storage,
    customDomain,
    subdomainsGloballyEnabled = false,
    customDomainsGloballyEnabled = false,
}: ProjectSettingsPanelProps) {
    const { t } = useTranslation();

    // Dynamic tab configuration based on global settings
    const tabConfig = useMemo(() => {
        const tabs: Array<{ key: SettingsTab; labelKey: string; icon: typeof Settings2 }> = [
            { key: 'general', labelKey: 'General', icon: Settings2 },
        ];

        // Only show domains tab if at least one domain feature is globally enabled
        if (subdomainsGloballyEnabled || customDomainsGloballyEnabled) {
            tabs.push({ key: 'domains', labelKey: 'Domains', icon: Globe });
        }

        tabs.push(
            { key: 'knowledge', labelKey: 'Knowledge', icon: Sparkles },
            { key: 'storage', labelKey: 'Storage', icon: HardDrive },
            { key: 'database', labelKey: 'Database', icon: Database }
        );

        return tabs;
    }, [subdomainsGloballyEnabled, customDomainsGloballyEnabled]);

    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    // API Token state
    const [apiToken, setApiToken] = useState<string | null>(project.api_token ?? null);
    const [isGeneratingToken, setIsGeneratingToken] = useState(false);
    const [isRevokingToken, setIsRevokingToken] = useState(false);
    const [showToken, setShowToken] = useState(false);

    // General tab state
    const [title, setTitle] = useState(project.published_title || project.name);
    const [description, setDescription] = useState(project.published_description || '');
    const [visibility, setVisibility] = useState<'public' | 'private'>(
        (project.published_visibility as 'public' | 'private') || 'public'
    );
    const [isSavingGeneral, setIsSavingGeneral] = useState(false);

    // Domains tab state - subdomain
    const [subdomain, setSubdomain] = useState(project.subdomain || suggestedSubdomain);
    const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('idle');
    const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);

    // Knowledge tab state
    const [customInstructions, setCustomInstructions] = useState(project.custom_instructions || '');
    const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

    // Share image state
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isDeletingImage, setIsDeletingImage] = useState(false);

    const isPublished = project.subdomain !== null;
    const canPublish = canUseSubdomains && (isPublished || canCreateMoreSubdomains);

    // Debounced availability check
    const checkAvailability = useCallback(async (value: string) => {
        if (value.length < 3) {
            setAvailabilityStatus('invalid');
            setAvailabilityErrors([t('Subdomain must be at least 3 characters.')]);
            return;
        }

        setAvailabilityStatus('checking');

        try {
            const response = await axios.post('/api/subdomain/check-availability', {
                subdomain: value,
                project_id: project.id,
            });

            if (response.data.available) {
                setAvailabilityStatus('available');
                setAvailabilityErrors([]);
            } else {
                setAvailabilityStatus('unavailable');
                setAvailabilityErrors(response.data.errors || [t('Subdomain is not available.')]);
            }
        } catch {
            setAvailabilityStatus('idle');
        }
    }, [project.id, t]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (subdomain && subdomain.length >= 3) {
                checkAvailability(subdomain);
            } else if (subdomain.length > 0) {
                setAvailabilityStatus('invalid');
                setAvailabilityErrors([t('Subdomain must be at least 3 characters.')]);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [subdomain, checkAvailability, t]);

    const handleSaveGeneral = async (e: FormEvent) => {
        e.preventDefault();
        setIsSavingGeneral(true);

        router.put(`/project/${project.id}/settings/general`, {
            published_title: title,
            published_description: description,
            published_visibility: visibility,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Settings saved'));
            },
            onError: () => {
                toast.error(t('Failed to save settings'));
            },
            onFinish: () => {
                setIsSavingGeneral(false);
            },
        });
    };

    const handlePublish = async () => {
        setIsPublishing(true);

        try {
            const response = await axios.post(`/project/${project.id}/publish`, {
                subdomain,
                title: title || project.name,
                description,
                visibility,
            });

            if (response.data.success) {
                toast.success(isPublished ? t('Project updated') : t('Project published!'));
                router.reload();
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || t('Failed to publish'));
        } finally {
            setIsPublishing(false);
        }
    };

    const handleUnpublish = async () => {
        setIsPublishing(true);

        try {
            await axios.post(`/project/${project.id}/unpublish`);
            toast.success(t('Project unpublished'));
            router.reload();
        } catch {
            toast.error(t('Failed to unpublish'));
        } finally {
            setIsPublishing(false);
        }
    };

    const handleSaveKnowledge = async (e: FormEvent) => {
        e.preventDefault();
        setIsSavingKnowledge(true);

        router.put(`/project/${project.id}/settings/knowledge`, {
            custom_instructions: customInstructions,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Custom instructions saved'));
            },
            onError: () => {
                toast.error(t('Failed to save custom instructions'));
            },
            onFinish: () => {
                setIsSavingKnowledge(false);
            },
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('share_image', file);

        router.post(`/project/${project.id}/settings/share-image`, formData, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Share image uploaded'));
            },
            onError: () => {
                toast.error(t('Failed to upload image'));
            },
            onFinish: () => {
                setIsUploadingImage(false);
            },
        });
    };

    const handleDeleteImage = async () => {
        setIsDeletingImage(true);

        router.delete(`/project/${project.id}/settings/share-image`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Share image removed'));
            },
            onError: () => {
                toast.error(t('Failed to remove image'));
            },
            onFinish: () => {
                setIsDeletingImage(false);
            },
        });
    };

    const getAvailabilityIcon = () => {
        switch (availabilityStatus) {
            case 'checking':
                return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
            case 'available':
                return <Check className="h-4 w-4 text-success" />;
            case 'unavailable':
            case 'invalid':
                return <X className="h-4 w-4 text-destructive" />;
            default:
                return null;
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <form onSubmit={handleSaveGeneral}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('General Settings')}</CardTitle>
                                <CardDescription>
                                    {t('Configure how your project appears when shared.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">{t('Title')}</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={t('My Awesome Project')}
                                        maxLength={255}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="description">{t('Description')}</Label>
                                        <span className="text-xs text-muted-foreground">
                                            {description.length}/150
                                        </span>
                                    </div>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value.slice(0, 150))}
                                        placeholder={t('A brief description of your project')}
                                        rows={3}
                                        maxLength={150}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="visibility">{t('Visibility')}</Label>
                                    <Select
                                        value={visibility}
                                        onValueChange={(value: 'public' | 'private') => setVisibility(value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="public">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4" />
                                                    <span>{t('Public')}</span>
                                                </div>
                                            </SelectItem>
                                            {canUsePrivateVisibility ? (
                                                <SelectItem value="private">
                                                    <div className="flex items-center gap-2">
                                                        <EyeOff className="h-4 w-4" />
                                                        <span>{t('Private')}</span>
                                                    </div>
                                                </SelectItem>
                                            ) : (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="relative flex cursor-not-allowed select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                                                            <div className="flex items-center gap-2">
                                                                <EyeOff className="h-4 w-4" />
                                                                <span>{t('Private')}</span>
                                                                <Lock className="h-3 w-3 ms-1" />
                                                            </div>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t('Upgrade to unlock private visibility')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {visibility === 'public'
                                            ? t('Anyone with the link can view your project.')
                                            : t('Only you can view your project.')}
                                    </p>
                                </div>

                                {/* Share Image */}
                                <div className="space-y-2">
                                    <Label>{t('Share Image')}</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {t('This image will be shown when your project is shared on social media.')}
                                    </p>

                                    {project.share_image ? (
                                        <div className="relative group w-full aspect-[1200/630] rounded-lg border overflow-hidden bg-muted">
                                            <img
                                                src={`/storage/${project.share_image}`}
                                                alt="Share preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={handleDeleteImage}
                                                    disabled={isDeletingImage}
                                                >
                                                    {isDeletingImage ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                    <span className="ms-1">{t('Remove')}</span>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full aspect-[1200/630] rounded-lg border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer bg-muted/50">
                                            <div className="flex flex-col items-center justify-center py-6">
                                                {isUploadingImage ? (
                                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                                ) : (
                                                    <>
                                                        <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                                                        <p className="text-sm text-muted-foreground">
                                                            {t('Click to upload (1200x630 recommended)')}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleImageUpload}
                                                disabled={isUploadingImage}
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isSavingGeneral}>
                                        {isSavingGeneral && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                        {t('Save Changes')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                );

            case 'domains':
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Globe className="h-5 w-5" />
                                            {t('Subdomain')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t('Publish your project to a custom subdomain.')}
                                        </CardDescription>
                                    </div>
                                    {isPublished && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-success/10 text-success">
                                            <Check className="h-3 w-3 me-1" />
                                            {t('Published')}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!canUseSubdomains ? (
                                    <div className="rounded-lg border p-4 text-center">
                                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {t('Subdomain publishing is not available on your current plan.')}
                                        </p>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href="/billing/plans">{t('View Plans')}</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="subdomain">{t('Subdomain')}</Label>
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        id="subdomain"
                                                        value={subdomain}
                                                        onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                        placeholder="my-project"
                                                        className="pe-8"
                                                    />
                                                    <div className="absolute end-2 top-1/2 -translate-y-1/2">
                                                        {getAvailabilityIcon()}
                                                    </div>
                                                </div>
                                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                    .{baseDomain}
                                                </span>
                                            </div>
                                            {availabilityErrors.length > 0 && availabilityStatus !== 'available' && (
                                                <p className="text-xs text-destructive">{availabilityErrors[0]}</p>
                                            )}
                                            {availabilityStatus === 'available' && (
                                                <p className="text-xs text-success">{t('This subdomain is available!')}</p>
                                            )}
                                        </div>

                                        {isPublished && (
                                            <div className="rounded-lg border p-3 bg-muted/50">
                                                <p className="text-sm text-muted-foreground">
                                                    {t('Your project is live at:')}{' '}
                                                    <a
                                                        href={`https://${project.subdomain}.${baseDomain}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                    >
                                                        {project.subdomain}.{baseDomain}
                                                    </a>
                                                </p>
                                            </div>
                                        )}

                                        {!subdomainUsage.unlimited && subdomainUsage.limit && (
                                            <p className="text-xs text-muted-foreground">
                                                {t('Subdomain usage: :used / :limit', { used: subdomainUsage.used, limit: subdomainUsage.limit })}
                                            </p>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handlePublish}
                                                disabled={
                                                    isPublishing ||
                                                    !canPublish ||
                                                    availabilityStatus === 'checking' ||
                                                    availabilityStatus === 'unavailable' ||
                                                    availabilityStatus === 'invalid'
                                                }
                                            >
                                                {isPublishing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                                {isPublished ? t('Update Subdomain') : t('Publish')}
                                            </Button>
                                            {isPublished && (
                                                <Button
                                                    variant="outline"
                                                    onClick={handleUnpublish}
                                                    disabled={isPublishing}
                                                >
                                                    {t('Unpublish')}
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Custom Domain Card */}
                        {customDomain && (
                            <CustomDomainCard project={project} customDomain={customDomain} />
                        )}
                    </div>
                );

            case 'knowledge':
                return (
                    <form onSubmit={handleSaveKnowledge}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5" />
                                    {t('Custom Instructions')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Guide the AI when building your project. These instructions will be included in every conversation with the AI.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="custom_instructions">{t('Instructions')}</Label>
                                        <span className="text-xs text-muted-foreground">
                                            {customInstructions.length}/500
                                        </span>
                                    </div>
                                    <Textarea
                                        id="custom_instructions"
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value.slice(0, 500))}
                                        placeholder="E.g., Use a modern minimalist design style. Focus on accessibility. Use TypeScript for all code."
                                        rows={6}
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('Be concise and specific. These instructions help the AI understand your preferences and requirements.')}
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isSavingKnowledge}>
                                        {isSavingKnowledge && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                        {t('Save Instructions')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                );

            case 'storage':
                return (
                    <div className="space-y-6">
                        {/* API Token Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    {t('API Token')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Generate an API token for your generated app to upload files and access data.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {apiToken ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label>{t('Current Token')}</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={showToken ? apiToken : '••••••••••••••••••••••••••••••••'}
                                                    readOnly
                                                    className="font-mono text-sm"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setShowToken(!showToken)}
                                                >
                                                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(apiToken);
                                                        toast.success(t('Token copied to clipboard'));
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {t('Use this token in your app\'s X-Project-Token header.')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" disabled={isGeneratingToken}>
                                                        <RefreshCw className="h-4 w-4 me-2" />
                                                        {t('Regenerate')}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t('Regenerate API Token?')}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t('This will invalidate the current token. Any apps using the old token will need to be updated.')}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={async () => {
                                                                setIsGeneratingToken(true);
                                                                try {
                                                                    const response = await axios.post(`/project/${project.id}/api-token/regenerate`);
                                                                    setApiToken(response.data.token);
                                                                    setShowToken(true);
                                                                    toast.success(t('API token regenerated'));
                                                                } catch {
                                                                    toast.error(t('Failed to regenerate token'));
                                                                } finally {
                                                                    setIsGeneratingToken(false);
                                                                }
                                                            }}
                                                        >
                                                            {t('Regenerate')}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" disabled={isRevokingToken}>
                                                        <Trash2 className="h-4 w-4 me-2" />
                                                        {t('Revoke')}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t('Revoke API Token?')}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t('This will immediately revoke the token. Any apps using this token will lose access.')}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={async () => {
                                                                setIsRevokingToken(true);
                                                                try {
                                                                    await axios.delete(`/project/${project.id}/api-token`);
                                                                    setApiToken(null);
                                                                    toast.success(t('API token revoked'));
                                                                } catch {
                                                                    toast.error(t('Failed to revoke token'));
                                                                } finally {
                                                                    setIsRevokingToken(false);
                                                                }
                                                            }}
                                                        >
                                                            {t('Revoke')}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                                        <Key className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {t('No API token generated yet')}
                                        </p>
                                        <Button
                                            onClick={async () => {
                                                setIsGeneratingToken(true);
                                                try {
                                                    const response = await axios.post(`/project/${project.id}/api-token`);
                                                    setApiToken(response.data.token);
                                                    setShowToken(true);
                                                    toast.success(t('API token generated'));
                                                } catch {
                                                    toast.error(t('Failed to generate token'));
                                                } finally {
                                                    setIsGeneratingToken(false);
                                                }
                                            }}
                                            disabled={isGeneratingToken}
                                        >
                                            {isGeneratingToken && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                            {t('Generate API Token')}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Storage Usage Card */}
                        {storage?.enabled && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <HardDrive className="h-5 w-5" />
                                        {t('File Storage')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t('Storage usage for this project.')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>{t('Used:')} {formatBytes(storage.usedBytes)}</span>
                                            <span>
                                                {storage.unlimited ? (
                                                    <Badge variant="secondary">{t('Unlimited')}</Badge>
                                                ) : (
                                                    t(':total MB total', { total: storage.limitMb ?? 0 })
                                                )}
                                            </span>
                                        </div>
                                        {!storage.unlimited && storage.limitMb && (
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{
                                                        width: `${Math.min(100, (storage.usedBytes / (storage.limitMb * 1024 * 1024)) * 100)}%`,
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {t('Files uploaded via dashboard or generated app count toward the same quota.')}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    </div>
                );

            case 'database':
                return (
                    <div className="space-y-6">
                        {firebase ? (
                            <FirebaseConfig
                                projectId={project.id}
                                firebaseEnabled={firebase.enabled}
                                canUseOwnConfig={firebase.canUseOwnConfig}
                                usesSystemFirebase={firebase.usesSystemFirebase}
                                customConfig={firebase.customConfig}
                                systemConfigured={firebase.systemConfigured}
                                collectionPrefix={firebase.collectionPrefix}
                                adminSdkStatus={firebase.adminSdkStatus}
                            />
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Database className="h-5 w-5" />
                                        {t('Firebase Database')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t('Configure Firebase Firestore for your generated app.')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                                        <Database className="h-10 w-10 text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            {t('Firebase Firestore is not available on your current plan.')}
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-4" asChild>
                                            <Link href="/billing/plans">{t('View Plans')}</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    // Helper function to format bytes
    function formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                {/* Tab Navigation - horizontal pills */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
                    {tabConfig.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            type="button"
                            className={cn(
                                'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                                activeTab === tab.key
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {t(tab.labelKey)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {renderContent()}
            </div>
        </ScrollArea>
    );
}
