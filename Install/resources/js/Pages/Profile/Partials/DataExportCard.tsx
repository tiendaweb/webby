import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface DataExportCardProps {
    className?: string;
    dataExportEnabled: boolean;
    pendingExport: {
        status: string;
        expires_at: string | null;
        download_token: string | null;
    } | null;
    hoursUntilNextExport: number;
}

export default function DataExportCard({
    className = '',
    dataExportEnabled,
    pendingExport,
    hoursUntilNextExport,
}: DataExportCardProps) {
    const { t } = useTranslation();
    const { post, processing } = useForm({});

    const handleRequestExport = () => {
        post(route('data-export.request'), {
            onSuccess: () => toast.success(t('Export requested. You will receive an email when ready.')),
            onError: () => toast.error(t('Failed to request data export')),
        });
    };

    if (!dataExportEnabled) {
        return null;
    }

    const canRequestExport = hoursUntilNextExport === 0;
    const hasDownloadableExport = pendingExport?.status === 'completed' && pendingExport.download_token;

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-foreground">
                    {t('Download Your Data')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('Request a copy of all your personal data in a portable format.')}
                </p>
            </header>

            <div className="mt-6 space-y-4">
                {hasDownloadableExport && (
                    <div className="rounded-md bg-success/5 p-4">
                        <div className="flex">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-success">
                                    {t('Your data export is ready!')}
                                </p>
                                <p className="mt-1 text-sm text-success/80">
                                    {pendingExport.expires_at && (
                                        <>{t('Download available until :date', { date: new Date(pendingExport.expires_at).toLocaleDateString() })}</>
                                    )}
                                </p>
                            </div>
                            <div className="ms-4">
                                <a
                                    href={route('data-export.download', { token: pendingExport.download_token })}
                                    className="inline-flex items-center rounded-md bg-success px-3 py-2 text-sm font-semibold text-success-foreground shadow-sm hover:bg-success/90"
                                >
                                    <Download className="me-2 h-4 w-4" />
                                    {t('Download')}
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {pendingExport?.status === 'pending' && (
                    <div className="rounded-md bg-info/5 p-4">
                        <p className="text-sm text-info">
                            {t("Your data export is being prepared. You will receive an email when it's ready.")}
                        </p>
                    </div>
                )}

                {pendingExport?.status === 'processing' && (
                    <div className="rounded-md bg-warning/5 p-4">
                        <p className="text-sm text-warning">
                            {t('Your data export is currently being processed. Please check back soon.')}
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleRequestExport}
                        disabled={!canRequestExport || processing}
                    >
                        {processing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        {t('Request Data Export')}
                    </Button>

                    {!canRequestExport && hoursUntilNextExport > 0 && (
                        <p className="text-sm text-muted-foreground">
                            {t('You can request another export in :hours hours.', { hours: hoursUntilNextExport })}
                        </p>
                    )}
                </div>

                <p className="text-xs text-muted-foreground">
                    {t('The export will include your profile, projects, subscriptions, and activity history.')}
                </p>
            </div>
        </section>
    );
}
