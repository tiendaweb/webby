import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { CheckCircle2, ExternalLink } from 'lucide-react';

export default function Completed() {
    return (
        <InstallerLayout currentStep={5} title="Installation Complete">
            <Head title="Installation Complete" />

            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-success" />
                    </div>
                </div>

                <p className="text-muted-foreground mb-8">
                    Congratulations! The application has been successfully installed.
                    You can now log in with your admin credentials.
                </p>

                <div className="space-y-3">
                    <a href={route('login')}>
                        <Button className="w-full" size="lg">
                            Go to Login
                            <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </a>
                </div>
            </div>
        </InstallerLayout>
    );
}
