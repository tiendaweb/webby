import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import ApplicationLogo from '@/components/ApplicationLogo';
import { XCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface OauthErrorProps {
    message: string;
    connectUrl: string;
}

/**
 * Shown when an authorization request cannot be trusted enough to redirect
 * back — an unknown client, or a return address it never registered.
 * Rendering the failure here instead of bouncing to the supplied URI is the
 * whole point: redirecting to an unvalidated redirect_uri is how codes get
 * delivered to the wrong party.
 */
export default function OauthError({ message, connectUrl }: OauthErrorProps) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Authorization failed')} />
            <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
                <div className="w-full max-w-md space-y-4 rounded-xl border bg-background p-6 text-center shadow-sm">
                    <div className="flex justify-center">
                        <ApplicationLogo showText size="lg" />
                    </div>
                    <XCircle className="mx-auto h-10 w-10 text-destructive" />
                    <h1 className="text-lg font-semibold">{t('Authorization failed')}</h1>
                    <p className="text-sm text-muted-foreground">{message}</p>
                    <Button asChild variant="outline" className="w-full">
                        <a href={connectUrl}>{t('Go to Connect assistants')}</a>
                    </Button>
                </div>
            </div>
        </>
    );
}
