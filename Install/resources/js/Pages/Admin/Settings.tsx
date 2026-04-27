import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { SettingsPageSkeleton } from '@/components/Admin/skeletons';
import { Search, Settings2, CreditCard, Shield, Mail, Lock, Radio, Users, Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

import GeneralSettingsTab from './Settings/GeneralSettingsTab';
import AuthSettingsTab from './Settings/AuthSettingsTab';
import EmailSettingsTab from './Settings/EmailSettingsTab';
import PlansSettingsTab from './Settings/PlansSettingsTab';
import ReferralSettingsTab from './Settings/ReferralSettingsTab';
import DomainSettingsTab from './Settings/DomainSettingsTab';
import GdprSettingsTab from './Settings/GdprSettingsTab';
import IntegrationSettingsTab from './Settings/IntegrationSettingsTab';
import type { SettingsPageProps } from './Settings/types';

interface SectionDefinition {
    key: string;
    labelKey: string;
    icon: React.ReactNode;
    keywords: string[];
    category: 'platform' | 'security';
}

interface Section extends SectionDefinition {
    label: string;
}

const sectionDefinitions: SectionDefinition[] = [
    {
        key: 'general',
        labelKey: 'General',
        icon: <Settings2 className="h-4 w-4" />,
        keywords: ['general', 'site', 'name', 'logo', 'branding', 'theme', 'language', 'timezone'],
        category: 'platform',
    },
    {
        key: 'plans',
        labelKey: 'Plans',
        icon: <CreditCard className="h-4 w-4" />,
        keywords: ['plans', 'subscription', 'pricing', 'default', 'tier'],
        category: 'platform',
    },
    {
        key: 'referral',
        labelKey: 'Referral',
        icon: <Users className="h-4 w-4" />,
        keywords: ['referral', 'commission', 'share', 'earn', 'credits'],
        category: 'platform',
    },
    {
        key: 'domains',
        labelKey: 'Domains',
        icon: <Globe className="h-4 w-4" />,
        keywords: ['domain', 'subdomain', 'custom', 'ssl', 'dns', 'publish', 'hosting'],
        category: 'platform',
    },
    {
        key: 'auth',
        labelKey: 'Authentication',
        icon: <Shield className="h-4 w-4" />,
        keywords: ['auth', 'login', 'social', 'google', 'facebook', 'github', 'oauth', 'recaptcha', 'registration'],
        category: 'security',
    },
    {
        key: 'email',
        labelKey: 'Email',
        icon: <Mail className="h-4 w-4" />,
        keywords: ['email', 'smtp', 'mail', 'notification', 'mailer'],
        category: 'security',
    },
    {
        key: 'gdpr',
        labelKey: 'Privacy & GDPR',
        icon: <Lock className="h-4 w-4" />,
        keywords: ['privacy', 'gdpr', 'cookie', 'data', 'retention', 'deletion', 'export'],
        category: 'security',
    },
    {
        key: 'integrations',
        labelKey: 'Integrations',
        icon: <Radio className="h-4 w-4" />,
        keywords: ['integrations', 'sse', 'pusher', 'realtime', 'websocket', 'streaming', 'builder'],
        category: 'platform',
    },
];

export default function Settings({ auth, settings, plans, aiProviders, builders, notificationEvents }: SettingsPageProps) {
    const { t } = useTranslation();
    const { isLoading } = useAdminLoading();

    // Create sections with translated labels
    const sections = sectionDefinitions.map(section => ({
        ...section,
        label: t(section.labelKey),
    }));

    const categories = {
        platform: t('Platform'),
        security: t('Security'),
    };

    // Get initial tab from URL params
    const getInitialTab = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab && sectionDefinitions.some(s => s.key === tab)) {
                return tab;
            }
        }
        return 'general';
    };

    const [activeSection, setActiveSection] = useState(getInitialTab);
    const [search, setSearch] = useState('');

    // Update URL when tab changes
    const handleSectionChange = (section: string) => {
        setActiveSection(section);
        const url = section === 'general' ? '/admin/settings' : `/admin/settings?tab=${section}`;
        window.history.replaceState({}, '', url);
    };

    const matchesSearch = (section: Section) => {
        if (!search.trim()) return true;
        const terms = search.toLowerCase().trim().split(/\s+/);
        return terms.every((term) =>
            section.keywords.some((kw) => kw.toLowerCase().includes(term)) ||
            section.label.toLowerCase().includes(term)
        );
    };

    const getSectionsByCategory = (category: 'platform' | 'security') => {
        return sections.filter((s) => s.category === category && matchesSearch(s));
    };

    const hasResults = sections.some(matchesSearch);

    const renderContent = () => {
        switch (activeSection) {
            case 'general':
                return <GeneralSettingsTab settings={settings.general} />;
            case 'plans':
                return <PlansSettingsTab settings={settings.plans} plans={plans} aiProviders={aiProviders} builders={builders} />;
            case 'referral':
                return <ReferralSettingsTab settings={settings.referral} />;
            case 'domains':
                return <DomainSettingsTab settings={settings.domains} />;
            case 'auth':
                return <AuthSettingsTab settings={settings.auth} />;
            case 'email':
                return <EmailSettingsTab settings={settings.email} notificationEvents={notificationEvents} />;
            case 'gdpr':
                return <GdprSettingsTab settings={settings.gdpr} />;
            case 'integrations':
                return <IntegrationSettingsTab settings={settings.integrations} aiProviders={aiProviders} />;
            default:
                return <GeneralSettingsTab settings={settings.general} />;
        }
    };

    if (isLoading) {
        return (
            <AdminLayout user={auth.user!} title={t('Settings')}>
                <AdminPageHeader title={t('Settings')} subtitle={t('Configure system settings and integrations')} />
                <SettingsPageSkeleton sidebarItemCount={7} />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={t('Settings')}>
            <AdminPageHeader title={t('Settings')} subtitle={t('Configure system settings and integrations')} />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <Card className="lg:sticky lg:top-20 py-0">
                        <CardContent className="p-0">
                            {/* Search */}
                            <div className="px-4 pt-6 pb-3 border-b">
                                <div className="relative">
                                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="ps-9"
                                        placeholder={t('Search settings...')}
                                    />
                                </div>
                            </div>

                            {/* Navigation */}
                            <nav className="px-4 py-4 space-y-4 max-h-96 lg:max-h-[calc(100vh-300px)] overflow-y-auto">
                                {hasResults ? (
                                    <>
                                        {/* Platform Category */}
                                        {getSectionsByCategory('platform').length > 0 && (
                                            <div>
                                                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                                                    {categories.platform}
                                                </p>
                                                <ul className="space-y-1">
                                                    {getSectionsByCategory('platform').map((section) => (
                                                        <li key={section.key}>
                                                            <button
                                                                onClick={() => handleSectionChange(section.key)}
                                                                type="button"
                                                                className={cn(
                                                                    'flex items-center gap-2 p-2 w-full rounded-lg text-sm font-medium transition-colors text-start',
                                                                    activeSection === section.key
                                                                        ? 'bg-primary text-primary-foreground'
                                                                        : 'text-foreground hover:bg-muted'
                                                                )}
                                                            >
                                                                {section.icon}
                                                                <span>{section.label}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Security Category */}
                                        {getSectionsByCategory('security').length > 0 && (
                                            <div>
                                                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                                                    {categories.security}
                                                </p>
                                                <ul className="space-y-1">
                                                    {getSectionsByCategory('security').map((section) => (
                                                        <li key={section.key}>
                                                            <button
                                                                onClick={() => handleSectionChange(section.key)}
                                                                type="button"
                                                                className={cn(
                                                                    'flex items-center gap-2 p-2 w-full rounded-lg text-sm font-medium transition-colors text-start',
                                                                    activeSection === section.key
                                                                        ? 'bg-primary text-primary-foreground'
                                                                        : 'text-foreground hover:bg-muted'
                                                                )}
                                                            >
                                                                {section.icon}
                                                                <span>{section.label}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        {t('No results found for ":search"', { search })}
                                    </p>
                                )}
                            </nav>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">{renderContent()}</div>
            </div>
        </AdminLayout>
    );
}
