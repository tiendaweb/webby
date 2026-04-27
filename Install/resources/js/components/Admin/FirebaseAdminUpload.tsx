import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, CheckCircle, Loader2, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useTranslation } from '@/contexts/LanguageContext';

interface Props {
    configured: boolean;
    projectId: string | null;
    clientEmail: string | null;
}

export function FirebaseAdminUpload({ configured, projectId, clientEmail }: Props) {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        if (!file.name.endsWith('.json')) {
            toast.error(t('Please select a JSON file'));
            return;
        }

        setUploading(true);
        router.post(route('admin.settings.firebase-admin.upload'), { file }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Firebase Admin SDK configured'));
            },
            onError: (errors) => {
                toast.error(errors.file || t('Upload failed'));
            },
            onFinish: () => {
                setUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            await axios.post(route('admin.settings.firebase-admin.test'));
            toast.success(t('Connection successful'));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            toast.error(t('Connection failed') + ': ' + (err.response?.data?.error || t('Unknown error')));
        } finally {
            setTesting(false);
        }
    };

    const handleRemove = () => {
        if (!confirm(t('Remove Firebase Admin SDK credentials? Collection auto-listing will be disabled.'))) return;

        router.delete(route('admin.settings.firebase-admin.delete'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Credentials removed')),
            onError: () => toast.error(t('Failed to remove credentials')),
        });
    };

    if (configured) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <p className="font-medium">Configured</p>
                                <p className="text-sm text-muted-foreground">
                                    Project: <code className="bg-muted px-1 py-0.5 rounded">{projectId}</code>
                                </p>
                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                    Service Account: {clientEmail}
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
                </CardContent>
            </Card>
        );
    }

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
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

            <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your service account JSON file here, or
            </p>
            <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
            >
                {uploading ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                    </>
                ) : (
                    'Select File'
                )}
            </Button>
        </div>
    );
}
