import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
    permissions: Record<string, boolean>;
}

export default function Permissions({ permissions }: Props) {
    const entries = Object.entries(permissions);
    const allPassed = entries.every(([, status]) => status);
    const passedCount = entries.filter(([, status]) => status).length;
    const failedPaths = entries.filter(([, status]) => !status).map(([path]) => path);

    return (
        <InstallerLayout currentStep={2} title="File Permissions">
            <Head title="Permissions Check" />

            <p className="text-center text-muted-foreground mb-6">
                The following files and directories need to be writable by the web server.
            </p>

            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                {entries.map(([path, status]) => (
                    <div
                        key={path}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                        <code className="text-sm text-muted-foreground">{path}</code>
                        {status ? (
                            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                        ) : (
                            <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Status</span>
                <span className={`text-sm font-medium ${allPassed ? 'text-success' : 'text-destructive'}`}>
                    {passedCount} / {entries.length} writable
                </span>
            </div>

            {!allPassed && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription className="space-y-2">
                        <p>The following paths are not writable:</p>
                        <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
{failedPaths.map(path => `chmod -R 775 ${path}`).join('\n')}
                        </pre>
                        <p className="text-xs">Run the commands above to fix permissions.</p>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex gap-3">
                <a href={route('install.requirements')} className="flex-1">
                    <Button variant="outline" className="w-full">
                        Back
                    </Button>
                </a>
                {allPassed ? (
                    <a href={route('install.database')} className="flex-1">
                        <Button className="w-full">Continue</Button>
                    </a>
                ) : (
                    <Button className="flex-1" disabled>
                        Continue
                    </Button>
                )}
            </div>
        </InstallerLayout>
    );
}
