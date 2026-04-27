import { HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import type { StorageStats } from '@/types/admin';

interface StorageStatsCardProps {
    stats: StorageStats;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function StorageStatsCard({ stats }: StorageStatsCardProps) {
    const { t } = useTranslation();

    const typeColors: Record<string, string> = {
        Images: 'bg-blue-500',
        Videos: 'bg-purple-500',
        Audio: 'bg-pink-500',
        PDFs: 'bg-red-500',
        Other: 'bg-gray-500',
    };

    const totalTypeStorage = stats.storage_by_type.reduce(
        (sum, t) => sum + t.size_bytes,
        0
    );

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <HardDrive className="h-5 w-5 text-primary" />
                    {t('Storage Usage')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Overview Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold">
                            {formatBytes(stats.total_storage_bytes)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('Total Used')}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold">{stats.total_files}</p>
                        <p className="text-xs text-muted-foreground">{t('Files')}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold">{stats.projects_with_files}</p>
                        <p className="text-xs text-muted-foreground">{t('Projects')}</p>
                    </div>
                </div>

                {/* Storage by Type */}
                {stats.storage_by_type.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            {t('By File Type')}
                        </p>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted flex">
                            {stats.storage_by_type.map((type) => {
                                const percentage =
                                    totalTypeStorage > 0
                                        ? (type.size_bytes / totalTypeStorage) * 100
                                        : 0;
                                return (
                                    <div
                                        key={type.type}
                                        className={`h-full ${typeColors[type.type] || 'bg-gray-500'}`}
                                        style={{ width: `${percentage}%` }}
                                        title={`${type.type}: ${formatBytes(type.size_bytes)}`}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                            {stats.storage_by_type.map((type) => (
                                <div key={type.type} className="flex items-center gap-1">
                                    <div
                                        className={`h-2 w-2 rounded-full ${typeColors[type.type] || 'bg-gray-500'}`}
                                    />
                                    <span className="text-muted-foreground">
                                        {type.type}: {formatBytes(type.size_bytes)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Users */}
                {stats.top_users.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            {t('Top Users by Storage')}
                        </p>
                        <div className="space-y-1.5">
                            {stats.top_users.slice(0, 3).map((user, index) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">
                                            {index + 1}.
                                        </span>
                                        <span className="truncate max-w-[120px]">
                                            {user.name}
                                        </span>
                                    </div>
                                    <span className="font-medium">
                                        {formatBytes(user.storage_bytes)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {stats.total_files === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        {t('No files uploaded yet')}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
