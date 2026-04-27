import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CheckCircle, Copy, Database, Key, Loader2, RefreshCw, Server, Trash2, Upload, Wifi, Zap } from 'lucide-react';
import axios from 'axios';
import type { FirebaseConfig as FirebaseConfigType } from '@/types/storage';
import { useTranslation } from '@/contexts/LanguageContext';

interface FirebaseConfigProps {
    projectId: string;
    firebaseEnabled: boolean;
    canUseOwnConfig: boolean;
    usesSystemFirebase: boolean;
    customConfig: FirebaseConfigType | null;
    systemConfigured: boolean;
    collectionPrefix: string;
    adminSdkStatus?: {
        configured: boolean;
        is_system: boolean;
        project_id: string | null;
        client_email: string | null;
    };
}

interface ProjectAdminSdkUploadProps {
    projectId: string;
    configured: boolean;
    projectInfoId: string | null;
    clientEmail: string | null;
}

function ProjectAdminSdkUpload({ projectId, configured, projectInfoId, clientEmail }: ProjectAdminSdkUploadProps) {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        if (!file.name.endsWith('.json')) {
            toast.error(t('Please select a JSON file'));
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post(`/project/${projectId}/firebase/admin-sdk`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(t('Firebase Admin SDK configured'));
            router.reload();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || t('Upload failed'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            await axios.post(`/project/${projectId}/firebase/admin-sdk/test`);
            toast.success(t('Connection successful!'));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            toast.error(t('Connection failed') + ': ' + (err.response?.data?.error || 'Unknown error'));
        } finally {
            setTesting(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm(t('Remove Admin SDK credentials? Collection auto-listing will be disabled.'))) return;

        try {
            await axios.delete(`/project/${projectId}/firebase/admin-sdk`);
            toast.success(t('Credentials removed'));
            router.reload();
        } catch {
            toast.error(t('Failed to remove credentials'));
        }
    };

    if (configured) {
        return (
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                    <div className="space-y-1">
                        <p className="font-medium">{t('Admin SDK Configured')}</p>
                        <p className="text-sm text-muted-foreground">
                            {t('Project ID')}: <code className="bg-muted px-1 py-0.5 rounded">{projectInfoId}</code>
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                            {t('Service Account')}: {clientEmail}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnection}
                        disabled={testing}
                    >
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemove}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
            }}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                }}
            />

            <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
                {t('Upload your service account JSON for collection browsing')}
            </p>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
            >
                {uploading ? (
                    <>
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        {t('Uploading...')}
                    </>
                ) : (
                    t('Select File')
                )}
            </Button>
        </div>
    );
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export function FirebaseConfig({
    projectId,
    firebaseEnabled,
    canUseOwnConfig,
    usesSystemFirebase,
    customConfig,
    systemConfigured,
    collectionPrefix,
    adminSdkStatus,
}: FirebaseConfigProps) {
    const { t } = useTranslation();
    const [useSystem, setUseSystem] = useState(usesSystemFirebase);
    const [configJson, setConfigJson] = useState(
        customConfig ? JSON.stringify(customConfig, null, 2) : ''
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
    const [configErrors, setConfigErrors] = useState<string[]>([]);
    const [securityRules, setSecurityRules] = useState<string | null>(null);
    const [isGeneratingRules, setIsGeneratingRules] = useState(false);

    if (!firebaseEnabled) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        {t('Firebase Database')}
                    </CardTitle>
                    <CardDescription>
                        {t('Firebase Firestore is not available on your current plan.')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {t('Upgrade your plan to enable Firebase Firestore database for your generated apps.')}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const validateConfig = (json: string): { valid: boolean; errors: string[] } => {
        try {
            const config = JSON.parse(json);
            const errors: string[] = [];

            if (!config.apiKey) errors.push('apiKey is required');
            if (!config.authDomain) errors.push('authDomain is required');
            if (!config.projectId) errors.push('projectId is required');

            return { valid: errors.length === 0, errors };
        } catch {
            return { valid: false, errors: ['Invalid JSON format'] };
        }
    };

    const handleConfigChange = (value: string) => {
        setConfigJson(value);
        if (value.trim()) {
            const { errors } = validateConfig(value);
            setConfigErrors(errors);
        } else {
            setConfigErrors([]);
        }
    };

    const handleSaveConfig = async () => {
        if (!useSystem && configJson.trim()) {
            const { valid, errors } = validateConfig(configJson);
            if (!valid) {
                setConfigErrors(errors);
                return;
            }
        }

        setIsSaving(true);
        try {
            await axios.put(`/project/${projectId}/firebase/config`, {
                uses_system_firebase: useSystem,
                firebase_config: useSystem ? null : JSON.parse(configJson),
            });
            toast.success(t('Firebase configuration saved'));
            setConfigErrors([]);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { errors?: string[] } } };
            const errors = error.response?.data?.errors || [t('Failed to save configuration')];
            setConfigErrors(Array.isArray(errors) ? errors : [errors]);
            toast.error(t('Failed to save configuration'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetConfig = async () => {
        setIsResetting(true);
        try {
            await axios.delete(`/project/${projectId}/firebase/config`);
            setUseSystem(true);
            setConfigJson('');
            setConfigErrors([]);
            toast.success(t('Firebase configuration reset to system default'));
        } catch {
            toast.error(t('Failed to reset configuration'));
        } finally {
            setIsResetting(false);
        }
    };

    const handleTestConnection = async () => {
        setConnectionStatus('testing');
        try {
            const response = await axios.post(`/project/${projectId}/firebase/test`);
            if (response.data.success) {
                setConnectionStatus('success');
                toast.success(t('Connection successful!'));
            } else {
                setConnectionStatus('error');
                toast.error(response.data.error || t('Connection failed'));
            }
        } catch {
            setConnectionStatus('error');
            toast.error(t('Failed to test connection'));
        }
    };

    const handleGenerateRules = async () => {
        setIsGeneratingRules(true);
        try {
            const response = await axios.get(`/project/${projectId}/firebase/rules`);
            setSecurityRules(response.data.rules);
        } catch {
            toast.error(t('Failed to generate security rules'));
        } finally {
            setIsGeneratingRules(false);
        }
    };

    const copyRules = () => {
        if (securityRules) {
            navigator.clipboard.writeText(securityRules);
            toast.success(t('Security rules copied to clipboard'));
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                {t('Firebase Database')}
                            </CardTitle>
                            <CardDescription>
                                {t('Configure Firebase Firestore for your generated app.')}
                            </CardDescription>
                        </div>
                        <Badge variant={systemConfigured ? 'default' : 'secondary'}>
                            {systemConfigured ? t('System Configured') : t('Not Configured')}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Collection Prefix Info */}
                    <div className="rounded-lg border p-3 bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                            <strong>{t('Collection Prefix:')}</strong>{' '}
                            <code className="text-xs bg-background px-1 py-0.5 rounded">{collectionPrefix}</code>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('All your Firestore collections will be automatically prefixed with this path.')}
                        </p>
                    </div>

                    {/* System vs Custom Toggle */}
                    {canUseOwnConfig && (
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="use-system">{t('Use System Firebase')}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {useSystem
                                        ? t('Using the platform-provided Firebase configuration.')
                                        : t('Using your own Firebase configuration.')}
                                </p>
                            </div>
                            <Switch
                                id="use-system"
                                checked={useSystem}
                                onCheckedChange={(checked) => {
                                    setUseSystem(checked);
                                    setConnectionStatus('idle');
                                }}
                            />
                        </div>
                    )}

                    {/* Custom Config Input */}
                    {canUseOwnConfig && !useSystem && (
                        <div className="space-y-2">
                            <Label htmlFor="firebase-config">{t('Firebase Configuration JSON')}</Label>
                            <Textarea
                                id="firebase-config"
                                value={configJson}
                                onChange={(e) => handleConfigChange(e.target.value)}
                                placeholder={`{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abc123"
}`}
                                rows={10}
                                className="font-mono text-sm"
                            />
                            {configErrors.length > 0 && (
                                <div className="text-xs text-destructive">
                                    {configErrors.map((error, i) => (
                                        <p key={i}>{error}</p>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {t('Paste your Firebase config object from the Firebase Console.')}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                        {/* Only show Test Connection if there's a config to test */}
                        {((useSystem && systemConfigured) || (!useSystem && configJson.trim() && configErrors.length === 0)) && (
                            <Button
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={connectionStatus === 'testing'}
                            >
                                {connectionStatus === 'testing' ? (
                                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                ) : (
                                    <Zap className="h-4 w-4 me-2" />
                                )}
                                {t('Test Connection')}
                            </Button>
                        )}

                        {canUseOwnConfig && !useSystem && (
                            <Button onClick={handleSaveConfig} disabled={isSaving}>
                                {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                {t('Save Configuration')}
                            </Button>
                        )}

                        {canUseOwnConfig && !useSystem && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" disabled={isResetting}>
                                        <RefreshCw className="h-4 w-4 me-2" />
                                        {t('Reset to System')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('Reset Firebase Configuration?')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('This will remove your custom Firebase configuration and switch back to the system-provided Firebase. Your data will remain in your custom Firebase instance.')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleResetConfig}>
                                            {t('Reset')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Security Rules Card - Only show for custom Firebase config */}
            {canUseOwnConfig && !useSystem && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            {t('Security Rules')}
                        </CardTitle>
                        <CardDescription>
                            {t('Generate Firestore security rules for your project.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {t('These rules restrict access to your project\'s data and should be deployed to your Firebase project\'s Firestore rules.')}
                        </p>

                        <Button
                            variant="outline"
                            onClick={handleGenerateRules}
                            disabled={isGeneratingRules}
                        >
                            {isGeneratingRules ? (
                                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                            ) : (
                                <Server className="h-4 w-4 me-2" />
                            )}
                            {t('Generate Security Rules')}
                        </Button>

                        {securityRules && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>{t('Generated Rules')}</Label>
                                    <Button variant="ghost" size="sm" onClick={copyRules}>
                                        <Copy className="h-4 w-4 me-1" />
                                        {t('Copy')}
                                    </Button>
                                </div>
                                <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto max-h-[300px] overflow-y-auto">
                                    {securityRules}
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Admin SDK Card - Only show for custom Firebase config */}
            {canUseOwnConfig && !useSystem && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            {t('Firebase Admin SDK (Optional)')}
                        </CardTitle>
                        <CardDescription>
                            {t('Upload your service account JSON to enable automatic collection listing in the Database manager.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProjectAdminSdkUpload
                            projectId={projectId}
                            configured={adminSdkStatus?.configured ?? false}
                            projectInfoId={adminSdkStatus?.project_id ?? null}
                            clientEmail={adminSdkStatus?.client_email ?? null}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
