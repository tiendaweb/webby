import { PropsWithChildren, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
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
import { AppSidebar } from '@/components/Sidebar/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { NotificationBell } from '@/components/Notifications/NotificationBell';
import { GlobalCredits } from '@/components/Header/GlobalCredits';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserChannel } from '@/hooks/useUserChannel';
import { User, PageProps } from '@/types';
import type { UserCredits, UserNotification } from '@/types/notifications';
import type { BroadcastConfig } from '@/hooks/useBuilderPusher';
import { LogOut } from 'lucide-react';
import { AdminDemoBanner } from '@/Layouts/AdminDemoBanner';
import { DemoResetNotice } from '@/components/DemoResetNotice';

interface AdminLayoutProps extends PropsWithChildren {
    user: User;
    title: string;
}

export default function AdminLayout({ user, title, children }: AdminLayoutProps) {
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
    });

    return (
        <>
            <Head title={title} />

            <TooltipProvider>
                <SidebarProvider>
                    <AppSidebar user={user} />
                    <SidebarInset>
                        <div className="min-h-screen bg-muted/50">
                            {/* Header */}
                            <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b bg-background px-4">
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
                                        <div className="text-right hidden sm:block">
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
                                                <LogOut className="h-4 w-4 mr-2" />
                                                Log out
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </header>

                            <AdminDemoBanner />
                            {user.role === 'admin' && <DemoResetNotice variant="admin" />}

                            {/* Main Content */}
                            <main className="p-4 md:p-6 lg:p-8">
                                <div className="max-w-7xl mx-auto">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </TooltipProvider>
            <Toaster />
        </>
    );
}
