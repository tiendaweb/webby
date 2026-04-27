import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { Sparkles, Database, Shield, Zap } from 'lucide-react';

export default function Welcome() {
    return (
        <InstallerLayout title="Welcome to the Installation Wizard">
            <Head title="Install" />

            <div className="text-center mb-8">
                <p className="text-muted-foreground">
                    This wizard will guide you through the installation process.
                    It should only take a few minutes to complete.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-md bg-primary/10">
                        <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Requirements Check</h3>
                        <p className="text-xs text-muted-foreground">Verify server compatibility</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-md bg-primary/10">
                        <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Permissions</h3>
                        <p className="text-xs text-muted-foreground">Check file permissions</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-md bg-primary/10">
                        <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Database Setup</h3>
                        <p className="text-xs text-muted-foreground">Configure your database</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-md bg-primary/10">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">Admin Account</h3>
                        <p className="text-xs text-muted-foreground">Create your admin user</p>
                    </div>
                </div>
            </div>

            <a href={route('install.requirements')}>
                <Button className="w-full" size="lg">
                    Get Started
                </Button>
            </a>
        </InstallerLayout>
    );
}
