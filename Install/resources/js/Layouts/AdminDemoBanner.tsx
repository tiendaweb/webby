import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function AdminDemoBanner() {
    const { isDemo, auth } = usePage<PageProps>().props;
    if (!isDemo || auth.user?.role !== 'admin') return null;

    return (
        <div className="px-4 pt-4 md:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <Alert variant="warning">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Demo Mode</AlertTitle>
                    <AlertDescription>
                        Settings are read-only and the environment resets every 3 hours. Register your own account to test the AI website builder.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
}
