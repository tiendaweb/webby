import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Play, Clock, CheckCircle, XCircle, Loader2, Circle } from 'lucide-react';
import { Cronjob } from '@/types/admin';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface CronjobsTableProps {
    jobs: Cronjob[];
    onJobTriggered?: () => void;
}

const statusConfig = {
    success: {
        icon: CheckCircle,
        color: 'text-success',
        badge: 'bg-success/10 text-success hover:bg-success/10',
        labelKey: 'Success',
    },
    failed: {
        icon: XCircle,
        color: 'text-destructive',
        badge: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
        labelKey: 'Failed',
    },
    running: {
        icon: Loader2,
        color: 'text-info',
        badge: 'bg-info/10 text-info hover:bg-info/10',
        labelKey: 'Running',
    },
    pending: {
        icon: Circle,
        color: 'text-muted-foreground',
        badge: 'bg-muted text-muted-foreground hover:bg-muted',
        labelKey: 'Never Run',
    },
};

function formatDate(dateString: string | null, locale: string, neverText: string): string {
    if (!dateString) return neverText;
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function formatRelativeTime(
    dateString: string,
    locale: string,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        return t('in :count days', { count: diffDays });
    }
    if (diffHours > 0) {
        return t('in :count hours', { count: diffHours });
    }
    return t('Soon');
}

export function CronjobsTable({ jobs, onJobTriggered }: CronjobsTableProps) {
    const { t, locale } = useTranslation();
    const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

    const handleTriggerJob = async (command: string, jobName: string) => {
        setTriggeringJob(command);

        try {
            const response = await fetch(route('admin.cronjobs.trigger'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]'
                        )?.content || '',
                },
                body: JSON.stringify({ command }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(t(':name triggered successfully', { name: jobName }));
                onJobTriggered?.();
                router.reload({ only: ['cronjobs'] });
            } else {
                toast.error(data.message || t('Failed to trigger job'));
            }
        } catch {
            toast.error(t('Failed to trigger job'));
        } finally {
            setTriggeringJob(null);
        }
    };

    const columns: ColumnDef<Cronjob>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Job Name')} />
            ),
            cell: ({ row }) => {
                const job = row.original;
                return (
                    <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {job.description}
                        </p>
                    </div>
                );
            },
        },
        {
            accessorKey: 'schedule',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Schedule')} />
            ),
            cell: ({ row }) => {
                const job = row.original;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1.5 font-mono text-sm bg-muted px-2 py-1 rounded cursor-help">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    {job.schedule}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-mono">{job.cron}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: 'last_run',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Last Run')} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.last_run, locale, t('Never'))}</span>
            ),
        },
        {
            accessorKey: 'last_status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Status')} />
            ),
            cell: ({ row }) => {
                const job = row.original;
                const status = statusConfig[job.last_status];
                const StatusIcon = status.icon;

                return (
                    <Badge
                        variant="secondary"
                        className={`inline-flex items-center gap-1 ${status.badge}`}
                    >
                        <StatusIcon
                            className={`h-3.5 w-3.5 ${status.color} ${
                                job.last_status === 'running' ? 'animate-spin' : ''
                            }`}
                        />
                        {t(status.labelKey)}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'next_run',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Next Run')} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(row.original.next_run, locale, t)}
                </span>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <span className="sr-only">{t('Actions')}</span>,
            cell: ({ row }) => {
                const job = row.original;
                const isTriggering = triggeringJob === job.command;

                return (
                    <div className="text-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTriggerJob(job.command, job.name)}
                            disabled={isTriggering || job.last_status === 'running'}
                        >
                            {isTriggering ? (
                                <>
                                    <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                                    {t('Running...')}
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 me-1.5" />
                                    {t('Run Now')}
                                </>
                            )}
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={jobs}
            showSearch={false}
            showPagination={false}
            pageSize={jobs.length || 50}
        />
    );
}
