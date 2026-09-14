import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { DatabaseCrudEditor } from '@/components/Data/DatabaseCrudEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import { Database } from 'lucide-react';
import type { User } from '@/types';

interface DatabasePageProps {
    user: User;
}

export default function DatabaseIndex({ user }: DatabasePageProps) {
    const { t } = useTranslation();

    return (
        <AdminLayout user={user} title={t('Database')}>
            <AdminPageHeader
                title={t('Database')}
                subtitle={t('Manage configured SQL connections for this Webby installation')}
            />

            <Card className="overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        {t('SQL Connections')}
                    </CardTitle>
                    <CardDescription>
                        {t('Browse schemas, inspect rows, and make controlled data changes from one administrator-only workspace.')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="h-[calc(100vh-260px)] min-h-[620px]">
                        <DatabaseCrudEditor />
                    </div>
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
