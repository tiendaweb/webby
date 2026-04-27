import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { PageProps } from '@/types';

export default function ImpersonationBanner() {
    const { impersonating, auth } = usePage<PageProps>().props;
    const { t } = useTranslation();

    useEffect(() => {
        const root = document.documentElement;

        if (impersonating) {
            root.setAttribute('data-impersonating', '');
            root.style.setProperty('--impersonation-banner-height', '52px');
        } else {
            root.removeAttribute('data-impersonating');
            root.style.removeProperty('--impersonation-banner-height');
        }

        return () => {
            root.removeAttribute('data-impersonating');
            root.style.removeProperty('--impersonation-banner-height');
        };
    }, [impersonating]);

    if (!impersonating) return null;

    const handleStop = () => {
        router.post(route('impersonate.stop'));
    };

    return (
        <div
            role="alert"
            className="fixed top-0 inset-x-0 z-[100] border-b border-amber-600 bg-amber-500 text-white dark:bg-amber-600 dark:border-amber-700"
        >
            <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Eye className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium truncate">
                        {t('You are impersonating :name', {
                            name: auth.user?.name ?? '',
                        })}
                    </span>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleStop}
                    className="shrink-0 h-7 text-xs"
                >
                    {t('Stop Impersonating')}
                </Button>
            </div>
        </div>
    );
}
