import { useState, useEffect, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { TanStackDataTable } from '@/components/Admin/TanStackDataTable';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Search,
    RefreshCw,
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
} from 'lucide-react';
import { CronLog, CronLogsResponse, Cronjob } from '@/types/admin';
import { useTranslation } from '@/contexts/LanguageContext';

interface CronLogsTableProps {
    jobs: Cronjob[];
    refreshKey?: number;
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
};

function formatDateTime(dateString: string | null, locale: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
}

export function CronLogsTable({ jobs, refreshKey }: CronLogsTableProps) {
    const { t, locale } = useTranslation();
    const [logs, setLogs] = useState<CronLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [jobFilter, setJobFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [pagination, setPagination] = useState({
        total: 0,
        lastPage: 1,
    });
    const [selectedLog, setSelectedLog] = useState<CronLog | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: (currentPage + 1).toString(),
                per_page: pageSize.toString(),
            });

            if (search) params.append('search', search);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (jobFilter !== 'all') params.append('job', jobFilter);

            const response = await fetch(
                `${route('admin.cronjobs.logs')}?${params.toString()}`
            );
            const data: CronLogsResponse = await response.json();

            setLogs(data.data);
            setPagination({
                total: data.total,
                lastPage: data.last_page,
            });
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, search, statusFilter, jobFilter, pageSize]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs, refreshKey]);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setCurrentPage(0);
    };

    const handleStatusChange = (value: string) => {
        setStatusFilter(value);
        setCurrentPage(0);
    };

    const handleJobChange = (value: string) => {
        setJobFilter(value);
        setCurrentPage(0);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(0);
    };

    const uniqueJobNames = jobs.map((job) => job.name);

    const columns: ColumnDef<CronLog>[] = [
        {
            accessorKey: 'job_name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Job Name')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium">{row.original.job_name}</span>
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Status')} />
            ),
            cell: ({ row }) => {
                const log = row.original;
                const status = statusConfig[log.status];
                const StatusIcon = status.icon;

                return (
                    <Badge
                        variant="secondary"
                        className={`inline-flex items-center gap-1 ${status.badge}`}
                    >
                        <StatusIcon
                            className={`h-3.5 w-3.5 ${status.color} ${
                                log.status === 'running' ? 'animate-spin' : ''
                            }`}
                        />
                        {t(status.labelKey)}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'started_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Started At')} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {formatDateTime(row.original.started_at, locale)}
                </span>
            ),
        },
        {
            accessorKey: 'human_duration',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Duration')} />
            ),
            cell: ({ row }) => (
                <span className="text-sm font-mono">
                    {row.original.human_duration}
                </span>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'trigger_display',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Triggered By')} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.trigger_display}
                </span>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'message',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Message')} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                    {row.original.message || '-'}
                </span>
            ),
            enableSorting: false,
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const log = row.original;
                if (!log.message && !log.exception) return null;

                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            {/* Toolbar - consistent with Transactions page design */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('Search logs...')}
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="ps-9 w-[300px]"
                    />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-[130px] h-8">
                            <SelectValue placeholder={t('Status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Status')}</SelectItem>
                            <SelectItem value="success">{t('Success')}</SelectItem>
                            <SelectItem value="failed">{t('Failed')}</SelectItem>
                            <SelectItem value="running">{t('Running')}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={jobFilter} onValueChange={handleJobChange}>
                        <SelectTrigger className="w-[180px] h-8">
                            <SelectValue placeholder={t('Job')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All Jobs')}</SelectItem>
                            {uniqueJobNames.map((name) => (
                                <SelectItem key={name} value={name}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => fetchLogs()}
                        disabled={loading}
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                        />
                    </Button>
                </div>
            </div>

            {/* Table with TanStack */}
            {loading && logs.length === 0 ? (
                <div className="rounded-md border bg-card">
                    <div className="h-24 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </div>
            ) : (
                <TanStackDataTable
                    columns={columns}
                    data={logs}
                    showSearch={false}
                    serverPagination={{
                        pageCount: pagination.lastPage,
                        pageIndex: currentPage,
                        pageSize: pageSize,
                        total: pagination.total,
                        onPageChange: handlePageChange,
                        onPageSizeChange: handlePageSizeChange,
                    }}
                />
            )}

            {/* Log Details Dialog */}
            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Log Details')} - {selectedLog?.job_name}</DialogTitle>
                        <DialogDescription>
                            {t('Started at')} {formatDateTime(selectedLog?.started_at ?? null, locale)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {selectedLog?.message && (
                            <div>
                                <h4 className="font-medium mb-2">{t('Message')}</h4>
                                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
                                    {selectedLog.message}
                                </pre>
                            </div>
                        )}

                        {selectedLog?.exception && (
                            <div>
                                <h4 className="font-medium mb-2 text-destructive">
                                    {t('Exception')}
                                </h4>
                                <pre className="bg-destructive/10 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap text-destructive">
                                    {selectedLog.exception}
                                </pre>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">{t('Status')}:</span>{' '}
                                <span className="font-medium capitalize">
                                    {selectedLog?.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">{t('Duration')}:</span>{' '}
                                <span className="font-medium">
                                    {selectedLog?.human_duration}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">{t('Triggered By')}:</span>{' '}
                                <span className="font-medium">
                                    {selectedLog?.trigger_display}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">{t('Job Class')}:</span>{' '}
                                <span className="font-mono text-xs">
                                    {selectedLog?.job_class}
                                </span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
