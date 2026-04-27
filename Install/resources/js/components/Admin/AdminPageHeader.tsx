import { ReactNode } from 'react';

interface AdminPageHeaderProps {
    title: ReactNode;
    subtitle: string;
    action?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, action }: AdminPageHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-6">
            <div className="prose prose-sm dark:prose-invert">
                <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
