import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { CheckCircle2, ExternalLink } from 'lucide-react';

export default function Completed() {
    return (
        <InstallerLayout title="Upgrade Complete">
            <Head title="Upgrade Complete" />

            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-success" />
                    </div>
                </div>

                <p className="text-lg font-medium mb-2">Upgrade Complete</p>

                <p className="text-muted-foreground mb-8">
                    All migrations have been applied successfully.
                </p>

                <a href="/">
                    <Button className="w-full" size="lg">
                        Continue
                        <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                </a>
            </div>
        </InstallerLayout>
    );
}
