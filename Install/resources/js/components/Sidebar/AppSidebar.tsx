import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    FolderOpen,
    Files,
    Database,
    LayoutTemplate,
    ChevronDown,
    LayoutDashboard,
    Users,
    CreditCard,
    Crown,
    Receipt,
    Package,
    Puzzle,
    Globe,
    Clock,
    Settings,
    Sparkles,
    Bot,
    Cpu,
    Paintbrush,
    Gift,
    Layout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApplicationLogo from '@/components/ApplicationLogo';
import { ShareDialog } from '@/components/Referral/ShareDialog';
import { PageProps } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';

interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role?: 'admin' | 'user';
}

interface AppSidebarProps {
    user: User;
}

const SCROLL_POSITION_KEY = 'sidebar-scroll-position';
const RECENT_COLLAPSED_KEY = 'sidebar-recent-collapsed';

export function AppSidebar({ user }: AppSidebarProps) {
    const { url, props } = usePage<PageProps>();
    const { t } = useTranslation();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const recentProjects = props.recentProjects;
    const hasUpgradablePlans = props.hasUpgradablePlans;

    // Share dialog state
    const [shareDialogOpen, setShareDialogOpen] = useState(false);

    // Recent collapsible state - persisted to localStorage
    const [recentOpen, setRecentOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(RECENT_COLLAPSED_KEY);
            return saved !== 'closed'; // Default to open
        }
        return true;
    });

    // Save recent collapsible state to localStorage
    useEffect(() => {
        localStorage.setItem(RECENT_COLLAPSED_KEY, recentOpen ? 'open' : 'closed');
    }, [recentOpen]);

    // Persist and restore scroll position across navigation
    // useLayoutEffect runs synchronously before paint to prevent visual flash
    useLayoutEffect(() => {
        const scrollArea = scrollAreaRef.current;
        if (!scrollArea) return;

        // Find the viewport element inside ScrollArea
        const viewport = scrollArea.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
        if (!viewport) return;

        // Restore scroll position
        const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
        if (savedPosition) {
            viewport.scrollTop = parseInt(savedPosition, 10);
        }

        // Save scroll position on scroll
        const handleScroll = () => {
            sessionStorage.setItem(SCROLL_POSITION_KEY, viewport.scrollTop.toString());
        };

        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
    }, []);

    const projectItems = [
        { titleKey: 'All Projects', href: '/projects', icon: FolderOpen },
        { titleKey: 'File Manager', href: '/file-manager', icon: Files },
        { titleKey: 'Database', href: '/database', icon: Database },
        { titleKey: 'Billing', href: '/billing', icon: CreditCard },
        { titleKey: 'Settings', href: '/profile', icon: Settings },
    ];

    const adminItems = [
        { titleKey: 'Overview', href: '/admin/overview', icon: LayoutDashboard },
        { titleKey: 'Users', href: '/admin/users', icon: Users },
        { titleKey: 'Subscriptions', href: '/admin/subscriptions', icon: Crown },
        { titleKey: 'Transactions', href: '/admin/transactions', icon: Receipt },
        { titleKey: 'Referrals', href: '/admin/referrals', icon: Gift },
        { titleKey: 'Plans', href: '/admin/plans', icon: Package },
        { titleKey: 'AI Builders', href: '/admin/ai-builders', icon: Bot },
        { titleKey: 'AI Providers', href: '/admin/ai-providers', icon: Cpu },
        { titleKey: 'AI Templates', href: '/admin/ai-templates', icon: LayoutTemplate },
        { titleKey: 'Landing Page', href: '/admin/landing-builder', icon: Layout },
        { titleKey: 'Plugins', href: '/admin/plugins', icon: Puzzle },
        { titleKey: 'Languages', href: '/admin/languages', icon: Globe },
        { titleKey: 'Cronjobs', href: '/admin/cronjobs', icon: Clock },
        { titleKey: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const isActive = (href: string) => url.startsWith(href);

    return (
        <Sidebar className="border-r group/sidebar">
            <SidebarHeader className="h-[60px] px-4 border-b flex-row items-center">
                <Link href="/create" className="flex items-center">
                    <ApplicationLogo showText size="lg" />
                </Link>
            </SidebarHeader>

            <SidebarContent className="!overflow-hidden flex-1">
                <div ref={scrollAreaRef} className="h-full">
                <ScrollArea className="h-full [&_[data-slot=scroll-area-scrollbar]]:opacity-0 [&_[data-slot=scroll-area-scrollbar]]:transition-opacity group-hover/sidebar:[&_[data-slot=scroll-area-scrollbar]]:opacity-100" type="always">
                    {/* Create Link */}
                    <SidebarGroup className="pt-4">
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={url === '/create'}>
                                        <Link href="/create">
                                            <Paintbrush className="h-4 w-4" />
                                            <span>{t('Create')}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Projects Section */}
                    <Collapsible defaultOpen className="group/collapsible">
                        <SidebarGroup>
                            <CollapsibleTrigger asChild>
                                <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-2 py-1.5 flex items-center justify-between">
                                    <span>{t('Projects')}</span>
                                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                                </SidebarGroupLabel>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {/* Recent Projects Collapsible */}
                                        {recentProjects && recentProjects.length > 0 && (
                                            <Collapsible open={recentOpen} onOpenChange={setRecentOpen}>
                                                <SidebarMenuItem>
                                                    <CollapsibleTrigger asChild>
                                                        <SidebarMenuButton className="group/recent">
                                                            <div className="relative h-4 w-4">
                                                                <Clock className="absolute h-4 w-4 opacity-100 group-hover/recent:opacity-0 transition-opacity" />
                                                                <ChevronDown className="absolute h-4 w-4 opacity-0 group-hover/recent:opacity-100 transition-opacity" />
                                                            </div>
                                                            <span>{t('Recent')}</span>
                                                        </SidebarMenuButton>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <div className="ml-4 mt-1 space-y-0.5">
                                                            {recentProjects.map((project) => {
                                                                const displayName = project.name.length > 25
                                                                    ? project.name.slice(0, 25) + '...'
                                                                    : project.name;
                                                                return (
                                                                    <div key={project.id} className="px-2">
                                                                        <Link
                                                                            href={`/project/${project.id}`}
                                                                            className="flex items-center h-8 px-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors overflow-hidden"
                                                                            title={project.name}
                                                                        >
                                                                            <span>{displayName}</span>
                                                                        </Link>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </CollapsibleContent>
                                                </SidebarMenuItem>
                                            </Collapsible>
                                        )}
                                        {projectItems.map((item) => (
                                            <SidebarMenuItem key={item.titleKey}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isActive(item.href)}
                                                >
                                                    <Link href={item.href}>
                                                        <item.icon className="h-4 w-4" />
                                                        <span>{t(item.titleKey)}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>

                    {/* Administration Section - Only visible to admins */}
                    {user.role === 'admin' && (
                        <Collapsible defaultOpen className="group/collapsible">
                            <SidebarGroup>
                                <CollapsibleTrigger asChild>
                                    <SidebarGroupLabel className="cursor-pointer hover:bg-accent rounded-md px-2 py-1.5 flex items-center justify-between">
                                        <span>{t('Administration')}</span>
                                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                                    </SidebarGroupLabel>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {adminItems.map((item) => (
                                                <SidebarMenuItem key={item.titleKey}>
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={isActive(item.href)}
                                                    >
                                                        <Link href={item.href}>
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{t(item.titleKey)}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </CollapsibleContent>
                            </SidebarGroup>
                        </Collapsible>
                    )}
                </ScrollArea>
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t p-4 space-y-2">
                <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-2 border-dashed hover:border-solid hover:bg-accent/50 overflow-hidden"
                    size="sm"
                    onClick={() => setShareDialogOpen(true)}
                >
                    <Gift className="h-4 w-4 me-2 shrink-0 text-primary" />
                    <div className="flex flex-col items-start overflow-hidden">
                        <span className="truncate max-w-full">{t('Invite Friends')}</span>
                        <span className="text-xs font-normal text-muted-foreground truncate max-w-full">{t('Earn credits for referrals')}</span>
                    </div>
                </Button>
                <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
                {hasUpgradablePlans && (
                    <Button asChild className="w-full justify-start h-auto py-2 overflow-hidden" size="sm">
                        <Link href="/billing/plans">
                            <Sparkles className="h-4 w-4 me-2 shrink-0" />
                            <div className="flex flex-col items-start overflow-hidden">
                                <span className="truncate max-w-full">{t('Upgrade your Plan')}</span>
                                <span className="text-xs font-normal opacity-70 truncate max-w-full">{t('Unlock more benefits')}</span>
                            </div>
                        </Link>
                    </Button>
                )}
            </SidebarFooter>
        </Sidebar>
    );
}
