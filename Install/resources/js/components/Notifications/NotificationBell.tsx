import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Bell,
    AlertTriangle,
    CreditCard,
    Clock,
    Globe,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserNotification, NotificationType } from '@/types/notifications';

interface NotificationBellProps {
    notifications: UserNotification[];
    unreadCount: number;
    onMarkAsRead: (id: number) => void;
    onMarkAllAsRead: () => void;
    isLoading?: boolean;
}

interface Position {
    top: number;
    left: number;
}

function formatTimeAgo(dateString: string, t: (key: string, replacements?: Record<string, string | number>) => string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return t('just now');
    if (diffMinutes === 1) return t('1 minute ago');
    if (diffMinutes < 60) return t(':count minutes ago', { count: diffMinutes });
    if (diffHours === 1) return t('1 hour ago');
    if (diffHours < 24) return t(':count hours ago', { count: diffHours });
    if (diffDays === 1) return t('yesterday');
    return t(':count days ago', { count: diffDays });
}

function getNotificationIcon(type: NotificationType) {
    switch (type) {
        case 'credits_low':
            return <AlertTriangle className="h-4 w-4 text-warning" />;
        case 'subscription_renewed':
        case 'payment_completed':
            return <CreditCard className="h-4 w-4 text-primary" />;
        case 'subscription_expired':
            return <Clock className="h-4 w-4 text-muted-foreground" />;
        case 'domain_verified':
        case 'ssl_provisioned':
            return <Globe className="h-4 w-4 text-success" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
}

export function NotificationBell({
    notifications,
    unreadCount,
    onMarkAsRead,
    onMarkAllAsRead,
    isLoading = false,
}: NotificationBellProps) {
    const { t, isRtl } = useTranslation();
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<Position | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuWidth = 320; // w-80 = 20rem = 320px

    const handleToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();

        if (!open) {
            setPosition({
                top: rect.bottom + 4,
                left: isRtl ? rect.left : rect.right - menuWidth,
            });
        }
        setOpen(!open);
    }, [open, isRtl, menuWidth]);

    // Close on click outside, escape, and scroll
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const dropdownContent = document.querySelector('[data-notification-bell-content]');

            // Check if click is within the dropdown content (including scrollbar area)
            if (dropdownContent) {
                const rect = dropdownContent.getBoundingClientRect();
                const isWithinBounds =
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom;

                if (isWithinBounds) return;
            }

            // Close if clicking outside the menu content and trigger
            if (!target.closest('[data-notification-bell-content]') && !target.closest('[data-notification-bell-trigger]')) {
                setOpen(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        const handleScroll = (e: Event) => {
            // Don't close if scrolling within the dropdown
            const target = e.target as HTMLElement;
            if (target.closest('[data-notification-bell-content]')) {
                return;
            }
            setOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [open]);

    const handleNotificationClick = (notification: UserNotification) => {
        if (!notification.read_at) {
            onMarkAsRead(notification.id);
        }
        if (notification.action_url) {
            router.visit(notification.action_url);
            setOpen(false);
        }
    };

    return (
        <div className="relative">
            <Button
                ref={triggerRef}
                variant="ghost"
                size="icon"
                className="relative"
                onClick={handleToggle}
                aria-expanded={open}
                aria-haspopup="menu"
                data-notification-bell-trigger
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -end-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {open && position && createPortal(
                <div
                    role="menu"
                    data-notification-bell-content
                    className="fixed z-50 w-80 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                    style={{ top: position.top, left: position.left }}
                >
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                        <span className="font-medium text-sm">{t('Notifications')}</span>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-1 px-2 text-xs"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onMarkAllAsRead();
                                }}
                            >
                                {t('Mark all as read')}
                            </Button>
                        )}
                    </div>
                    <ScrollArea className="h-[300px]">
                        {isLoading ? (
                            <div className="p-4 text-center text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                {t('No notifications')}
                            </div>
                        ) : (
                            <div className="py-1">
                                {notifications.filter((n) => n.type !== 'build_complete' && n.type !== 'build_failed').map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            'px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-0',
                                            !notification.read_at && 'bg-muted/50'
                                        )}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5 shrink-0">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatTimeAgo(notification.created_at, t)}
                                                </p>
                                            </div>
                                            {!notification.read_at && (
                                                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>,
                document.body
            )}
        </div>
    );
}
