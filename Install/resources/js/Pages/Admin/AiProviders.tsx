import { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { ColumnDef } from '@tanstack/react-table';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { TableSkeleton, type TableColumnConfig } from '@/components/Admin/skeletons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    TableActionMenu,
    TableActionMenuTrigger,
    TableActionMenuContent,
    TableActionMenuItem,
    TableActionMenuLabel,
    TableActionMenuSeparator,
} from '@/components/ui/table-action-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    Trash2,
    Pencil,
    Zap,
    RefreshCw,
    Eye,
    EyeOff,
} from 'lucide-react';
import { User } from '@/types';
import { AiProvider, AiProviderType } from '@/types/admin';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface ModelPricing {
    input: number;
    output: number;
}

interface AiProvidersProps {
    user: User;
    providers: AiProvider[];
    providerTypes: Record<string, string>;
    defaultModels: Record<string, string[]>;
    modelPricing: Record<string, Record<string, ModelPricing>>;
    tokensPerProject: number;
}

interface ProviderFormProps {
    formData: {
        name: string;
        type: AiProviderType;
        api_key: string;
        default_model: string;
        max_tokens: number;
        summarizer_max_tokens: number;
    };
    setFormData: (data: ProviderFormProps['formData']) => void;
    providerTypes: Record<string, string>;
    defaultModels: Record<string, string[]>;
    showApiKey: boolean;
    setShowApiKey: (show: boolean) => void;
    isEdit?: boolean;
    errors?: Record<string, string>;
}

function ProviderForm({
    formData,
    setFormData,
    providerTypes,
    defaultModels,
    showApiKey,
    setShowApiKey,
    isEdit = false,
    errors = {},
}: ProviderFormProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">{t('Name')}</Label>
                <Input
                    id="name"
                    placeholder={t('My AI Provider')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{t(errors.name)}</p>
                )}
            </div>

            {!isEdit && (
                <div className="space-y-2">
                    <Label htmlFor="type">{t('Provider')}</Label>
                    <Select
                        value={formData.type}
                        onValueChange={(value: AiProviderType) => setFormData({
                            ...formData,
                            type: value,
                            default_model: defaultModels[value]?.[0] || '',
                        })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(providerTypes).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="api_key">
                    {t('API Key')} {isEdit && <span className="text-muted-foreground">({t('leave empty to keep existing')})</span>}
                </Label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            id="api_key"
                            type={showApiKey ? 'text' : 'password'}
                            placeholder={isEdit ? '••••••••••••••••' : t('Enter API key')}
                            value={formData.api_key}
                            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                            className={errors.api_key ? 'border-destructive' : ''}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                    >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                {errors.api_key && (
                    <p className="text-sm text-destructive">{t(errors.api_key)}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="default_model">{t('Model')}</Label>
                    <Select
                        value={formData.default_model}
                        onValueChange={(value) => setFormData({ ...formData, default_model: value })}
                    >
                        <SelectTrigger className={errors.default_model ? 'border-destructive' : ''}>
                            <SelectValue placeholder={t('Select model')} />
                        </SelectTrigger>
                        <SelectContent>
                            {(defaultModels[formData.type] || []).map((model) => (
                                <SelectItem key={model} value={model}>
                                    {model}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.default_model && (
                        <p className="text-sm text-destructive">{t(errors.default_model)}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="max_tokens">{t('Max Tokens')}</Label>
                    <Input
                        id="max_tokens"
                        type="number"
                        placeholder="8192"
                        value={formData.max_tokens}
                        onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="summarizer_max_tokens">{t('Summarizer Max Tokens')}</Label>
                <Input
                    id="summarizer_max_tokens"
                    type="number"
                    placeholder="500"
                    value={formData.summarizer_max_tokens}
                    onChange={(e) => setFormData({ ...formData, summarizer_max_tokens: parseInt(e.target.value) || 500 })}
                />
                <p className="text-xs text-muted-foreground">
                    {t('Maximum tokens for conversation summarization output (default: 500)')}
                </p>
            </div>
        </div>
    );
}

// Cost Estimator Component
function CostEstimator({
    type,
    model,
    modelPricing,
    tokensPerProject,
}: {
    type: AiProviderType;
    model: string;
    modelPricing: Record<string, Record<string, ModelPricing>>;
    tokensPerProject: number;
}) {
    const { t } = useTranslation();
    const pricing = modelPricing[type]?.[model] || { input: 0, output: 0 };
    const projectCounts = [100, 500, 1000];

    // Assume 60% input, 40% output tokens
    const inputRatio = 0.6;
    const outputRatio = 0.4;

    const calculateCost = (projectCount: number) => {
        const totalTokens = tokensPerProject * projectCount;
        const inputTokens = totalTokens * inputRatio;
        const outputTokens = totalTokens * outputRatio;
        const inputCost = (inputTokens / 1_000_000) * pricing.input;
        const outputCost = (outputTokens / 1_000_000) * pricing.output;
        return (inputCost + outputCost).toFixed(2);
    };

    const formatTokens = (count: number) => {
        const total = tokensPerProject * count;
        if (total >= 1_000_000_000) return `${(total / 1_000_000_000).toFixed(1)}B`;
        if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(0)}M`;
        return `${(total / 1000).toFixed(0)}K`;
    };

    if (type === 'zhipu') {
        return (
            <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">{t('Cost Estimator')}</h4>
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">{t('Subscription-based')}</span> — {t('This provider uses a z.ai subscription. No per-token costs apply.')}
                </p>
            </div>
        );
    }

    if (pricing.input === 0 && pricing.output === 0) {
        return (
            <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">{t('Cost Estimator')}</h4>
                <p className="text-sm text-muted-foreground">
                    {t('This model is')} <span className="font-semibold">{t('FREE')}</span> {t('to use!')}
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-2">{t('Cost Estimator')}</h4>
            <p className="text-xs text-muted-foreground mb-3">
                {t('Typical usage:')} ~{tokensPerProject >= 1_000_000 ? `${(tokensPerProject / 1_000_000).toFixed(1)}M` : `${(tokensPerProject / 1_000).toFixed(0)}K`} {t('tokens per project')}
            </p>
            <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2 font-medium text-muted-foreground border-b pb-1">
                    <span>{t('Projects/mo')}</span>
                    <span>{t('Tokens')}</span>
                    <span>{t('Est. Cost')}</span>
                </div>
                {projectCounts.map((count) => (
                    <div key={count} className="grid grid-cols-3 gap-2">
                        <span>{count.toLocaleString()}</span>
                        <span>{formatTokens(count)}</span>
                        <span className="font-medium">${calculateCost(count)}</span>
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
                {t('Pricing:')} ${pricing.input}/{t('MTok input')}, ${pricing.output}/{t('MTok output')}
            </p>
        </div>
    );
}

// Skeleton column configuration for AI Providers table
const skeletonColumns: TableColumnConfig[] = [
    { type: 'text', width: 'w-32' },          // Name
    { type: 'badge', width: 'w-20' },         // Type
    { type: 'status', width: 'w-24' },        // Status
    { type: 'badge', width: 'w-16' },         // Default
    { type: 'text', width: 'w-24' },          // Models
    { type: 'text', width: 'w-24' },          // Created
    { type: 'actions', width: 'w-12' },       // Actions
];

export default function AiProviders({ user, providers, providerTypes, defaultModels, modelPricing, tokensPerProject }: AiProvidersProps) {
    const { t } = useTranslation();
    const { isLoading } = useAdminLoading();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null);
    const [providerToDelete, setProviderToDelete] = useState<AiProvider | null>(null);
    const [isTestingConnection, setIsTestingConnection] = useState<number | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: '',
        type: 'openai' as AiProviderType,
        api_key: '',
        default_model: defaultModels['openai']?.[0] || '',
        max_tokens: 8192,
        summarizer_max_tokens: 500,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'openai',
            api_key: '',
            default_model: defaultModels['openai']?.[0] || '',
            max_tokens: 8192,
            summarizer_max_tokens: 500,
        });
        setShowApiKey(false);
        setFormErrors({});
    };

    const validateForm = (isEdit: boolean) => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) {
            errors.name = t('Name is required');
        }
        if (!isEdit && !formData.api_key.trim()) {
            errors.api_key = t('API key is required');
        }
        if (!formData.default_model) {
            errors.default_model = t('Default model is required');
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAdd = () => {
        if (!validateForm(false)) {
            return;
        }
        router.post(route('admin.ai-providers.store'), formData, {
            onSuccess: () => {
                setIsAddDialogOpen(false);
                resetForm();
                toast.success(t('AI provider added successfully'));
            },
            onError: (errors) => {
                setFormErrors(errors as Record<string, string>);
                toast.error(Object.values(errors)[0] as string);
            },
        });
    };

    const handleEdit = () => {
        if (!selectedProvider) return;
        if (!validateForm(true)) {
            return;
        }
        router.put(route('admin.ai-providers.update', selectedProvider.id), formData, {
            onSuccess: () => {
                setIsEditDialogOpen(false);
                setSelectedProvider(null);
                resetForm();
                toast.success(t('AI provider updated successfully'));
            },
            onError: (errors) => {
                setFormErrors(errors as Record<string, string>);
                toast.error(Object.values(errors)[0] as string);
            },
        });
    };

    const handleDelete = (provider: AiProvider) => {
        if (provider.plans_count && provider.plans_count > 0) {
            toast.error(t('Cannot delete: Provider is assigned to {{count}} plan(s)', { count: provider.plans_count }));
            return;
        }
        setProviderToDelete(provider);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!providerToDelete) return;
        router.delete(route('admin.ai-providers.destroy', providerToDelete.id), {
            onSuccess: () => {
                toast.success(t('AI provider deleted'));
                setIsDeleteDialogOpen(false);
                setProviderToDelete(null);
            },
            onError: (errors) => toast.error(Object.values(errors)[0] as string),
        });
    };

    const handleToggleStatus = (provider: AiProvider) => {
        router.put(route('admin.ai-providers.update', provider.id), {
            status: provider.status === 'active' ? 'inactive' : 'active',
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Status updated')),
        });
    };

    const handleTestConnection = async (provider: AiProvider) => {
        setIsTestingConnection(provider.id);
        try {
            const response = await axios.post(route('admin.ai-providers.test', provider.id));
            toast.success(response.data.message || t('Connection successful'));
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
            toast.error(message || t('Connection failed'));
        } finally {
            setIsTestingConnection(null);
        }
    };

    const openEditDialog = (provider: AiProvider) => {
        setSelectedProvider(provider);
        setFormData({
            name: provider.name,
            type: provider.type,
            api_key: '', // Don't expose existing key
            default_model: provider.config?.default_model || '',
            max_tokens: provider.config?.max_tokens || 8192,
            summarizer_max_tokens: provider.config?.summarizer_max_tokens || 500,
        });
        setShowApiKey(false);
        setIsEditDialogOpen(true);
    };

    const columns: ColumnDef<AiProvider>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Name')} />
            ),
            cell: ({ row }) => {
                const provider = row.original;
                return (
                    <div>
                        <span className="font-medium">{provider.name}</span>
                        <div>
                            <span className="text-xs text-muted-foreground">{provider.type_label}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Status')} />
            ),
            cell: ({ row }) => {
                const provider = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={provider.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(provider)}
                        />
                        <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                            {provider.status === 'active' ? t('active') : t('inactive')}
                        </Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: 'config.default_model',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Model')} />
            ),
            cell: ({ row }) => {
                const provider = row.original;
                const model = provider.config?.default_model || provider.available_models?.[0] || '-';
                return <span className="font-mono text-sm">{model}</span>;
            },
        },
        {
            accessorKey: 'config.max_tokens',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Max Tokens')} />
            ),
            cell: ({ row }) => {
                const maxTokens = row.original.config?.max_tokens;
                return maxTokens ? maxTokens.toLocaleString() : '-';
            },
        },
        {
            accessorKey: 'plans_count',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Plans')} />
            ),
            cell: ({ row }) => row.original.plans_count || 0,
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const provider = row.original;
                return (
                    <TableActionMenu>
                        <TableActionMenuTrigger />
                        <TableActionMenuContent>
                            <TableActionMenuLabel>{t('Actions')}</TableActionMenuLabel>
                            <TableActionMenuItem
                                onClick={() => handleTestConnection(provider)}
                                disabled={isTestingConnection === provider.id || !provider.has_credentials}
                            >
                                {isTestingConnection === provider.id ? (
                                    <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Zap className="me-2 h-4 w-4" />
                                )}
                                {t('Test Connection')}
                            </TableActionMenuItem>
                            <TableActionMenuItem onClick={() => openEditDialog(provider)}>
                                <Pencil className="me-2 h-4 w-4" />
                                {t('Edit')}
                            </TableActionMenuItem>
                            <TableActionMenuSeparator />
                            <TableActionMenuItem
                                variant="destructive"
                                onClick={() => handleDelete(provider)}
                            >
                                <Trash2 className="me-2 h-4 w-4" />
                                {t('Delete')}
                            </TableActionMenuItem>
                        </TableActionMenuContent>
                    </TableActionMenu>
                );
            },
        },
    ];

    return (
        <AdminLayout user={user} title={t('AI Providers')}>
            <AdminPageHeader
                title={t('AI Providers')}
                subtitle={t('Manage AI provider configurations')}
                action={
                    <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                        setIsAddDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 me-2" />
                                {t('Add Provider')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('Add AI Provider')}</DialogTitle>
                                <DialogDescription>
                                    {t('Add a new AI provider configuration')}
                                </DialogDescription>
                            </DialogHeader>
                            <ProviderForm
                                formData={formData}
                                setFormData={setFormData}
                                providerTypes={providerTypes}
                                defaultModels={defaultModels}
                                showApiKey={showApiKey}
                                setShowApiKey={setShowApiKey}
                                errors={formErrors}
                            />
                            {formData.default_model && (
                                <CostEstimator
                                    type={formData.type}
                                    model={formData.default_model}
                                    modelPricing={modelPricing}
                                    tokensPerProject={tokensPerProject}
                                />
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button onClick={handleAdd}>{t('Add Provider')}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            {isLoading ? (
                <TableSkeleton
                    columns={skeletonColumns}
                    rows={5}
                    showSearch
                />
            ) : (
                <DataTable
                    columns={columns}
                    data={providers}
                    searchKey="name"
                    searchPlaceholder={t('Search providers...')}
                />
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) {
                    setSelectedProvider(null);
                    resetForm();
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Edit AI Provider')}</DialogTitle>
                        <DialogDescription>
                            {t('Update AI provider configuration')}
                        </DialogDescription>
                    </DialogHeader>
                    <ProviderForm
                        formData={formData}
                        setFormData={setFormData}
                        providerTypes={providerTypes}
                        defaultModels={defaultModels}
                        showApiKey={showApiKey}
                        setShowApiKey={setShowApiKey}
                        isEdit
                        errors={formErrors}
                    />
                    {formData.default_model && (
                        <CostEstimator
                            type={formData.type}
                            model={formData.default_model}
                            modelPricing={modelPricing}
                            tokensPerProject={tokensPerProject}
                        />
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleEdit}>{t('Save Changes')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) setProviderToDelete(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Are you sure you want to delete this AI provider?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('This action cannot be undone. This will permanently delete the AI provider configuration.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className={buttonVariants({ variant: 'destructive' })}
                        >
                            {t('Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
