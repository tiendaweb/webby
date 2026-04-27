import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Props {
    pendingMigrations: string[];
    flash?: {
        error?: string;
    };
}

export default function Index({ pendingMigrations }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const flash = (usePage().props as { flash?: Props['flash'] }).flash;

    return (
        <InstallerLayout title="System Upgrade">
            <Head title="Upgrade" />

            {flash?.error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>{flash.error}</AlertDescription>
                </Alert>
            )}

            <Alert className="mb-6">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                    <strong>Important:</strong> Please backup your database before proceeding with the upgrade.
                </AlertDescription>
            </Alert>

            <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">Pending Migrations ({pendingMigrations.length})</h3>
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {pendingMigrations.map((migration) => (
                        <div
                            key={migration}
                            className="text-xs font-mono p-2 rounded bg-muted/50 text-muted-foreground truncate"
                        >
                            {migration}
                        </div>
                    ))}
                </div>
            </div>

            <form
                method="POST"
                action={route('upgrade.run')}
                onSubmit={() => setSubmitting(true)}
            >
                <input type="hidden" name="_token" value={(usePage().props as unknown as { csrf_token: string }).csrf_token} />
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? 'Upgrading...' : flash?.error ? 'Retry Upgrade' : 'Run Upgrade'}
                </Button>
            </form>
        </InstallerLayout>
    );
}
