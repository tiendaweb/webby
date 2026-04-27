import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileArchive, X, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadPluginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UploadPluginModal({ open, onOpenChange }: UploadPluginModalProps) {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            validateAndSetFile(droppedFile);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            validateAndSetFile(selectedFile);
        }
    };

    const validateAndSetFile = (newFile: File) => {
        setError(null);
        if (!newFile.name.endsWith('.zip')) {
            setError(t('Only ZIP files are allowed'));
            return;
        }
        if (newFile.size > 10 * 1024 * 1024) {
            setError(t('File size must be less than 10MB'));
            return;
        }
        setFile(newFile);
    };

    const handleUpload = () => {
        if (!file) return;
        setIsUploading(true);
        setError(null);

        router.post(route('admin.plugins.upload'), { plugin: file }, {
            forceFormData: true,
            onSuccess: () => {
                onOpenChange(false);
                setFile(null);
                toast.success(t('Plugin installed successfully'));
            },
            onError: (errors) => {
                setError(Object.values(errors)[0] as string);
            },
            onFinish: () => setIsUploading(false),
        });
    };

    const handleClose = () => {
        setFile(null);
        setError(null);
        onOpenChange(false);
    };

    const handleRemoveFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFile(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Upload Plugin')}</DialogTitle>
                    <DialogDescription>
                        {t('Upload a plugin ZIP file to install it.')}
                    </DialogDescription>
                </DialogHeader>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                        isDragging
                            ? 'border-primary bg-primary/5'
                            : 'border-muted-foreground/25 hover:border-primary/50',
                        error && 'border-destructive'
                    )}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {file ? (
                        <div className="flex items-center justify-center gap-3">
                            <FileArchive className="h-8 w-8 text-primary shrink-0" />
                            <div className="text-start min-w-0">
                                <p className="font-medium truncate">{file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                onClick={handleRemoveFile}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                {t('Drag and drop a ZIP file here, or click to browse')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Maximum file size: 10MB')}
                            </p>
                        </>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                    >
                        {isUploading ? t('Installing...') : t('Install Plugin')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
