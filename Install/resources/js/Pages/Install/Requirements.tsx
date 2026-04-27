import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
    dependencies: Record<string, boolean>;
}

export default function Requirements({ dependencies }: Props) {
    const entries = Object.entries(dependencies);
    const requiredEntries = entries.filter(([name]) => !name.includes('(Optional)'));
    const optionalEntries = entries.filter(([name]) => name.includes('(Optional)'));

    const allRequiredPassed = requiredEntries.every(([, status]) => status);
    const passedCount = entries.filter(([, status]) => status).length;

    return (
        <InstallerLayout currentStep={1} title="Server Requirements">
            <Head title="Requirements Check" />

            <p className="text-center text-muted-foreground mb-6">
                Checking if your server meets the requirements to run the application.
            </p>

            <div className="space-y-2 mb-6">
                {requiredEntries.map(([name, status]) => (
                    <div
                        key={name}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                        <span className="text-sm">{name}</span>
                        {status ? (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                        )}
                    </div>
                ))}

                {optionalEntries.length > 0 && (
                    <>
                        <div className="pt-2 pb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Optional
                            </span>
                        </div>
                        {optionalEntries.map(([name, status]) => (
                            <div
                                key={name}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                            >
                                <span className="text-sm text-muted-foreground">{name}</span>
                                {status ? (
                                    <CheckCircle2 className="w-5 h-5 text-success" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-warning" />
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>

            <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Status</span>
                <span className={`text-sm font-medium ${allRequiredPassed ? 'text-success' : 'text-destructive'}`}>
                    {passedCount} / {entries.length} passed
                </span>
            </div>

            {!allRequiredPassed && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>
                        Please resolve the issues above before continuing. Contact your hosting provider
                        if you need help enabling PHP extensions.
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex gap-3">
                <a href={route('install')} className="flex-1">
                    <Button variant="outline" className="w-full">
                        Back
                    </Button>
                </a>
                {allRequiredPassed ? (
                    <a href={route('install.permissions')} className="flex-1">
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
