import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/contexts/LanguageContext';

type StatusType =
    | 'active'
    | 'inactive'
    | 'pending'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'expired'
    | 'refunded'
    | 'admin'
    | 'user'
    | 'success'
    | 'running';

interface StatusBadgeProps {
    status: StatusType;
    className?: string;
}

const statusStyles: Record<StatusType, string> = {
    active: 'bg-primary/10 text-primary hover:bg-primary/10',
    inactive: 'bg-muted text-muted-foreground hover:bg-muted',
    pending: 'bg-accent text-accent-foreground hover:bg-accent',
    completed: 'bg-primary/10 text-primary hover:bg-primary/10',
    failed: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
    cancelled: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
    expired: 'bg-muted text-muted-foreground hover:bg-muted',
    refunded: 'bg-warning/10 text-warning hover:bg-warning/10',
    admin: 'bg-primary/10 text-primary hover:bg-primary/10',
    user: 'bg-secondary text-secondary-foreground hover:bg-secondary',
    success: 'bg-success/10 text-success hover:bg-success/10',
    running: 'bg-info/10 text-info hover:bg-info/10',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    const { t } = useTranslation();

    const statusLabels: Record<StatusType, string> = {
        active: t('Active'),
        inactive: t('Inactive'),
        pending: t('Pending'),
        completed: t('Completed'),
        failed: t('Failed'),
        cancelled: t('Cancelled'),
        expired: t('Expired'),
        refunded: t('Refunded'),
        admin: t('Admin'),
        user: t('User'),
        success: t('Success'),
        running: t('Running'),
    };

    return (
        <Badge
            variant="secondary"
            className={`${statusStyles[status]} ${className}`}
        >
            {statusLabels[status]}
        </Badge>
    );
}
