import { useState, useEffect, useCallback } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { usePageLoading } from '@/hooks/usePageLoading';
import { useTranslation } from '@/contexts/LanguageContext';
import { FileManagerSkeleton } from './FileManagerSkeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/Sidebar/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { GlobalCredits } from '@/components/Header/GlobalCredits';
import { NotificationBell } from '@/components/Notifications/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { FileUploadZone, FileGrid, FilePreviewModal } from '@/components/FileManager';
import {
    LogOut,
    Files,
    Upload,
    ArrowUpCircle,
    FolderOpen,
    AlertCircle,
    Trash2,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import type { FileManagerPageProps as StoragePageProps, ProjectFile, StorageUsage, Pagination } from '@/types/storage';
import type { PageProps } from '@/types';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role?: 'admin' | 'user';
}

interface FileManagerPageProps extends StoragePageProps {
    auth: {
        user: User;
    };
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function FileManagerIndex({ auth, projects: initialProjects, storageUsage: initialStorageUsage, planLimits }: FileManagerPageProps) {
    const user = auth.user;
    const { isLoading: isPageLoading } = usePageLoading();
    const { t } = useTranslation();
    const { userCredits, unreadNotificationCount } = usePage<PageProps>().props;

    // Notification state
    const {
        notifications,
        unreadCount,
        isLoading: isLoadingNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotifications(unreadNotificationCount);
    const [projects, setProjects] = useState(initialProjects);
    const [storageUsage, setStorageUsage] = useState<StorageUsage>(initialStorageUsage);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
        projects.length > 0 ? projects[0].id : null
    );
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
    const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    // Fetch files when project changes
    useEffect(() => {
        if (!selectedProjectId) {
            setFiles([]);
            setPagination(null);
            return;
        }

        const fetchFiles = async () => {
            setLoading(true);
            try {
                const response = await axios.get<{ files: ProjectFile[]; storage_used: number; pagination: Pagination }>(
                    `/project/${selectedProjectId}/files`,
                    { params: { per_page: 24 } }
                );
                setFiles(response.data.files);
                setPagination(response.data.pagination);
            } catch {
                toast.error(t('Failed to load files'));
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
        setSelectedIds(new Set());
    }, [selectedProjectId, t]);

    const loadMore = useCallback(async () => {
        if (!selectedProjectId || !pagination?.has_more || loadingMore) return;

        setLoadingMore(true);
        try {
            const response = await axios.get<{ files: ProjectFile[]; storage_used: number; pagination: Pagination }>(
                `/project/${selectedProjectId}/files`,
                { params: { per_page: 24, page: pagination.current_page + 1 } }
            );
            setFiles(prev => [...prev, ...response.data.files]);
            setPagination(response.data.pagination);
        } catch {
            toast.error(t('Failed to load more files'));
        } finally {
            setLoadingMore(false);
        }
    }, [selectedProjectId, pagination, loadingMore, t]);

    const handleProjectChange = (projectId: string) => {
        setSelectedProjectId(projectId);
    };

    const handleUploadComplete = useCallback((file: ProjectFile) => {
        setFiles(prev => [file, ...prev]);
        // Update project file count
        setProjects(prev => prev.map(p =>
            p.id === selectedProjectId
                ? { ...p, files_count: p.files_count + 1, storage_used: p.storage_used + file.size }
                : p
        ));
    }, [selectedProjectId]);

    const handleStorageUpdate = useCallback((bytesUsed: number) => {
        setStorageUsage(prev => ({
            ...prev,
            used_bytes: bytesUsed,
            used_mb: bytesUsed / (1024 * 1024),
            remaining_bytes: prev.unlimited ? Infinity : Math.max(0, (prev.limit_mb || 0) * 1024 * 1024 - bytesUsed),
            percentage: prev.unlimited ? 0 : ((bytesUsed / ((prev.limit_mb || 1) * 1024 * 1024)) * 100),
        }));
    }, []);

    const handleSelect = useCallback((id: number, selected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (selected) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback((selected: boolean) => {
        if (selected) {
            setSelectedIds(new Set(files.map(f => f.id)));
        } else {
            setSelectedIds(new Set());
        }
    }, [files]);

    const handleDelete = useCallback(async (id: number) => {
        if (!selectedProjectId) return;

        setDeletingIds(prev => new Set(prev).add(id));

        try {
            const response = await axios.delete<{ storage_used: number }>(
                `/project/${selectedProjectId}/files/${id}`
            );

            const deletedFile = files.find(f => f.id === id);

            setFiles(prev => prev.filter(f => f.id !== id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });

            // Update storage usage
            handleStorageUpdate(response.data.storage_used);

            // Update project file count
            if (deletedFile) {
                setProjects(prev => prev.map(p =>
                    p.id === selectedProjectId
                        ? { ...p, files_count: Math.max(0, p.files_count - 1), storage_used: Math.max(0, p.storage_used - deletedFile.size) }
                        : p
                ));
            }

            toast.success(t('File deleted'));
        } catch {
            toast.error(t('Failed to delete file'));
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }, [selectedProjectId, files, handleStorageUpdate, t]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0 || !selectedProjectId) return;

        const idsToDelete = Array.from(selectedIds);
        let lastStorageUsed = storageUsage.used_bytes;

        for (const id of idsToDelete) {
            setDeletingIds(prev => new Set(prev).add(id));

            try {
                const response = await axios.delete<{ storage_used: number }>(
                    `/project/${selectedProjectId}/files/${id}`
                );
                lastStorageUsed = response.data.storage_used;

                const deletedFile = files.find(f => f.id === id);

                setFiles(prev => prev.filter(f => f.id !== id));
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });

                // Update project file count
                if (deletedFile) {
                    setProjects(prev => prev.map(p =>
                        p.id === selectedProjectId
                            ? { ...p, files_count: Math.max(0, p.files_count - 1), storage_used: Math.max(0, p.storage_used - deletedFile.size) }
                            : p
                    ));
                }
            } catch {
                // Continue with others
            } finally {
                setDeletingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }

        handleStorageUpdate(lastStorageUsed);
        toast.success(t('Deleted :count files', { count: idsToDelete.length }));
    }, [selectedIds, selectedProjectId, files, storageUsage.used_bytes, handleStorageUpdate, t]);

    const handlePreview = useCallback((file: ProjectFile) => {
        setPreviewFile(file);
    }, []);

    // If file storage is not enabled
    if (!planLimits.file_storage_enabled) {
        return (
            <>
                <Head title={t('File Manager')} />

                <TooltipProvider>
                    <SidebarProvider>
                        <AppSidebar user={user} />
                        <SidebarInset>
                            <div className="min-h-screen bg-background">
                                {/* Header */}
                                <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4">
                                    <div className="flex items-center gap-2">
                                        <SidebarTrigger />
                                        {userCredits && <GlobalCredits {...userCredits} />}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <LanguageSelector />
                                        <NotificationBell
                                            notifications={notifications}
                                            unreadCount={unreadCount}
                                            onMarkAsRead={markAsRead}
                                            onMarkAllAsRead={markAllAsRead}
                                            isLoading={isLoadingNotifications}
                                        />
                                        <ThemeToggle />

                                        {/* User Profile */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className="outline-none flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
                                                <div className="text-end hidden sm:block">
                                                    <p className="text-sm font-medium">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                                <Avatar className="h-8 w-8 cursor-pointer">
                                                    <AvatarImage src={user.avatar || undefined} />
                                                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <div className="px-2 py-1.5">
                                                    <p className="text-sm font-medium">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href="/logout" method="post" as="button" className="w-full">
                                                        <LogOut className="h-4 w-4 me-2" />
                                                        {t('Log Out')}
                                                    </Link>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </header>

                                {/* Main Content */}
                                <main className="p-4 md:p-6 lg:p-8">
                                    <div className="max-w-7xl mx-auto">
                                        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-muted/20">
                                            <AlertCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
                                            <h3 className="text-lg font-medium text-muted-foreground mb-2">
                                                {t('File Storage Not Available')}
                                            </h3>
                                            <p className="text-sm text-muted-foreground/70 text-center max-w-md">
                                                {t('Your current plan does not include file storage. Upgrade your plan to enable file uploads for your projects.')}
                                            </p>
                                            <Link
                                                href="/billing/plans"
                                                className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
                                            >
                                                <ArrowUpCircle className="h-4 w-4" />
                                                {t('View Plans')}
                                            </Link>
                                        </div>
                                    </div>
                                </main>
                            </div>
                        </SidebarInset>
                    </SidebarProvider>
                </TooltipProvider>
            </>
        );
    }

    return (
        <>
            <Head title={t('File Manager')} />

            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar user={user} />
                    <SidebarInset>
                        <div className="min-h-screen bg-background">
                            {/* Header */}
                            <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4">
                                <div className="flex items-center gap-2">
                                    <SidebarTrigger />
                                    {userCredits && <GlobalCredits {...userCredits} />}
                                </div>

                                <div className="flex items-center gap-2">
                                    <LanguageSelector />
                                    <NotificationBell
                                        notifications={notifications}
                                        unreadCount={unreadCount}
                                        onMarkAsRead={markAsRead}
                                        onMarkAllAsRead={markAllAsRead}
                                        isLoading={isLoadingNotifications}
                                    />
                                    <ThemeToggle />

                                    {/* User Profile */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="outline-none flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
                                            <div className="text-end hidden sm:block">
                                                <p className="text-sm font-medium">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                            <Avatar className="h-8 w-8 cursor-pointer">
                                                <AvatarImage src={user.avatar || undefined} />
                                                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <div className="px-2 py-1.5">
                                                <p className="text-sm font-medium">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href="/logout" method="post" as="button" className="w-full">
                                                    <LogOut className="h-4 w-4 me-2" />
                                                    {t('Log Out')}
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </header>

                            {/* Main Content */}
                            <main className="p-4 md:p-6 lg:p-8">
                                {isPageLoading ? (
                                    <FileManagerSkeleton />
                                ) : (
                                <div className="max-w-7xl mx-auto">
                                    {/* Page Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div>
                                            <h1 className="text-2xl font-bold text-foreground">
                                                {t('File Manager')}
                                            </h1>
                                            <p className="text-muted-foreground mt-1">
                                                {t('Manage your project files')}
                                            </p>
                                        </div>

                                        {projects.length > 0 && (
                                            <Select value={selectedProjectId || undefined} onValueChange={handleProjectChange}>
                                                <SelectTrigger className="w-full sm:w-[280px]">
                                                    <FolderOpen className="h-4 w-4 me-2 shrink-0 text-muted-foreground" />
                                                    <span className="truncate">
                                                        <SelectValue placeholder={t('Select a project')} />
                                                    </span>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {projects.map((project) => (
                                                        <SelectItem key={project.id} value={project.id}>
                                                            {project.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {/* Projects List or File Browser */}
                                    {projects.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-muted/20">
                                            <Files className="h-16 w-16 text-muted-foreground/30 mb-4" />
                                            <h3 className="text-lg font-medium text-muted-foreground mb-2">
                                                {t('No projects yet')}
                                            </h3>
                                            <p className="text-sm text-muted-foreground/70">
                                                {t('Create a project to start uploading files')}
                                            </p>
                                            <Link
                                                href="/create"
                                                className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
                                            >
                                                <Upload className="h-4 w-4" />
                                                {t('Create a Project')}
                                            </Link>
                                        </div>
                                    ) : selectedProject ? (
                                        <Card>
                                            <CardHeader>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <CardTitle className="text-base truncate">{selectedProject.name}</CardTitle>
                                                        <CardDescription>
                                                            {selectedProject.files_count} {selectedProject.files_count === 1 ? t(':count file', { count: 1 }).replace('1 ', '') : t(':count files', { count: selectedProject.files_count }).replace(`${selectedProject.files_count} `, '')} &bull; {formatBytes(storageUsage.used_bytes)} {t('Used:').replace(':', '')}
                                                            {storageUsage.unlimited ? (
                                                                <Badge variant="secondary" className="ms-2">{t('Unlimited')}</Badge>
                                                            ) : (
                                                                ` ${t('of :limit MB', { limit: storageUsage.limit_mb ?? 0 })}`
                                                            )}
                                                        </CardDescription>
                                                    </div>

                                                    {selectedIds.size > 0 && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={handleBulkDelete}
                                                            disabled={deletingIds.size > 0}
                                                            className="shrink-0"
                                                        >
                                                            {deletingIds.size > 0 ? (
                                                                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4 me-2" />
                                                            )}
                                                            {t('Delete :count selected', { count: selectedIds.size })}
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                {/* Upload Zone */}
                                                <FileUploadZone
                                                    projectId={selectedProjectId!}
                                                    maxFileSizeMb={planLimits.max_file_size_mb}
                                                    allowedTypes={planLimits.allowed_file_types}
                                                    onUploadComplete={handleUploadComplete}
                                                    onStorageUpdate={handleStorageUpdate}
                                                />

                                                {/* File Grid */}
                                                {loading ? (
                                                    <div className="flex items-center justify-center py-12">
                                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : files.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-muted/10">
                                                        <Files className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                                        <h3 className="text-base font-medium text-muted-foreground mb-2">
                                                            {t('No files in this project')}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground/70 text-center max-w-md">
                                                            {t('Drag & drop files above or use the generated app to upload files.')}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <FileGrid
                                                            files={files}
                                                            selectedIds={selectedIds}
                                                            onSelect={handleSelect}
                                                            onSelectAll={handleSelectAll}
                                                            onDelete={handleDelete}
                                                            onPreview={handlePreview}
                                                            deleting={deletingIds}
                                                        />

                                                        {/* Load More Button */}
                                                        {pagination?.has_more && (
                                                            <div className="flex justify-center pt-4">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={loadMore}
                                                                    disabled={loadingMore}
                                                                >
                                                                    {loadingMore ? (
                                                                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                                                    ) : null}
                                                                    {t('Load More (:remaining remaining)', { remaining: pagination.total - files.length })}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ) : null}
                                </div>
                                )}
                            </main>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </TooltipProvider>

            {/* Preview Modal */}
            <FilePreviewModal
                file={previewFile}
                open={previewFile !== null}
                onClose={() => setPreviewFile(null)}
            />
        </>
    );
}
