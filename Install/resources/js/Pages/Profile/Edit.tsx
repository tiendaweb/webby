import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { User, Bot, Lock } from 'lucide-react';

import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import ConsentSettings from './Partials/ConsentSettings';
import DataExportCard from './Partials/DataExportCard';
import DeleteUserForm from './Partials/DeleteUserForm';
import AiSettingsTab from './Partials/AiSettingsTab';

interface ModelPricing {
    input: number;
    output: number;
}

import { SoundSettings, SoundStyle } from '@/hooks/useChatSounds';

interface ProfileEditProps extends PageProps {
    mustVerifyEmail: boolean;
    status?: string;
    consents: {
        marketing: boolean;
        analytics: boolean;
        third_party: boolean;
    };
    dataExportEnabled: boolean;
    pendingExport: {
        status: string;
        expires_at: string | null;
        download_token: string | null;
    } | null;
    hoursUntilNextExport: number;
    accountDeletionEnabled: boolean;
    isSuperAdmin: boolean;
    pendingDeletion: {
        scheduled_at: string;
        cancellation_token: string;
    } | null;
    aiSettings: {
        preferred_provider: string;
        preferred_model: string | null;
        has_openai_key: boolean;
        openai_key_masked: string | null;
    } | null;
    canUseOwnKey: boolean;
    isUsingOwnKey: boolean;
    providerTypes: Record<string, string>;
    defaultModels: Record<string, string[]>;
    modelPricing: Record<string, Record<string, ModelPricing>>;
    soundSettings: SoundSettings;
    soundStyles: SoundStyle[];
}

interface Section {
    key: string;
    labelKey: string;
    icon: React.ReactNode;
}

const sections: Section[] = [
    {
        key: 'account',
        labelKey: 'Account',
        icon: <User className="h-4 w-4" />,
    },
    {
        key: 'ai',
        labelKey: 'AI Settings',
        icon: <Bot className="h-4 w-4" />,
    },
    {
        key: 'privacy',
        labelKey: 'Privacy',
        icon: <Lock className="h-4 w-4" />,
    },
];

export default function Edit({
    mustVerifyEmail,
    status,
    consents,
    dataExportEnabled,
    pendingExport,
    hoursUntilNextExport,
    accountDeletionEnabled,
    isSuperAdmin,
    pendingDeletion,
    aiSettings,
    canUseOwnKey,
    isUsingOwnKey,
    providerTypes,
    defaultModels,
    modelPricing,
    soundSettings,
    soundStyles,
}: ProfileEditProps) {
    const { auth } = usePage<PageProps>().props;
    const { t } = useTranslation();

    const getInitialTab = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab && sections.some(s => s.key === tab)) {
                return tab;
            }
        }
        return 'account';
    };

    const [activeSection, setActiveSection] = useState(getInitialTab);

    const handleSectionChange = (section: string) => {
        setActiveSection(section);
        const url = section === 'account' ? '/profile' : `/profile?tab=${section}`;
        window.history.replaceState({}, '', url);
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'account':
                return (
                    <div className="space-y-6">
                        <div className="bg-card p-4 shadow-sm border border-border rounded-lg sm:p-8">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                            />
                        </div>
                        <div className="bg-card p-4 shadow-sm border border-border rounded-lg sm:p-8">
                            <UpdatePasswordForm />
                        </div>
                    </div>
                );
            case 'ai':
                return (
                    <AiSettingsTab
                        settings={aiSettings}
                        canUseOwnKey={canUseOwnKey}
                        isUsingOwnKey={isUsingOwnKey}
                        providerTypes={providerTypes}
                        defaultModels={defaultModels}
                        modelPricing={modelPricing}
                        soundSettings={soundSettings}
                        soundStyles={soundStyles}
                    />
                );
            case 'privacy':
                return (
                    <div className="space-y-6">
                        <div className="bg-card p-4 shadow-sm border border-border rounded-lg sm:p-8">
                            <ConsentSettings consents={consents} />
                        </div>
                        {dataExportEnabled && (
                            <div className="bg-card p-4 shadow-sm border border-border rounded-lg sm:p-8">
                                <DataExportCard
                                    dataExportEnabled={dataExportEnabled}
                                    pendingExport={pendingExport}
                                    hoursUntilNextExport={hoursUntilNextExport}
                                />
                            </div>
                        )}
                        <div className="bg-card p-4 shadow-sm border border-border rounded-lg sm:p-8">
                            <DeleteUserForm
                                accountDeletionEnabled={accountDeletionEnabled}
                                isSuperAdmin={isSuperAdmin}
                                pendingDeletion={pendingDeletion}
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AdminLayout user={auth.user!} title={t('Settings')}>
            <div className="prose prose-sm dark:prose-invert">
                <h1 className="text-2xl font-bold text-foreground">{t('Settings')}</h1>
                <p className="text-muted-foreground">{t('Manage your account settings and preferences')}</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 mt-6">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-56 flex-shrink-0">
                    <Card className="lg:sticky lg:top-20 py-0">
                        <CardContent className="p-0">
                            <nav className="px-4 py-4 space-y-1">
                                {sections.map((section) => (
                                    <button
                                        key={section.key}
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
                                        <span>{t(section.labelKey)}</span>
                                    </button>
                                ))}
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
