import {
    Flame,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Database,
    Key,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import type { FirebaseStats } from '@/types/admin';

interface FirebaseStatusCardProps {
    stats: FirebaseStats;
}

function StatusBadge({
    configured,
    connected,
    error,
    t,
}: {
    configured: boolean;
    connected: boolean;
    error: string | null;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}) {
    if (!configured) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                {t('Not Configured')}
            </span>
        );
    }

    if (connected) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-xs text-success">
                <CheckCircle2 className="h-3 w-3" />
                {t('Connected')}
            </span>
        );
    }

    return (
        <span
            className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
            title={error || t('Connection failed')}
        >
            <XCircle className="h-3 w-3" />
            {t('Error')}
        </span>
    );
}

export function FirebaseStatusCard({ stats }: FirebaseStatusCardProps) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Flame className="h-5 w-5 text-warning" />
                    {t('Firebase Status')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Connection Status */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{t('Client SDK')}</span>
                        </div>
                        <StatusBadge
                            configured={stats.system_configured}
                            connected={stats.system_status.connected}
                            error={stats.system_status.error}
                            t={t}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{t('Admin SDK')}</span>
                        </div>
                        <StatusBadge
                            configured={stats.admin_sdk_configured}
                            connected={stats.admin_sdk_status.connected}
                            error={stats.admin_sdk_status.error}
                            t={t}
                        />
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                    <div className="text-center">
                        <p className="text-xl font-bold">
                            {stats.projects_using_firebase}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('Using Firebase')}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold">
                            {stats.projects_with_custom_firebase}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('Custom Config')}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold">
                            {stats.projects_with_admin_sdk}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('Admin SDK')}</p>
                    </div>
                </div>

                {/* Error Messages */}
                {stats.system_status.error && stats.system_configured && (
                    <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
                        <strong>{t('Client SDK')}:</strong> {stats.system_status.error}
                    </div>
                )}
                {stats.admin_sdk_status.error && stats.admin_sdk_configured && (
                    <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
                        <strong>{t('Admin SDK')}:</strong> {stats.admin_sdk_status.error}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
