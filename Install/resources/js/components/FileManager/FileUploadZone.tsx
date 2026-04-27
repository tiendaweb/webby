import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import axios from 'axios';
import type { ProjectFile } from '@/types/storage';
import { useTranslation } from '@/contexts/LanguageContext';

interface FileUploadZoneProps {
    projectId: string;
    maxFileSizeMb: number;
    allowedTypes: string[] | null;
    onUploadComplete: (file: ProjectFile) => void;
    onStorageUpdate: (bytesUsed: number) => void;
    disabled?: boolean;
}

interface UploadProgress {
    fileName: string;
    progress: number;
    status: 'uploading' | 'complete' | 'error';
    error?: string;
}

export function FileUploadZone({
    projectId,
    maxFileSizeMb,
    allowedTypes,
    onUploadComplete,
    onStorageUpdate,
    disabled = false,
}: FileUploadZoneProps) {
    const { t } = useTranslation();
    const [uploads, setUploads] = useState<UploadProgress[]>([]);

    const validateFile = useCallback((file: File): string | null => {
        // Check file size
        const maxBytes = maxFileSizeMb * 1024 * 1024;
        if (file.size > maxBytes) {
            return t('File exceeds maximum size of :size MB', { size: maxFileSizeMb });
        }

        // Check file type if restrictions exist
        if (allowedTypes && allowedTypes.length > 0) {
            const isAllowed = allowedTypes.some(pattern => {
                if (pattern.endsWith('/*')) {
                    // Match MIME type prefix (e.g., image/*)
                    const prefix = pattern.slice(0, -2);
                    return file.type.startsWith(prefix);
                }
                return file.type === pattern || pattern === '*/*';
            });

            if (!isAllowed) {
                return t('File type :type is not allowed', { type: file.type });
            }
        }

        return null;
    }, [maxFileSizeMb, allowedTypes, t]);

    const uploadFile = useCallback(async (file: File) => {
        // Add to uploads list
        setUploads(prev => [...prev, {
            fileName: file.name,
            progress: 0,
            status: 'uploading',
        }]);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post<{ file: ProjectFile; storage_used: number }>(
                `/project/${projectId}/files`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = progressEvent.total
                            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                            : 0;

                        setUploads(prev => prev.map(u =>
                            u.fileName === file.name && u.status === 'uploading'
                                ? { ...u, progress }
                                : u
                        ));
                    },
                }
            );

            // Update status to complete
            setUploads(prev => prev.map(u =>
                u.fileName === file.name && u.status === 'uploading'
                    ? { ...u, status: 'complete', progress: 100 }
                    : u
            ));

            // Notify parent
            onUploadComplete(response.data.file);
            onStorageUpdate(response.data.storage_used);

            // Remove from list after delay
            setTimeout(() => {
                setUploads(prev => prev.filter(u =>
                    !(u.fileName === file.name && u.status === 'complete')
                ));
            }, 2000);

        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error || error.response?.data?.message || t('Upload failed')
                : t('Upload failed');

            setUploads(prev => prev.map(u =>
                u.fileName === file.name && u.status === 'uploading'
                    ? { ...u, status: 'error', error: errorMessage }
                    : u
            ));

            // Remove error after delay
            setTimeout(() => {
                setUploads(prev => prev.filter(u =>
                    !(u.fileName === file.name && u.status === 'error')
                ));
            }, 5000);
        }
    }, [projectId, onUploadComplete, onStorageUpdate, t]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(file => {
            const error = validateFile(file);
            if (error) {
                setUploads(prev => [...prev, {
                    fileName: file.name,
                    progress: 0,
                    status: 'error',
                    error,
                }]);

                // Remove error after delay
                setTimeout(() => {
                    setUploads(prev => prev.filter(u =>
                        !(u.fileName === file.name && u.status === 'error')
                    ));
                }, 5000);
                return;
            }

            uploadFile(file);
        });
    }, [validateFile, uploadFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled,
        multiple: true,
    });

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                    isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <input {...getInputProps()} />
                <Upload className={cn(
                    'h-10 w-10 mx-auto mb-4 transition-colors',
                    isDragActive ? 'text-primary' : 'text-muted-foreground/50'
                )} />
                {isDragActive ? (
                    <p className="text-primary font-medium">{t('Drop files here...')}</p>
                ) : (
                    <>
                        <p className="text-muted-foreground font-medium">
                            {t('Drag & drop files here, or click to select')}
                        </p>
                        <p className="text-sm text-muted-foreground/70 mt-2">
                            {t('Maximum file size: :size MB', { size: maxFileSizeMb })}
                            {allowedTypes && allowedTypes.length > 0 && (
                                <> &bull; {t('Allowed types:')} {allowedTypes.join(', ')}</>
                            )}
                        </p>
                    </>
                )}
            </div>

            {/* Upload Progress List */}
            {uploads.length > 0 && (
                <div className="space-y-2">
                    {uploads.map((upload, index) => (
                        <div
                            key={`${upload.fileName}-${index}`}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border',
                                upload.status === 'error' && 'border-destructive/50 bg-destructive/5',
                                upload.status === 'complete' && 'border-success/50 bg-success/5',
                                upload.status === 'uploading' && 'border-border bg-muted/30'
                            )}
                        >
                            {upload.status === 'uploading' && (
                                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                            )}
                            {upload.status === 'complete' && (
                                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                            )}
                            {upload.status === 'error' && (
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{upload.fileName}</p>
                                {upload.status === 'uploading' && (
                                    <Progress value={upload.progress} className="h-1 mt-1" />
                                )}
                                {upload.status === 'error' && upload.error && (
                                    <p className="text-xs text-destructive mt-0.5">{upload.error}</p>
                                )}
                            </div>

                            {upload.status === 'uploading' && (
                                <span className="text-xs text-muted-foreground">{upload.progress}%</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
