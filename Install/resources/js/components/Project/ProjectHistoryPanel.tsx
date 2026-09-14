import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/contexts/LanguageContext';
import { Clock, DatabaseBackup, Loader2, RefreshCw, RotateCcw, Save } from 'lucide-react';

interface ProjectRevision {
    id: string;
    trigger: string;
    label: string;
    file_count: number;
    skipped_count: number;
    total_bytes: number;
    source: string;
    restored_at: string | null;
    created_at: string;
    user: { id: number; name: string } | null;
}

interface ProjectHistoryPanelProps {
    projectId: string;
    onRestored?: () => void;
}

function formatBytes(bytes: number): string {
    if (!bytes) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;

    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }

    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function ProjectHistoryPanel({ projectId, onRestored }: ProjectHistoryPanelProps) {
    const { t } = useTranslation();
    const [revisions, setRevisions] = useState<ProjectRevision[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [label, setLabel] = useState('');

    const fetchRevisions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/project/${projectId}/revisions`);
            setRevisions(response.data.revisions || []);
        } catch {
            toast.error(t('Failed to load history'));
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        fetchRevisions();
    }, [fetchRevisions]);

    const createCheckpoint = async () => {
        setSaving(true);
        try {
            await axios.post(`/project/${projectId}/revisions`, {
                label: label.trim() || t('Manual checkpoint'),
                trigger: 'manual',
            });
            setLabel('');
            toast.success(t('Checkpoint created'));
            await fetchRevisions();
        } catch {
            toast.error(t('Failed to create checkpoint'));
        } finally {
            setSaving(false);
        }
    };

    const restoreRevision = async (revision: ProjectRevision) => {
        if (!window.confirm(t('Restore this version? Current files will be snapshotted first.'))) return;

        setRestoringId(revision.id);
        try {
            await axios.post(`/project/${projectId}/revisions/${revision.id}/restore`);
            toast.success(t('Version restored'));
            onRestored?.();
            await fetchRevisions();
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error : null;
            toast.error(message || t('Failed to restore version'));
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="h-12 px-4 border-b flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <DatabaseBackup className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold leading-tight">{t('History')}</h2>
                        <p className="text-xs text-muted-foreground truncate">{t('Restore previous editor checkpoints')}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchRevisions} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="border-b p-3 flex gap-2">
                <Input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder={t('Checkpoint name')}
                    className="h-9"
                    maxLength={255}
                />
                <Button onClick={createCheckpoint} disabled={saving} className="h-9 shrink-0">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="ms-2">{t('Save')}</span>
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="rounded-md border p-3 space-y-2">
                                <Skeleton className="h-4 w-44" />
                                <Skeleton className="h-3 w-64" />
                            </div>
                        ))
                    ) : revisions.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground">
                            <Clock className="h-8 w-8 mb-2" />
                            <p className="text-sm">{t('No checkpoints yet')}</p>
                        </div>
                    ) : (
                        revisions.map((revision) => (
                            <div key={revision.id} className="rounded-md border bg-card p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <h3 className="text-sm font-medium truncate">{revision.label}</h3>
                                            <Badge variant="secondary" className="text-[10px] uppercase">
                                                {revision.trigger.replaceAll('_', ' ')}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {new Date(revision.created_at).toLocaleString()} · {revision.file_count} {t('files')} · {formatBytes(revision.total_bytes)}
                                        </p>
                                        {revision.skipped_count > 0 && (
                                            <p className="mt-1 text-xs text-amber-600">
                                                {revision.skipped_count} {t('large files skipped')}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => restoreRevision(revision)}
                                        disabled={restoringId !== null || revision.file_count === 0}
                                        className="h-8 shrink-0"
                                    >
                                        {restoringId === revision.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-3.5 w-3.5" />
                                        )}
                                        <span className="ms-1.5">{t('Restore')}</span>
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
