import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { TabsSkeleton } from '@/components/Admin/skeletons';
import { CronjobsTable } from '@/components/Admin/CronjobsTable';
import { CronLogsTable } from '@/components/Admin/CronLogsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, History } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PageProps } from '@/types';
import { Cronjob } from '@/types/admin';

interface CronjobsProps extends PageProps {
    cronjobs: Cronjob[];
}

export default function Cronjobs({ auth, cronjobs }: CronjobsProps) {
    const { t } = useTranslation();
    const { isLoading } = useAdminLoading();
    const [activeTab, setActiveTab] = useState('jobs');
    const [refreshKey, setRefreshKey] = useState(0);

    const handleJobTriggered = () => {
        // Increment refresh key to trigger log refetch
        setRefreshKey((prev) => prev + 1);
    };

    if (isLoading) {
        return (
            <AdminLayout user={auth.user!} title={t('Scheduled Tasks')}>
                <AdminPageHeader
                    title={t('Scheduled Tasks')}
                    subtitle={t('Monitor and manage scheduled background jobs')}
                />
                <TabsSkeleton tabCount={2} contentVariant="table" />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={t('Scheduled Tasks')}>
            <AdminPageHeader
                title={t('Scheduled Tasks')}
                subtitle={t('Monitor and manage scheduled background jobs')}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="jobs" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        {t('Scheduled Jobs')}
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-2">
                        <History className="h-4 w-4" />
                        {t('Execution Logs')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="jobs" className="space-y-4">
                    <CronjobsTable jobs={cronjobs} onJobTriggered={handleJobTriggered} />
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                    <CronLogsTable jobs={cronjobs} refreshKey={refreshKey} />
                </TabsContent>
            </Tabs>
        </AdminLayout>
    );
}
