import { Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { CardGridSkeleton } from '@/components/Admin/skeletons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, Check, X, Users, Star, CreditCard, Bot, Server, GripVertical } from 'lucide-react';
import type { PageProps } from '@/types';
import { toast } from 'sonner';
import { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PlanFeature {
    name: string;
    included: boolean;
}

interface Plan {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    billing_period: 'monthly' | 'yearly' | 'lifetime';
    features: PlanFeature[] | string[];
    is_active: boolean;
    is_popular: boolean;
    sort_order: number;
    active_subscribers_count?: number;
    ai_provider_description?: string;
    builder_description?: string;
    max_projects: number | null;
    monthly_build_credits: number | null;
    allow_user_ai_api_key: boolean;
    // Subdomain settings
    enable_subdomains: boolean;
    max_subdomains_per_user: number | null;
    allow_private_visibility: boolean;
    // Custom domain settings
    enable_custom_domains: boolean;
    max_custom_domains_per_user: number | null;
}

interface PlansPageProps extends PageProps {
    plans: Plan[];
    stats: {
        total_plans: number;
        active_plans: number;
        total_subscribers: number;
    };
    filters: {
        search?: string;
        status?: string;
    };
}

const formatCurrency = (amount: number, locale: string) => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

// Sortable Plan Card Component
interface SortablePlanCardProps {
    plan: Plan;
    onDelete: (plan: Plan) => void;
    onToggleStatus: (plan: Plan) => void;
    renderFeatures: (plan: Plan) => React.ReactNode;
    t: (key: string, replacements?: Record<string, string | number>) => string;
    locale: string;
}

function SortablePlanCard({ plan, onDelete, onToggleStatus, renderFeatures, t, locale }: SortablePlanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: plan.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const billingPeriodLabels: Record<string, string> = {
        monthly: t('Monthly'),
        yearly: t('Yearly'),
        lifetime: t('Lifetime'),
    };

    const billingPeriodShort: Record<string, string> = {
        monthly: t('/mo'),
        yearly: t('/yr'),
        lifetime: '',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card
                className={`flex flex-col ${!plan.is_active ? 'opacity-60' : ''} ${plan.is_popular ? 'ring-2 ring-primary' : ''} ${isDragging ? 'shadow-lg' : ''}`}
            >
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <button
                                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                    {...attributes}
                                    {...listeners}
                                >
                                    <GripVertical className="h-5 w-5" />
                                </button>
                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                                {plan.is_popular && (
                                    <Star className="h-4 w-4 fill-primary text-primary" />
                                )}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="capitalize">
                                    {billingPeriodLabels[plan.billing_period]}
                                </Badge>
                                {!plan.is_active && <Badge variant="secondary">{t('Inactive')}</Badge>}
                            </div>
                        </div>
                    </div>
                    {plan.description && (
                        <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    )}
                    <div className="mt-4">
                        <span className="text-3xl font-bold">{formatCurrency(plan.price, locale)}</span>
                        <span className="text-muted-foreground">
                            {billingPeriodShort[plan.billing_period]}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <ul className="space-y-2">{renderFeatures(plan)}</ul>
                    <div className="mt-4 pt-4 border-t space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {t(':count active subscribers', { count: plan.active_subscribers_count || 0 })}
                        </p>
                        {plan.ai_provider_description && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Bot className="h-3 w-3" />
                                {plan.ai_provider_description}
                            </p>
                        )}
                        {plan.builder_description && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Server className="h-3 w-3" />
                                {plan.builder_description}
                            </p>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/admin/plans/${plan.id}/edit`}>
                            <Pencil className="h-4 w-4 me-1" />
                            {t('Edit')}
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStatus(plan)}
                    >
                        {plan.is_active ? t('Deactivate') : t('Activate')}
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(plan)}
                        disabled={(plan.active_subscribers_count || 0) > 0}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function Index({ auth, plans }: PlansPageProps) {
    const { t, locale } = useTranslation();
    const { isLoading } = useAdminLoading();
    const [planItems, setPlanItems] = useState<Plan[]>(plans);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setPlanItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);

                // Update sort orders and send to server
                const updatedPlans = newItems.map((plan, index) => ({
                    id: plan.id,
                    sort_order: index,
                }));

                // Use fetch instead of Inertia router for JSON API endpoint
                fetch(route('admin.plans.reorder'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({ plans: updatedPlans }),
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Failed to reorder plans');
                        }
                        return response.json();
                    })
                    .then((data) => {
                        if (!data.success) {
                            throw new Error('Failed to reorder plans');
                        }
                        toast.success(t('Plans reordered'));
                    })
                    .catch(() => {
                        toast.error(t('Failed to reorder plans'));
                        setPlanItems(items); // Revert on error
                    });

                return newItems;
            });
        }
    };

    const handleDelete = (plan: Plan) => {
        if ((plan.active_subscribers_count || 0) > 0) {
            toast.error(t('Cannot delete a plan with active subscribers'));
            return;
        }
        setPlanToDelete(plan);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!planToDelete) return;
        router.delete(route('admin.plans.destroy', planToDelete.id), {
            onSuccess: () => {
                toast.success(t('Plan deleted'));
                setPlanItems((items) => items.filter((item) => item.id !== planToDelete.id));
                setIsDeleteDialogOpen(false);
                setPlanToDelete(null);
            },
            onError: (errors) => {
                const message = Object.values(errors)[0] as string;
                toast.error(message || t('Failed to delete plan'));
            },
        });
    };

    const handleToggleStatus = (plan: Plan) => {
        router.post(
            route('admin.plans.toggle-status', plan.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(plan.is_active ? t('Plan deactivated') : t('Plan activated'));
                    setPlanItems((items) =>
                        items.map((item) =>
                            item.id === plan.id
                                ? { ...item, is_active: !item.is_active }
                                : item
                        )
                    );
                },
            }
        );
    };

    // Helper to format credits
    const formatCredits = (credits: number): string => {
        if (credits === -1) return t('Unlimited');
        if (credits >= 1_000_000) return `${(credits / 1_000_000).toFixed(0)}M`;
        if (credits >= 1_000) return `${(credits / 1_000).toFixed(0)}K`;
        return credits.toString();
    };

    // Helper to render features (handles both old string[] and new object[] format)
    const renderFeatures = (plan: Plan) => {
        const items: React.ReactNode[] = [];

        // Project limit
        items.push(
            <li key="projects" className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-success flex-shrink-0" />
                {plan.max_projects === null
                    ? t('Unlimited projects')
                    : t(':count projects', { count: plan.max_projects })}
            </li>
        );

        // Build credits
        items.push(
            <li key="credits" className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-success flex-shrink-0" />
                {t(':credits AI credits/month', { credits: formatCredits(plan.monthly_build_credits ?? 0) })}
            </li>
        );

        // API key allowance
        if (plan.allow_user_ai_api_key) {
            items.push(
                <li key="apikey" className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                    {t('Use your own API key')}
                </li>
            );
        }

        // Custom subdomains
        if (plan.enable_subdomains) {
            const subdomainText = plan.max_subdomains_per_user === null
                ? t('Unlimited custom subdomains')
                : t(':count custom subdomains', { count: plan.max_subdomains_per_user });
            items.push(
                <li key="subdomains" className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                    {subdomainText}
                </li>
            );
        } else {
            items.push(
                <li key="subdomains" className="flex items-center gap-2 text-sm">
                    <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="text-muted-foreground">{t('Custom subdomains')}</span>
                </li>
            );
        }

        // Private visibility
        if (plan.allow_private_visibility) {
            items.push(
                <li key="private-visibility" className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                    {t('Private project visibility')}
                </li>
            );
        } else {
            items.push(
                <li key="private-visibility" className="flex items-center gap-2 text-sm">
                    <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="text-muted-foreground">{t('Private project visibility')}</span>
                </li>
            );
        }

        // Custom domains
        if (plan.enable_custom_domains) {
            const domainText = plan.max_custom_domains_per_user === null
                ? t('Unlimited custom domains')
                : t(':count custom domains', { count: plan.max_custom_domains_per_user });
            items.push(
                <li key="custom-domains" className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                    {domainText}
                </li>
            );
        } else {
            items.push(
                <li key="custom-domains" className="flex items-center gap-2 text-sm">
                    <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="text-muted-foreground">{t('Custom domains')}</span>
                </li>
            );
        }

        // Custom features from JSON
        if (Array.isArray(plan.features) && plan.features.length > 0) {
            plan.features.forEach((feature, index) => {
                // Handle old string format
                if (typeof feature === 'string') {
                    items.push(
                        <li key={`custom-${index}`} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            {feature}
                        </li>
                    );
                    return;
                }

                // Handle new object format - skip empty names
                if (!feature.name?.trim()) return;

                items.push(
                    <li key={`custom-${index}`} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                            <Check className="h-4 w-4 text-success flex-shrink-0" />
                        ) : (
                            <X className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span className={!feature.included ? 'text-muted-foreground line-through' : ''}>
                            {feature.name}
                        </span>
                    </li>
                );
            });
        }

        return items;
    };

    if (isLoading) {
        return (
            <AdminLayout user={auth.user!} title={t('Plans')}>
                <AdminPageHeader
                    title={t('Plans')}
                    subtitle={t('Manage subscription plans')}
                    action={
                        <Button asChild>
                            <Link href="/admin/plans/create">
                                <Plus className="h-4 w-4 me-2" />
                                {t('Create Plan')}
                            </Link>
                        </Button>
                    }
                />
                <CardGridSkeleton count={4} columns={4} cardVariant="plan" />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={t('Plans')}>
            <AdminPageHeader
                title={t('Plans')}
                subtitle={t('Manage subscription plans')}
                action={
                    <Button asChild>
                        <Link href="/admin/plans/create">
                            <Plus className="h-4 w-4 me-2" />
                            {t('Create Plan')}
                        </Link>
                    </Button>
                }
            />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={planItems.map((plan) => plan.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {planItems.map((plan) => (
                            <SortablePlanCard
                                key={plan.id}
                                plan={plan}
                                onDelete={handleDelete}
                                onToggleStatus={handleToggleStatus}
                                renderFeatures={renderFeatures}
                                t={t}
                                locale={locale}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {planItems.length === 0 && (
                <div className="text-center py-12">
                    <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">{t('No plans yet')}</h3>
                    <p className="text-muted-foreground">
                        {t('Get started by creating your first subscription plan.')}
                    </p>
                    <Button className="mt-4" asChild>
                        <Link href="/admin/plans/create">
                            <Plus className="h-4 w-4 me-2" />
                            {t('Create Plan')}
                        </Link>
                    </Button>
                </div>
            )}
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) setPlanToDelete(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Are you sure you want to delete this plan?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('This action cannot be undone. This will permanently delete the plan.')}
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
