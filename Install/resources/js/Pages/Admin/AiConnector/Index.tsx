import { useState } from 'react';
import { router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Check, Clock, Pencil, Plug, Plus, X } from 'lucide-react';
import type { PageProps } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';

type PricingType = 'one_time' | 'monthly' | 'yearly';

interface AiConnectorModule {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    pricing_type: PricingType;
    // Laravel serialises decimal:2 casts as strings ("10.00"), so every money
    // field has to be treated as number | string on the way in.
    price: number | string;
    is_active: boolean;
    active_count: number;
}

interface Activation {
    id: number;
    status: 'active' | 'pending' | 'expired' | 'cancelled';
    amount: number | string;
    payment_method: string | null;
    requires_approval: boolean;
    project: { id: string; name: string } | null;
    user: { id: number; name: string; email: string } | null;
    module: { id: number; name: string } | null;
    renewal_at: string | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}

interface AiConnectorPageProps extends PageProps {
    modules: AiConnectorModule[];
    activations: Paginated<Activation>;
    filters: { status?: string };
    stats: {
        active_projects: number;
        pending_approval: number;
        revenue_this_month: number | string;
    };
}

/** Formats a money value that may arrive as a number or a decimal string. */
const money = (value: number | string | null | undefined) => {
    const amount = typeof value === 'number' ? value : parseFloat(value ?? '');
    return (Number.isFinite(amount) ? amount : 0).toFixed(2);
};

const statusBadge = (status: Activation['status'], t: (s: string) => string) => {
    const map: Record<Activation['status'], { label: string; className: string }> = {
        active: { label: t('Active'), className: 'bg-success/10 text-success' },
        pending: { label: t('Pending'), className: 'bg-amber-500/10 text-amber-600' },
        expired: { label: t('Expired'), className: 'bg-muted text-muted-foreground' },
        cancelled: { label: t('Cancelled'), className: 'bg-destructive/10 text-destructive' },
    };
    const { label, className } = map[status] ?? {
        label: status ? t(String(status)) : '—',
        className: 'bg-muted text-muted-foreground',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${className}`}>{label}</span>;
};

function ModuleFormDialog({ module, trigger }: { module?: AiConnectorModule; trigger: React.ReactNode }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(module?.name ?? '');
    const [description, setDescription] = useState(module?.description ?? '');
    const [pricingType, setPricingType] = useState<PricingType>(module?.pricing_type ?? 'monthly');
    const [price, setPrice] = useState(module ? money(module.price) : '10');
    const [isActive, setIsActive] = useState(module?.is_active ?? true);
    const [isSaving, setIsSaving] = useState(false);

    // The dialog stays mounted between openings, so re-seed the fields from the
    // current props each time it opens instead of showing stale local state.
    const handleOpenChange = (next: boolean) => {
        if (next) {
            setName(module?.name ?? '');
            setDescription(module?.description ?? '');
            setPricingType(module?.pricing_type ?? 'monthly');
            setPrice(module ? money(module.price) : '10');
            setIsActive(module?.is_active ?? true);
        }
        setOpen(next);
    };

    const handleSave = () => {
        setIsSaving(true);
        const payload = {
            name,
            description,
            pricing_type: pricingType,
            price: parseFloat(price) || 0,
            is_active: isActive,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(module ? t('Module updated') : t('Module created'));
                setOpen(false);
            },
            onError: () => toast.error(t('Failed to save module')),
            onFinish: () => setIsSaving(false),
        };

        if (module) {
            router.put(`/admin/ai-connector/modules/${module.id}`, payload, options);
        } else {
            router.post('/admin/ai-connector/modules', payload, options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{module ? t('Edit Module') : t('New Module')}</DialogTitle>
                    <DialogDescription>
                        {t('A sellable per-project module clients can activate (e.g. "Conector IA").')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Name')}</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Conector IA" />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Description')}</Label>
                        <Textarea value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('Pricing type')}</Label>
                            <Select value={pricingType} onValueChange={(v: PricingType) => setPricingType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="one_time">{t('One-time')}</SelectItem>
                                    <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                                    <SelectItem value="yearly">{t('Yearly')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Price (USD)')}</Label>
                            <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="is-active">{t('Active (purchasable)')}</Label>
                        <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                        {t('Save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RejectDialog({ activationId }: { activationId: number }) {
    const { t } = useTranslation();
    const [reason, setReason] = useState('');

    const handleReject = () => {
        router.post(`/admin/ai-connector/activations/${activationId}/review`, {
            action: 'reject',
            notes: reason,
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Activation rejected')),
            onError: () => toast.error(t('Failed to reject activation')),
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <X className="h-4 w-4 me-1" />
                    {t('Reject')}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('Reject this activation?')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('Optionally add a reason. This does not refund anything automatically.')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Reason (optional)')} rows={3} />
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleReject}
                    >
                        {t('Reject')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function AiConnectorIndex({ auth, modules, activations, filters, stats }: AiConnectorPageProps) {
    const { t } = useTranslation();

    const handleApprove = (activationId: number) => {
        router.post(`/admin/ai-connector/activations/${activationId}/review`, {
            action: 'approve',
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Activation approved')),
            onError: () => toast.error(t('Failed to approve activation')),
        });
    };

    const handleStatusFilter = (status: string) => {
        router.get('/admin/ai-connector', status === 'all' ? {} : { status }, { preserveState: true });
    };

    return (
        <AdminLayout user={auth.user!} title={t('AI Connector')}>
            <AdminPageHeader
                title={
                    <span className="flex items-center gap-2">
                        <Plug className="h-6 w-6" />
                        {t('AI Connector')}
                    </span>
                }
                subtitle={t('Manage the sellable AI Connector module catalog and per-project activations.')}
                action={
                    <ModuleFormDialog
                        trigger={
                            <Button>
                                <Plus className="h-4 w-4 me-2" />
                                {t('New Module')}
                            </Button>
                        }
                    />
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('Active Projects')}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{stats.active_projects}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('Pending Approval')}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{stats.pending_approval}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('Revenue This Month')}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">${money(stats.revenue_this_month)}</p></CardContent>
                </Card>
            </div>

            {/* Modules */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('Module Catalog')}</CardTitle>
                    <CardDescription>{t('Pricing and availability. Default: "Conector IA", $10/month.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Pricing')}</TableHead>
                                <TableHead>{t('Active Projects')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modules.map((module) => (
                                <TableRow key={module.id}>
                                    <TableCell className="font-medium">{module.name}</TableCell>
                                    <TableCell>
                                        ${money(module.price)} / {module.pricing_type === 'one_time' ? t('one-time') : module.pricing_type === 'yearly' ? t('year') : t('month')}
                                    </TableCell>
                                    <TableCell>{module.active_count}</TableCell>
                                    <TableCell>
                                        {module.is_active ? (
                                            <Badge variant="secondary" className="bg-success/10 text-success">{t('Active')}</Badge>
                                        ) : (
                                            <Badge variant="secondary">{t('Inactive')}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ModuleFormDialog
                                            module={module}
                                            trigger={
                                                <Button variant="ghost" size="icon">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {modules.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        {t('No modules yet.')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Activations */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('Activations')}</CardTitle>
                            <CardDescription>{t('Per-project purchases, across all clients.')}</CardDescription>
                        </div>
                        <Select value={filters.status ?? 'all'} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('All statuses')}</SelectItem>
                                <SelectItem value="pending">{t('Pending')}</SelectItem>
                                <SelectItem value="active">{t('Active')}</SelectItem>
                                <SelectItem value="expired">{t('Expired')}</SelectItem>
                                <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Project')}</TableHead>
                                <TableHead>{t('Client')}</TableHead>
                                <TableHead>{t('Module')}</TableHead>
                                <TableHead>{t('Amount')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead className="text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activations.data.map((activation) => (
                                <TableRow key={activation.id}>
                                    <TableCell>{activation.project?.name ?? '—'}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">{activation.user?.name}</div>
                                        <div className="text-xs text-muted-foreground">{activation.user?.email}</div>
                                    </TableCell>
                                    <TableCell>{activation.module?.name ?? '—'}</TableCell>
                                    <TableCell>${money(activation.amount)}</TableCell>
                                    <TableCell>{statusBadge(activation.status, t)}</TableCell>
                                    <TableCell className="text-right">
                                        {activation.requires_approval ? (
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" onClick={() => handleApprove(activation.id)}>
                                                    <Check className="h-4 w-4 me-1" />
                                                    {t('Approve')}
                                                </Button>
                                                <RejectDialog activationId={activation.id} />
                                            </div>
                                        ) : activation.status === 'pending' ? (
                                            <span className="inline-flex items-center text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3 me-1" />
                                                {t('Awaiting payment')}
                                            </span>
                                        ) : null}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {activations.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        {t('No activations found.')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {activations.last_page > 1 && (
                        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                            <span>{t('Page :current of :last', { current: activations.current_page, last: activations.last_page })}</span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={activations.current_page <= 1}
                                    onClick={() => router.get('/admin/ai-connector', { ...filters, page: activations.current_page - 1 }, { preserveState: true })}
                                >
                                    {t('Previous')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={activations.current_page >= activations.last_page}
                                    onClick={() => router.get('/admin/ai-connector', { ...filters, page: activations.current_page + 1 }, { preserveState: true })}
                                >
                                    {t('Next')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
