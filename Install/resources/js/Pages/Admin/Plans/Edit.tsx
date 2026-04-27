import { Link, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PlanForm from './Partials/PlanForm';
import type { PageProps } from '@/types';
import type { BillingPeriod } from '@/types/billing';
import { useTranslation } from '@/contexts/LanguageContext';

interface PlanFeature {
    name: string;
    included: boolean;
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

interface DomainSettings {
    subdomainsEnabled: boolean;
    customDomainsEnabled: boolean;
}

interface EditPageProps extends PageProps {
    plan: Plan;
    aiProviders: AiProvider[];
    builders: Builder[];
    domainSettings?: DomainSettings;
}

export default function Edit({ plan, aiProviders, builders, domainSettings }: EditPageProps) {
    const { auth } = usePage<EditPageProps>().props;
    const { t } = useTranslation();

    const handleCancel = () => {
        window.history.back();
    };

    // Normalize features to new format if they're in old format (string[])
    const normalizedPlan = {
        ...plan,
        features: plan.features.map((feature) => {
            if (typeof feature === 'string') {
                return { name: feature, included: true };
            }
            return feature;
        }),
    };

    return (
        <AdminLayout user={auth.user!} title={t('Edit :name Plan', { name: plan.name })}>
            <div className="flex items-center justify-between mb-6">
                <div className="prose prose-sm dark:prose-invert">
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('Edit :name Plan', { name: plan.name })}
                    </h1>
                    <p className="text-muted-foreground">{t('Update plan configuration')}</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/plans">
                        <ArrowLeft className="h-4 w-4 me-2" />
                        {t('Back')}
                    </Link>
                </Button>
            </div>

            <div>
                <PlanForm
                    plan={normalizedPlan}
                    aiProviders={aiProviders}
                    builders={builders}
                    domainSettings={domainSettings}
                    onCancel={handleCancel}
                />
            </div>
        </AdminLayout>
    );
}
