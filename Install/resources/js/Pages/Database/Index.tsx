import { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { usePageLoading } from '@/hooks/usePageLoading';
import { useTranslation } from '@/contexts/LanguageContext';
import { DatabaseSkeleton } from './DatabaseSkeleton';
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
import { AppSidebar } from '@/components/Sidebar/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { GlobalCredits } from '@/components/Header/GlobalCredits';
import { NotificationBell } from '@/components/Notifications/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { FirebaseBrowser } from '@/components/Firebase';
import { LogOut, Database, FolderOpen, AlertCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import type { DatabasePageProps as StoragePageProps, FirebaseConfig } from '@/types/storage';
import type { PageProps } from '@/types';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role?: 'admin' | 'user';
}

interface DatabasePageProps extends StoragePageProps {
    auth: {
        user: User;
    };
}

export default function DatabaseIndex({ auth, projects, firebaseEnabled, systemFirebaseConfig, adminSdkConfigured }: DatabasePageProps) {
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
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
        projects.length > 0 ? projects[0].id : null
    );
    const [projectConfig, setProjectConfig] = useState<FirebaseConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [projectAdminSdkConfigured, setProjectAdminSdkConfigured] = useState(false);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    // Fetch project's Firebase config when project changes
    useEffect(() => {
        if (!selectedProjectId || !selectedProject) {
            setProjectConfig(null);
            setProjectAdminSdkConfigured(false);
            return;
        }

        const fetchConfig = async () => {
            setLoadingConfig(true);
            try {
                // If project uses system Firebase, use system config
                if (selectedProject.uses_system_firebase) {
                    setProjectConfig(systemFirebaseConfig);
                    setProjectAdminSdkConfigured(adminSdkConfigured);
                } else if (selectedProject.has_custom_config) {
                    // Fetch project's custom config (includes admin_sdk_configured)
                    const response = await axios.get<{ config: FirebaseConfig | null; admin_sdk_configured?: boolean }>(
                        `/project/${selectedProjectId}/firebase/config`
                    );
                    setProjectConfig(response.data.config);
                    setProjectAdminSdkConfigured(response.data.admin_sdk_configured ?? false);
                } else {
                    setProjectConfig(null);
                    setProjectAdminSdkConfigured(false);
                }
            } catch {
                setProjectConfig(null);
                setProjectAdminSdkConfigured(false);
            } finally {
                setLoadingConfig(false);
            }
        };

        fetchConfig();
    }, [selectedProjectId, selectedProject, systemFirebaseConfig, adminSdkConfigured]);

    const handleProjectChange = (projectId: string) => {
        setSelectedProjectId(projectId);
    };

    // If Firebase is not enabled
    if (!firebaseEnabled) {
        return (
            <>
                <Head title={t('Database')} />

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
                                                {t('Firebase Database Not Available')}
                                            </h3>
                                            <p className="text-sm text-muted-foreground/70 text-center max-w-md">
                                                {t('Your current plan does not include Firebase database access. Upgrade your plan to enable Firebase Firestore for your projects.')}
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
            <Head title={t('Database')} />

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
                                    <DatabaseSkeleton />
                                ) : (
                                <div className="max-w-7xl mx-auto">
                                    {/* Page Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div>
                                            <h1 className="text-2xl font-bold text-foreground">
                                                {t('Database')}
                                            </h1>
                                            <p className="text-muted-foreground mt-1">
                                                {t('Manage your Firebase Firestore data')}
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

                                    {/* Projects List or Database Browser */}
                                    {projects.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-muted/20">
                                            <Database className="h-16 w-16 text-muted-foreground/30 mb-4" />
                                            <h3 className="text-lg font-medium text-muted-foreground mb-2">
                                                {t('No projects yet')}
                                            </h3>
                                            <p className="text-sm text-muted-foreground/70">
                                                {t('Create a project to start using Firebase')}
                                            </p>
                                            <Link
                                                href="/create"
                                                className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
                                            >
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
                                                            {t('Browse and manage Firestore collections')}
                                                        </CardDescription>
                                                    </div>
                                                    {projectConfig && (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                                                            <span className="h-2 w-2 rounded-full bg-green-500" />
                                                            {t('Connected')}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                {loadingConfig ? (
                                                    <div className="flex items-center justify-center py-16">
                                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : (
                                                    <FirebaseBrowser
                                                        config={projectConfig}
                                                        collectionPrefix={selectedProject.collection_prefix}
                                                        projectName={selectedProject.name}
                                                        projectId={selectedProject.id}
                                                        usesSystemFirebase={selectedProject.uses_system_firebase}
                                                        adminSdkConfigured={projectAdminSdkConfigured}
                                                    />
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
        </>
    );
}
