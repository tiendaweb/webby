import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InstallerLayout from '@/Layouts/InstallerLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface Props {
    sqliteAvailable: boolean;
}

export default function Database({ sqliteAvailable }: Props) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [dbType, setDbType] = useState<'mysql' | 'sqlite'>('mysql');
    const [submitting, setSubmitting] = useState(false);

    return (
        <InstallerLayout currentStep={3} title="Database Configuration">
            <Head title="Database Setup" />

            <p className="text-center text-muted-foreground mb-6">
                Configure your database connection. Make sure the database exists before continuing.
            </p>

            {errors.database && (
                <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{errors.database}</AlertDescription>
                </Alert>
            )}

            <form
                method="POST"
                action={route('install.database.store')}
                onSubmit={() => setSubmitting(true)}
                className="space-y-4"
            >
                <input type="hidden" name="_token" value={(usePage().props as unknown as { csrf_token: string }).csrf_token} />
                <input type="hidden" name="db_type" value={dbType} />

                <div className="space-y-2">
                    <Label htmlFor="db_type">Database Type</Label>
                    <Select
                        value={dbType}
                        onValueChange={(value: 'mysql' | 'sqlite') => setDbType(value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select database type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mysql">MySQL / MariaDB</SelectItem>
                            {sqliteAvailable && (
                                <SelectItem value="sqlite">SQLite</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                    {errors.db_type && (
                        <p className="text-sm text-destructive">{errors.db_type}</p>
                    )}
                </div>

                {dbType === 'mysql' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="host">Host</Label>
                                <Input
                                    id="host"
                                    name="host"
                                    defaultValue="localhost"
                                    placeholder="localhost"
                                />
                                {errors.host && (
                                    <p className="text-sm text-destructive">{errors.host}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="port">Port</Label>
                                <Input
                                    id="port"
                                    name="port"
                                    type="number"
                                    defaultValue="3306"
                                    placeholder="3306"
                                />
                                {errors.port && (
                                    <p className="text-sm text-destructive">{errors.port}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="database">Database Name</Label>
                            <Input
                                id="database"
                                name="database"
                                defaultValue=""
                                placeholder="webby"
                            />
                            {errors.database && (
                                <p className="text-sm text-destructive">{errors.database}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                defaultValue=""
                                placeholder="root"
                            />
                            {errors.username && (
                                <p className="text-sm text-destructive">{errors.username}</p>
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
                            <p className="text-xs text-muted-foreground">Leave blank if your database has no password</p>
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password}</p>
                            )}
                        </div>
                    </>
                )}

                {dbType === 'sqlite' && (
                    <Alert>
                        <InfoIcon className="size-4" />
                        <AlertDescription>
                            SQLite database will be created automatically at{' '}
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">database/database.sqlite</code>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex gap-3 pt-4">
                    <a href={route('install.permissions')} className="flex-1">
                        <Button variant="outline" className="w-full" type="button">
                            Back
                        </Button>
                    </a>
                    <Button type="submit" className="flex-1" disabled={submitting}>
                        {submitting ? 'Connecting...' : 'Continue'}
                    </Button>
                </div>
            </form>
        </InstallerLayout>
    );
}
