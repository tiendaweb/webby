import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { usePageLoading } from '@/hooks/usePageLoading';
import { useTranslation } from '@/contexts/LanguageContext';
import { ProjectsSkeleton } from './ProjectsSkeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    TableActionMenu,
    TableActionMenuTrigger,
    TableActionMenuContent,
    TableActionMenuItem,
    TableActionMenuSeparator,
} from '@/components/ui/table-action-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AppSidebar } from '@/components/Sidebar/AppSidebar';
import { AnimatedBackground } from '@/components/Landing/AnimatedBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { NotificationBell } from '@/components/Notifications/NotificationBell';
import { GlobalCredits } from '@/components/Header/GlobalCredits';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserChannel } from '@/hooks/useUserChannel';
import { Project, ProjectsPageProps, ProjectSort, ProjectVisibility, PageProps } from '@/types';
import type { UserCredits, UserNotification, ProjectStatusEvent } from '@/types/notifications';
import type { BroadcastConfig } from '@/hooks/useBuilderPusher';
import {
    Search,
    LogOut,
    Folder,
    LayoutGrid,
    List,
    Maximize2,
    Star,
    StarOff,
    Copy,
    Pencil,
    Trash2,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Plus,
    Code2,
    Zap,
    Upload,
    Loader2,
    ImagePlus,
    RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import { toPng } from 'html-to-image';

type ViewMode = 'grid' | 'list' | 'large';
type PaginationItem = number | 'ellipsis';

interface ThumbnailCaptureTarget {
    id: string;
    name: string;
    previewUrl: string;
    nonce: number;
}

interface ThumbnailCaptureFrameProps {
    target: ThumbnailCaptureTarget | null;
    onGenerated: (projectId: string, path?: string) => void;
    onError: (projectId: string, message?: string) => void;
}

function ThumbnailCaptureFrame({ target, onGenerated, onError }: ThumbnailCaptureFrameProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const clearPendingCapture = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const handleLoad = useCallback(() => {
        if (!target) return;

        clearPendingCapture();
        const currentTarget = target;

        timeoutRef.current = setTimeout(async () => {
            try {
                const iframeDoc = iframeRef.current?.contentDocument;
                if (!iframeDoc?.body) {
                    throw new Error('Preview is not ready.');
                }

                await iframeDoc.fonts?.ready;

                const dataUrl = await toPng(iframeDoc.body, {
                    width: 800,
                    height: 600,
                    canvasWidth: 800,
                    canvasHeight: 600,
                    cacheBust: true,
                });

                const response = await axios.post<{ success: boolean; path?: string }>(`/project/${currentTarget.id}/thumbnail`, {
                    image: dataUrl,
                });

                onGenerated(currentTarget.id, response.data.path);
            } catch (error: any) {
                onError(currentTarget.id, error?.response?.data?.message || error?.message);
            }
        }, 1200);
    }, [clearPendingCapture, onError, onGenerated, target]);

    useEffect(() => {
        clearPendingCapture();
    }, [target, clearPendingCapture]);

    if (!target) {
        return null;
    }

    const separator = target.previewUrl.includes('?') ? '&' : '?';

    return (
        <div aria-hidden className="fixed left-[-10000px] top-0 h-[600px] w-[800px] overflow-hidden opacity-0 pointer-events-none">
            <iframe
                ref={iframeRef}
                key={`${target.id}-${target.nonce}`}
                src={`${target.previewUrl}${separator}thumbnail=${target.nonce}`}
                title={`Thumbnail preview for ${target.name}`}
                className="h-[600px] w-[800px] border-0"
                sandbox="allow-scripts allow-same-origin"
                onLoad={handleLoad}
            />
        </div>
    );
}

interface ProjectCardProps {
    project: Project;
    isTrash?: boolean;
    thumbnailUrl?: string | null;
    isGeneratingThumbnail?: boolean;
    canGenerateThumbnail?: boolean;
    onToggleStar?: (id: string) => void;
    onRename?: (project: Project) => void;
    onDuplicate?: (id: string) => void;
    onDelete?: (project: Project) => void;
    onRestore?: (id: string) => void;
    onPermanentDelete?: (id: string) => void;
    onGenerateThumbnail?: (project: Project) => void;
}

function ProjectCard({
    project,
    isTrash = false,
    thumbnailUrl,
    isGeneratingThumbnail = false,
    canGenerateThumbnail = false,
    onToggleStar,
    onRename,
    onDuplicate,
    onDelete,
    onRestore,
    onPermanentDelete,
    onGenerateThumbnail,
}: ProjectCardProps) {
    const { t } = useTranslation();
    const hasThumbnail = Boolean(thumbnailUrl);

    const formatEditedTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return t('Edited today');
        if (diffDays === 1) return t('Edited yesterday');
        return t('Edited :days days ago', { days: diffDays });
    };

    return (
        <div className="group relative">
            <Link href={isTrash ? '#' : `/project/${project.id}`} className={isTrash ? 'pointer-events-none' : ''}>
                <div className="relative aspect-[4/3] rounded-xl border bg-card overflow-hidden mb-3 hover:shadow-lg transition-shadow">
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={project.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                            <Folder className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                    )}
                    {isGeneratingThumbnail && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm">
                            <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2 text-xs font-medium shadow-sm">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {t('Generating thumbnail')}
                            </div>
                        </div>
                    )}
                </div>
            </Link>

            {/* Actions dropdown */}
            <TableActionMenu>
                <TableActionMenuTrigger className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background h-8 w-8 p-0" />
                <TableActionMenuContent>
                    {isTrash ? (
                        <>
                            <TableActionMenuItem onClick={() => onRestore?.(project.id)}>
                                <RotateCcw className="h-4 w-4 me-2" />
                                {t('Restore')}
                            </TableActionMenuItem>
                            <TableActionMenuItem
                                onClick={() => onPermanentDelete?.(project.id)}
                                variant="destructive"
                            >
                                <Trash2 className="h-4 w-4 me-2" />
                                {t('Delete permanently')}
                            </TableActionMenuItem>
                        </>
                    ) : (
                        <>
                            <TableActionMenuItem onClick={() => onToggleStar?.(project.id)}>
                                {project.is_starred ? (
                                    <>
                                        <StarOff className="h-4 w-4 me-2" />
                                        {t('Remove from favorites')}
                                    </>
                                ) : (
                                    <>
                                        <Star className="h-4 w-4 me-2" />
                                        {t('Add to favorites')}
                                    </>
                                )}
                            </TableActionMenuItem>
                            <TableActionMenuItem onClick={() => onRename?.(project)}>
                                <Pencil className="h-4 w-4 me-2" />
                                {t('Rename')}
                            </TableActionMenuItem>
                            <TableActionMenuItem onClick={() => onDuplicate?.(project.id)}>
                                <Copy className="h-4 w-4 me-2" />
                                {t('Duplicate')}
                            </TableActionMenuItem>
                            <TableActionMenuItem
                                onClick={() => onGenerateThumbnail?.(project)}
                                disabled={!canGenerateThumbnail || isGeneratingThumbnail}
                                className={!canGenerateThumbnail ? 'opacity-50' : undefined}
                            >
                                {isGeneratingThumbnail ? (
                                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                ) : hasThumbnail ? (
                                    <RefreshCw className="h-4 w-4 me-2" />
                                ) : (
                                    <ImagePlus className="h-4 w-4 me-2" />
                                )}
                                {hasThumbnail ? t('Regenerate thumbnail') : t('Generate thumbnail')}
                            </TableActionMenuItem>
                            <TableActionMenuSeparator />
                            <TableActionMenuItem
                                onClick={() => onDelete?.(project)}
                                variant="destructive"
                            >
                                <Trash2 className="h-4 w-4 me-2" />
                                {t('Move to trash')}
                            </TableActionMenuItem>
                        </>
                    )}
                </TableActionMenuContent>
            </TableActionMenu>

            {/* Star indicator */}
            {project.is_starred && !isTrash && (
                <Star className="absolute top-2 start-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}

            <div>
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                    {project.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {isTrash && project.deleted_at
                        ? t('Deleted :time', { time: formatEditedTime(project.deleted_at).replace(t('Edited '), '') })
                        : formatEditedTime(project.updated_at)}
                </p>
            </div>
        </div>
    );
}

export default function ProjectsIndex({ auth, projects, counts, activeTab, filters, baseDomain }: ProjectsPageProps) {
    const user = auth.user!;
    const { isLoading } = usePageLoading();
    const { t } = useTranslation();

    // Get shared props for real-time features
    const { broadcastConfig, userCredits, unreadNotificationCount } = usePage<PageProps & {
        broadcastConfig: BroadcastConfig | null;
        userCredits: UserCredits | null;
        unreadNotificationCount: number;
    }>().props;

    // Notification state
    const {
        notifications,
        unreadCount,
        isLoading: isLoadingNotifications,
        addNotification,
        markAsRead,
        markAllAsRead,
    } = useNotifications(unreadNotificationCount);

    // Credits state
    const [credits, setCredits] = useState<UserCredits | null>(userCredits);

    // Real-time project status updates
    const [projectStatuses, setProjectStatuses] = useState<Record<string, Project['build_status']>>({});
    const [thumbnailQueue, setThumbnailQueue] = useState<ThumbnailCaptureTarget[]>([]);
    const [activeThumbnailTarget, setActiveThumbnailTarget] = useState<ThumbnailCaptureTarget | null>(null);
    const [generatingThumbnailIds, setGeneratingThumbnailIds] = useState<Set<string>>(() => new Set());
    const [generatedThumbnailOverrides, setGeneratedThumbnailOverrides] = useState<Record<string, { path: string; timestamp: number }>>({});

    // Subscribe to user channel for real-time updates
    useUserChannel({
        userId: user.id,
        broadcastConfig,
        enabled: !!broadcastConfig?.key,
        onNotification: (notification: UserNotification) => {
            addNotification(notification);
            // Show toast for important notifications
            if (notification.type === 'credits_low') {
                toast(notification.title, {
                    description: notification.message,
                });
            }
        },
        onCreditsUpdated: (updated) => {
            setCredits({
                remaining: updated.remaining,
                monthlyLimit: updated.monthlyLimit,
                isUnlimited: updated.isUnlimited,
                usingOwnKey: updated.usingOwnKey,
            });
        },
        onProjectStatus: (status: ProjectStatusEvent) => {
            setProjectStatuses(prev => ({
                ...prev,
                [status.project_id]: status.build_status as Project['build_status'],
            }));
        },
    });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [projectToRename, setProjectToRename] = useState<Project | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [trashDialogOpen, setTrashDialogOpen] = useState(false);
    const [projectToTrash, setProjectToTrash] = useState<string | null>(null);
    const [projectToTrashInfo, setProjectToTrashInfo] = useState<{
        subdomain: string | null;
        customDomain: string | null;
    } | null>(null);
    const [searchValue, setSearchValue] = useState(filters.search || '');
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const [isDraggingHtml, setIsDraggingHtml] = useState(false);
    const [isCreatingFromDrop, setIsCreatingFromDrop] = useState(false);
    const dragCounter = useRef(0);
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('projects-view') as ViewMode) || 'grid';
        }
        return 'grid';
    });

    // Persist view mode to localStorage
    useEffect(() => {
        localStorage.setItem('projects-view', viewMode);
    }, [viewMode]);

    // Helper function to get thumbnail URL with cache busting
    const getThumbnailUrl = useCallback((project: Project): string | null => {
        const override = generatedThumbnailOverrides[project.id];
        const thumbnail = override?.path || project.thumbnail;

        if (!thumbnail) return null;

        // Cache buster based on updated_at
        const cacheVersion = override?.timestamp || (project.updated_at ? new Date(project.updated_at).getTime() : null);
        const cacheBuster = cacheVersion ? `?v=${cacheVersion}` : '';

        // If already a full URL, return as-is
        if (thumbnail.startsWith('http')) {
            return thumbnail + cacheBuster;
        }
        if (thumbnail.startsWith('/storage/')) {
            return thumbnail + cacheBuster;
        }
        // Prepend /storage/ for local storage paths
        return `/storage/${thumbnail}${cacheBuster}`;
    }, [generatedThumbnailOverrides]);

    useEffect(() => {
        if (activeThumbnailTarget || thumbnailQueue.length === 0) {
            return;
        }

        const [nextTarget, ...remainingTargets] = thumbnailQueue;
        setActiveThumbnailTarget(nextTarget);
        setThumbnailQueue(remainingTargets);
    }, [activeThumbnailTarget, thumbnailQueue]);

    const enqueueThumbnailTargets = useCallback((targets: ThumbnailCaptureTarget[]) => {
        if (targets.length === 0) {
            return;
        }

        setGeneratingThumbnailIds(prev => {
            const next = new Set(prev);
            targets.forEach(target => next.add(target.id));
            return next;
        });

        setThumbnailQueue(prev => {
            const queuedIds = new Set(prev.map(target => target.id));
            if (activeThumbnailTarget) {
                queuedIds.add(activeThumbnailTarget.id);
            }

            const uniqueTargets = targets.filter(target => !queuedIds.has(target.id));
            return [...prev, ...uniqueTargets];
        });
    }, [activeThumbnailTarget]);

    const handleGenerateThumbnail = useCallback((project: Project) => {
        if (!project.preview_url) {
            toast.error(t('Build or open the project preview before generating a thumbnail.'));
            return;
        }

        if (generatingThumbnailIds.has(project.id)) {
            return;
        }

        enqueueThumbnailTargets([{
            id: project.id,
            name: project.name,
            previewUrl: project.preview_url,
            nonce: Date.now(),
        }]);
    }, [enqueueThumbnailTargets, generatingThumbnailIds, t]);

    const handleGenerateMissingThumbnails = useCallback(() => {
        const targets = projects.data
            .filter(project => !getThumbnailUrl(project) && project.preview_url && !generatingThumbnailIds.has(project.id))
            .map((project, index) => ({
                id: project.id,
                name: project.name,
                previewUrl: project.preview_url as string,
                nonce: Date.now() + index,
            }));

        if (targets.length === 0) {
            toast.info(t('No visible projects need thumbnails.'));
            return;
        }

        enqueueThumbnailTargets(targets);
        toast.info(t('Generating thumbnails for :count projects', { count: targets.length }));
    }, [enqueueThumbnailTargets, generatingThumbnailIds, getThumbnailUrl, projects.data, t]);

    const handleThumbnailGenerated = useCallback((projectId: string, path?: string) => {
        if (path) {
            setGeneratedThumbnailOverrides(prev => ({
                ...prev,
                [projectId]: { path, timestamp: Date.now() },
            }));
        }

        setGeneratingThumbnailIds(prev => {
            const next = new Set(prev);
            next.delete(projectId);
            return next;
        });
        setActiveThumbnailTarget(null);
        toast.success(t('Thumbnail generated'));
    }, [t]);

    const handleThumbnailError = useCallback((projectId: string, message?: string) => {
        setGeneratingThumbnailIds(prev => {
            const next = new Set(prev);
            next.delete(projectId);
            return next;
        });
        setActiveThumbnailTarget(null);
        toast.error(message || t('Failed to generate thumbnail'));
    }, [t]);

    // Handle filter changes with URL navigation
    const handleFilterChange = useCallback((newFilters: Partial<{ search?: string; sort?: ProjectSort; visibility?: ProjectVisibility | null; per_page?: number }>) => {
        const url = activeTab === 'trash' ? '/projects/trash' : '/projects';
        const params: Record<string, string | number> = {};

        // Preserve tab for non-trash
        if (activeTab !== 'trash' && activeTab !== 'all') {
            params.tab = activeTab;
        }

        // Build search param
        const searchVal = newFilters.search !== undefined ? newFilters.search : filters.search;
        if (searchVal) params.search = searchVal;

        // Build sort param
        const sortVal = newFilters.sort !== undefined ? newFilters.sort : filters.sort;
        if (sortVal && sortVal !== 'last-edited') params.sort = sortVal;

        // Build visibility param (not for trash)
        if (activeTab !== 'trash') {
            const visibilityVal = newFilters.visibility !== undefined ? newFilters.visibility : filters.visibility;
            if (visibilityVal) params.visibility = visibilityVal;
        }

        const perPageVal = newFilters.per_page !== undefined ? newFilters.per_page : filters.per_page;
        if (perPageVal && perPageVal !== 12) params.per_page = perPageVal;

        router.get(url, params, { preserveState: true, preserveScroll: true });
    }, [activeTab, filters]);

    // Debounced search handler
    const handleSearchChange = (value: string) => {
        setSearchValue(value);

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            handleFilterChange({ search: value });
        }, 300);
    };

    const handleTabChange = (tab: string) => {
        const params: Record<string, string | number> = {};
        if (filters.per_page && filters.per_page !== 12) {
            params.per_page = filters.per_page;
        }

        if (tab === 'trash') {
            router.get('/projects/trash', params);
        } else {
            if (tab !== 'all') {
                params.tab = tab;
            }
            router.get('/projects', params);
        }
    };

    const handleSortChange = (sort: ProjectSort) => {
        handleFilterChange({ sort });
    };

    const handleVisibilityChange = (visibility: string) => {
        handleFilterChange({ visibility: visibility === 'any' ? null : visibility as ProjectVisibility });
    };

    const handlePerPageChange = (perPage: string) => {
        handleFilterChange({ per_page: Number(perPage) });
    };

    const handlePageChange = (page: number) => {
        const url = activeTab === 'trash' ? '/projects/trash' : '/projects';
        const params: Record<string, string | number> = { page };

        if (activeTab !== 'trash' && activeTab !== 'all') {
            params.tab = activeTab;
        }
        if (filters.search) params.search = filters.search;
        if (filters.sort && filters.sort !== 'last-edited') params.sort = filters.sort;
        if (filters.visibility && activeTab !== 'trash') params.visibility = filters.visibility;
        if (filters.per_page && filters.per_page !== 12) params.per_page = filters.per_page;

        router.get(url, params, { preserveState: true, preserveScroll: true });
    };

    const handleToggleStar = (id: string) => {
        router.post(`/projects/${id}/toggle-star`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Project updated')),
            onError: () => toast.error(t('Failed to update project')),
        });
    };

    const handleRename = (project: Project) => {
        setProjectToRename(project);
        setRenameValue(project.name);
        setRenameDialogOpen(true);
    };

    const submitRename = (e: FormEvent) => {
        e.preventDefault();

        if (!projectToRename || renameValue.trim() === '') {
            return;
        }

        setIsRenaming(true);
        router.put(`/projects/${projectToRename.id}/rename`, {
            name: renameValue.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Project renamed'));
                setRenameDialogOpen(false);
                setProjectToRename(null);
                setRenameValue('');
            },
            onError: () => toast.error(t('Failed to rename project')),
            onFinish: () => setIsRenaming(false),
        });
    };

    const handleDuplicate = (id: string) => {
        router.post(`/projects/${id}/duplicate`, {}, {
            onSuccess: () => toast.success(t('Project duplicated')),
            onError: () => toast.error(t('Failed to duplicate project')),
        });
    };

    const handleDelete = (project: Project) => {
        // Check if project has published domains
        if (project.subdomain || project.custom_domain) {
            setProjectToTrash(project.id);
            setProjectToTrashInfo({
                subdomain: project.subdomain ?? null,
                customDomain: project.custom_domain ?? null,
            });
            setTrashDialogOpen(true);
        } else {
            // No published domains, delete directly
            performDelete(project.id);
        }
    };

    const performDelete = (id: string) => {
        router.delete(`/projects/${id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Project moved to trash'));
                setTrashDialogOpen(false);
                setProjectToTrash(null);
                setProjectToTrashInfo(null);
            },
            onError: () => toast.error(t('Failed to delete project')),
        });
    };

    const extractHtmlTitle = (html: string): string => {
        const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return match ? match[1].trim() : '';
    };

    const isHtmlDrag = (e: React.DragEvent) =>
        Array.from(e.dataTransfer.items).some(
            (item) => item.kind === 'file' && (item.type === 'text/html' || item.type === '')
        );

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current++;
        if (isHtmlDrag(e)) setIsDraggingHtml(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDraggingHtml(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsDraggingHtml(false);

        const file = Array.from(e.dataTransfer.files).find(
            (f) => f.name.endsWith('.html') || f.name.endsWith('.htm') || f.type === 'text/html'
        );

        if (!file) return;

        setIsCreatingFromDrop(true);
        try {
            const html = await file.text();
            const title = extractHtmlTitle(html) || file.name.replace(/\.html?$/i, '');

            const response = await axios.post('/api/blank-project/code', { name: title, html });
            toast.success(t('Project created from HTML file'));
            router.visit(response.data.redirect_url || `/project/${response.data.project.id}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error || t('Failed to create project from file'));
        } finally {
            setIsCreatingFromDrop(false);
        }
    };

    const handleCreateBlankProject = () => {
        router.post(route('blank-project.create'), {
            name: `${t('Manual Hosting Project')} ${new Date().toLocaleDateString()}`,
        }, {
            onSuccess: () => {
                toast.success(t('Manual hosting project created successfully'));
            },
            onError: () => toast.error(t('Failed to create project')),
        });
    };

    const handleRestore = (id: string) => {
        router.post(`/projects/${id}/restore`, {}, {
            onSuccess: () => toast.success(t('Project restored')),
            onError: () => toast.error(t('Failed to restore project')),
        });
    };

    const handlePermanentDelete = (id: string) => {
        setProjectToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmPermanentDelete = () => {
        if (projectToDelete) {
            router.delete(`/projects/${projectToDelete}/force-delete`, {
                onSuccess: () => toast.success(t('Project permanently deleted')),
                onError: () => toast.error(t('Failed to delete project')),
            });
        }
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
    };

    const getEmptyMessage = () => {
        if (filters.search) {
            return t('No projects match your search.');
        }
        switch (activeTab) {
            case 'favorites':
                return t('No favorite projects yet. Star a project to add it here.');
            case 'trash':
                return t('Trash is empty.');
            default:
                return t('No projects yet. Create your first project to get started.');
        }
    };

    // Grid classes based on view mode
    const getGridClasses = () => {
        switch (viewMode) {
            case 'large':
                return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
            case 'list':
                return 'grid-cols-1';
            default: // grid
                return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        }
    };

    const currentPerPage = String(filters.per_page ?? projects.per_page ?? 12);
    const visibleMissingThumbnailCount = projects.data.filter(
        project => !getThumbnailUrl(project) && project.preview_url && !generatingThumbnailIds.has(project.id)
    ).length;
    const paginationItems = useMemo<PaginationItem[]>(() => {
        const total = projects.last_page;
        const current = projects.current_page;

        if (total <= 7) {
            return Array.from({ length: total }, (_, index) => index + 1);
        }

        const pages = new Set<number>([1, total, current, current - 1, current + 1]);

        if (current <= 4) {
            [2, 3, 4, 5].forEach(page => pages.add(page));
        }

        if (current >= total - 3) {
            [total - 4, total - 3, total - 2, total - 1].forEach(page => pages.add(page));
        }

        const sortedPages = Array.from(pages)
            .filter(page => page >= 1 && page <= total)
            .sort((a, b) => a - b);

        const items: PaginationItem[] = [];
        let previousPage = 0;

        sortedPages.forEach(page => {
            if (previousPage > 0 && page - previousPage > 1) {
                items.push('ellipsis');
            }
            items.push(page);
            previousPage = page;
        });

        return items;
    }, [projects.current_page, projects.last_page]);

    return (
        <>
            <Head title={t('My Projects')} />

            <ThumbnailCaptureFrame
                target={activeThumbnailTarget}
                onGenerated={handleThumbnailGenerated}
                onError={handleThumbnailError}
            />

            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar user={user} />
                    <SidebarInset className="bg-transparent">
                        <div className="relative min-h-screen bg-background">
                            <AnimatedBackground />

                            {/* Header */}
                            <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4">
                                <div className="flex items-center gap-2">
                                    <SidebarTrigger />
                                    {credits && <GlobalCredits {...credits} />}
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
                            <main
                                className="relative z-10 p-4 md:p-6 lg:p-8"
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            >
                                {/* HTML drag overlay */}
                                {isDraggingHtml && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl pointer-events-none">
                                        <div className="text-center">
                                            <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
                                            <p className="text-lg font-semibold text-primary">{t('Drop HTML file to create project')}</p>
                                        </div>
                                    </div>
                                )}
                                {/* Creating from drop overlay */}
                                {isCreatingFromDrop && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 rounded-xl">
                                        <div className="text-center">
                                            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
                                            <p className="text-sm text-muted-foreground">{t('Creating project...')}</p>
                                        </div>
                                    </div>
                                )}
                                {isLoading ? (
                                    <ProjectsSkeleton />
                                ) : (
                                <div className="max-w-7xl mx-auto">
                                    {/* Page Header */}
                                    <div className="prose prose-sm dark:prose-invert mb-6">
                                        <h1 className="text-2xl font-bold text-foreground">
                                            {t('My Projects')}
                                        </h1>
                                        <p className="text-muted-foreground mt-2">
                                            {t('Manage and organize all your creative work')}
                                        </p>
                                    </div>

                                    {/* Tabs */}
                                    <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
                                        <TabsList>
                                            <TabsTrigger value="all">
                                                {t('All Projects')}
                                                {counts.all > 0 && (
                                                    <span className="ms-2 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
                                                        {counts.all}
                                                    </span>
                                                )}
                                            </TabsTrigger>
                                            <TabsTrigger value="favorites">
                                                <Star className="h-4 w-4 me-1" />
                                                {t('Favorites')}
                                                {counts.favorites > 0 && (
                                                    <span className="ms-2 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
                                                        {counts.favorites}
                                                    </span>
                                                )}
                                            </TabsTrigger>
                                            <TabsTrigger value="trash">
                                                <Trash2 className="h-4 w-4 me-1" />
                                                {t('Trash')}
                                                {counts.trash > 0 && (
                                                    <span className="ms-2 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
                                                        {counts.trash}
                                                    </span>
                                                )}
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>

                                    {/* Filter Bar */}
                                    <div className="flex flex-wrap items-center gap-3 mb-6">
                                        {/* Search */}
                                        <div className="relative w-full sm:w-auto sm:min-w-[280px]">
                                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder={t('Search projects...')}
                                                className="ps-9 bg-background"
                                                value={searchValue}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                            />
                                        </div>

                                        {/* Sort Dropdown */}
                                        <Select value={filters.sort} onValueChange={handleSortChange}>
                                            <SelectTrigger className="w-[140px] bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="last-edited">{t('Last edited')}</SelectItem>
                                                <SelectItem value="name">{t('Name')}</SelectItem>
                                                <SelectItem value="created">{t('Created')}</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Visibility Dropdown - hidden in trash */}
                                        {activeTab !== 'trash' && (
                                            <Select
                                                value={filters.visibility || 'any'}
                                                onValueChange={handleVisibilityChange}
                                            >
                                                <SelectTrigger className="w-[140px] bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">{t('Any visibility')}</SelectItem>
                                                    <SelectItem value="public">{t('Public')}</SelectItem>
                                                    <SelectItem value="private">{t('Private')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}

                                        <Select value={currentPerPage} onValueChange={handlePerPageChange}>
                                            <SelectTrigger className="w-[130px] bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="12">{t('12 per page')}</SelectItem>
                                                <SelectItem value="24">{t('24 per page')}</SelectItem>
                                                <SelectItem value="48">{t('48 per page')}</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Spacer */}
                                        <div className="flex-1" />

                                        {activeTab !== 'trash' && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={handleGenerateMissingThumbnails}
                                                disabled={visibleMissingThumbnailCount === 0}
                                            >
                                                <ImagePlus className="h-4 w-4" />
                                                {t('Generate thumbnails')}
                                            </Button>
                                        )}

                                        {/* Create Project Button */}
                                        {activeTab !== 'trash' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" className="gap-2">
                                                        <Plus className="h-4 w-4" />
                                                        {t('Create Project')}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => router.visit('/create')}>
                                                        <Zap className="h-4 w-4 me-2" />
                                                        {t('AI-Powered Project')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={handleCreateBlankProject}>
                                                        <Code2 className="h-4 w-4 me-2" />
                                                        {t('Manual Hosting Project')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}

                                        {/* View Toggle */}
                                        <div className="flex items-center border rounded-lg bg-background">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-9 w-9 rounded-e-none ${viewMode === 'large' ? 'bg-muted' : ''}`}
                                                onClick={() => setViewMode('large')}
                                            >
                                                <Maximize2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-9 w-9 rounded-none ${viewMode === 'grid' ? 'bg-muted' : ''}`}
                                                onClick={() => setViewMode('grid')}
                                            >
                                                <LayoutGrid className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-9 w-9 rounded-s-none ${viewMode === 'list' ? 'bg-muted' : ''}`}
                                                onClick={() => setViewMode('list')}
                                            >
                                                <List className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Trash notice */}
                                    {activeTab === 'trash' && (
                                        <div className="mb-6 p-4 bg-muted rounded-lg">
                                            <p className="text-sm text-muted-foreground">
                                                {t('Items in trash will be automatically deleted after 30 days.')}
                                            </p>
                                        </div>
                                    )}

                                    {/* Projects Grid */}
                                    <div className={`grid ${getGridClasses()} gap-6`}>
                                        {/* Project Cards */}
                                        {projects.data.map((project) => (
                                            <ProjectCard
                                                key={project.id}
                                                project={{
                                                    ...project,
                                                    build_status: projectStatuses[project.id] || project.build_status,
                                                }}
                                                isTrash={activeTab === 'trash'}
                                                thumbnailUrl={getThumbnailUrl(project)}
                                                isGeneratingThumbnail={generatingThumbnailIds.has(project.id)}
                                                canGenerateThumbnail={Boolean(project.preview_url)}
                                                onToggleStar={handleToggleStar}
                                                onRename={handleRename}
                                                onDuplicate={handleDuplicate}
                                                onDelete={handleDelete}
                                                onRestore={handleRestore}
                                                onPermanentDelete={handlePermanentDelete}
                                                onGenerateThumbnail={handleGenerateThumbnail}
                                            />
                                        ))}

                                        {/* Empty state */}
                                        {projects.data.length === 0 && activeTab !== 'trash' && (
                                            <div className="col-span-full">
                                                <div className="bg-card border border-border rounded-lg p-12 text-center">
                                                    <Folder className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                                                    <h3 className="text-xl font-semibold mb-2">{t('No Projects Yet')}</h3>
                                                    <p className="text-muted-foreground mb-8">
                                                        {t('Create your first project to get started')}
                                                    </p>
                                                    <div className="flex gap-3 justify-center flex-wrap">
                                                        <Button size="lg" onClick={() => router.visit('/create')} className="gap-2">
                                                            <Zap className="h-5 w-5" />
                                                            {t('Create AI Project')}
                                                        </Button>
                                                        <Button size="lg" variant="outline" onClick={handleCreateBlankProject} className="gap-2">
                                                            <Code2 className="h-5 w-5" />
                                                            {t('Create Manual Hosting Project')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty state for trash */}
                                        {projects.data.length === 0 && activeTab === 'trash' && (
                                            <div className="col-span-full text-center py-12">
                                                <p className="text-muted-foreground">
                                                    {t('Trash is empty.')}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    {projects.last_page > 1 && (
                                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                {projects.from && projects.to
                                                    ? t('Showing :from-:to of :total projects', {
                                                        from: projects.from,
                                                        to: projects.to,
                                                        total: projects.total,
                                                    })
                                                    : t(':total projects', { total: projects.total })}
                                            </p>
                                            <div className="flex flex-wrap items-center justify-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(projects.current_page - 1)}
                                                    disabled={projects.current_page === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4 me-1" />
                                                    {t('Previous')}
                                                </Button>
                                                {paginationItems.map((item, index) => item === 'ellipsis' ? (
                                                    <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                                                        ...
                                                    </span>
                                                ) : (
                                                    <Button
                                                        key={item}
                                                        variant={item === projects.current_page ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-9 min-w-9 px-3"
                                                        onClick={() => handlePageChange(item)}
                                                        disabled={item === projects.current_page}
                                                    >
                                                        {item}
                                                    </Button>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePageChange(projects.current_page + 1)}
                                                    disabled={projects.current_page === projects.last_page}
                                                >
                                                    {t('Next')}
                                                    <ChevronRight className="h-4 w-4 ms-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )}
                            </main>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </TooltipProvider>

            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Rename project')}</DialogTitle>
                        <DialogDescription>
                            {t('This name is shown in your projects list and admin views.')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitRename} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">{t('Project name')}</Label>
                            <Input
                                id="project-name"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                autoFocus
                                maxLength={255}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRenameDialogOpen(false)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={isRenaming || renameValue.trim() === ''}>
                                {isRenaming ? t('Saving...') : t('Save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Permanent delete confirmation dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Delete permanently?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('This action cannot be undone. This project will be permanently deleted.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmPermanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t('Delete permanently')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Trash warning dialog for published projects */}
            <AlertDialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Move to Trash?')}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>{t('This project is currently published and accessible at:')}</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {projectToTrashInfo?.subdomain && baseDomain && (
                                        <li><code className="text-xs bg-muted px-1 py-0.5 rounded">{projectToTrashInfo.subdomain}.{baseDomain}</code></li>
                                    )}
                                    {projectToTrashInfo?.customDomain && (
                                        <li><code className="text-xs bg-muted px-1 py-0.5 rounded">{projectToTrashInfo.customDomain}</code></li>
                                    )}
                                </ul>
                                <p className="text-destructive font-medium">
                                    {t('Moving to trash will make these URLs inaccessible.')}
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => projectToTrash && performDelete(projectToTrash)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t('Move to Trash')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Toaster />
        </>
    );
}
