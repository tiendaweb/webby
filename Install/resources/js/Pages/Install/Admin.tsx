import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Admin() {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [submitting, setSubmitting] = useState(false);

    return (
        <InstallerLayout currentStep={4} title="Site & Admin Setup">
            <Head title="Admin Setup" />

            <p className="text-center text-muted-foreground mb-6">
                Configure your site name and create the administrator account.
            </p>

            {errors.error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{errors.error}</AlertDescription>
                </Alert>
            )}

            <form
                method="POST"
                action={route('install.admin.store')}
                onSubmit={() => setSubmitting(true)}
                className="space-y-4"
            >
                <input type="hidden" name="_token" value={(usePage().props as unknown as { csrf_token: string }).csrf_token} />
                <div className="space-y-2">
                    <Label htmlFor="site_name">Site Name</Label>
                    <Input
                        id="site_name"
                        name="site_name"
                        defaultValue=""
                        placeholder="My Website Builder"
                        autoFocus
                    />
                    {errors.site_name && (
                        <p className="text-sm text-destructive">{errors.site_name}</p>
                    )}
                </div>

                <hr className="border-border" />

                <div className="space-y-2">
                    <Label htmlFor="name">Admin Name</Label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue=""
                        placeholder="John Doe"
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Admin Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue=""
                        placeholder="admin@example.com"
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                    <Input
                        id="password_confirmation"
                        name="password_confirmation"
                        type="password"
                        placeholder="••••••••"
                    />
                    {errors.password_confirmation && (
                        <p className="text-sm text-destructive">{errors.password_confirmation}</p>
                    )}
                </div>

                <hr className="border-border" />

                <div className="space-y-2">
                    <Label htmlFor="purchase_code">Envato Purchase Code <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                    <Input
                        id="purchase_code"
                        name="purchase_code"
                        defaultValue=""
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                    <p className="text-xs text-muted-foreground">
                        Your CodeCanyon purchase code. Can be configured later in Settings.
                    </p>
                    {errors.purchase_code && (
                        <p className="text-sm text-destructive">{errors.purchase_code}</p>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                    <a href={route('install.database')} className="flex-1">
                        <Button variant="outline" className="w-full" type="button">
                            Back
                        </Button>
                    </a>
                    <Button type="submit" className="flex-1" disabled={submitting}>
                        {submitting ? 'Installing...' : 'Complete Installation'}
                    </Button>
                </div>
            </form>
        </InstallerLayout>
    );
}
