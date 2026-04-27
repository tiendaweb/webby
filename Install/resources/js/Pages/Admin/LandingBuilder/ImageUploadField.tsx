import { useState, useRef, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadFieldProps {
    label: string;
    description?: string;
    value: string | null;
    onChange: (url: string | null) => void;
    type: 'logo' | 'avatar' | 'image';
    t: (key: string) => string;
    className?: string;
}

export function ImageUploadField({
    label,
    description,
    value,
    onChange,
    type,
    t,
    className,
}: ImageUploadFieldProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset imageError when value changes (e.g., after successful upload)
    useEffect(() => {
        if (value) {
            setImageError(false);
        }
    }, [value]);

    // Handle broken images (e.g., file was deleted but URL still in database)
    const handleImageError = useCallback(() => {
        setImageError(true);
        // Auto-clear the broken image URL so it can be saved properly
        onChange(null);
    }, [onChange]);

    const handleUpload = useCallback(async (file: File) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError(t('Invalid file type. Allowed: JPG, PNG, SVG, WebP'));
            return;
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            setError(t('File size must be less than 2MB'));
            return;
        }

        setError(null);
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            const response = await fetch('/admin/landing-builder/media', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken || '',
                    'Accept': 'application/json',
                },
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || t('Upload failed'));
            }

            const data = await response.json();
            onChange(data.url);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Upload failed'));
        } finally {
            setIsUploading(false);
        }
    }, [type, onChange, t]);

    const handleDelete = useCallback(() => {
        // Just clear the value locally - file deletion happens on save
        // This allows users to undo by reloading without saving
        setError(null);
        setImageError(false);
        onChange(null);
    }, [onChange]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
        // Reset input so same file can be selected again
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [handleUpload]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleUpload(file);
        }
    }, [handleUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    return (
        <div className={cn('space-y-2', className)}>
            <Label>{label}</Label>

            {value && !imageError ? (
                // Image preview
                <div className="relative group">
                    <div className={cn(
                        'border rounded-lg overflow-hidden bg-muted/30',
                        type === 'avatar' ? 'w-20 h-20' : 'w-full max-w-xs'
                    )}>
                        <img
                            src={value}
                            alt={label}
                            className={cn(
                                'object-contain',
                                type === 'avatar' ? 'w-full h-full rounded-full' : 'w-full h-auto max-h-32'
                            )}
                            onError={handleImageError}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleDelete}
                        disabled={isUploading}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            ) : (
                // Upload area
                <div
                    className={cn(
                        'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
                        isUploading && 'pointer-events-none opacity-50'
                    )}
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                    />
                    <div className="flex flex-col items-center gap-2 py-2">
                        {isUploading ? (
                            <>
                                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                                <span className="text-sm text-muted-foreground">{t('Uploading...')}</span>
                            </>
                        ) : (
                            <>
                                <div className="p-2 rounded-full bg-muted">
                                    {type === 'avatar' ? (
                                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <Upload className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {t('Click to upload or drag and drop')}
                                </div>
                                <div className="text-xs text-muted-foreground/70">
                                    {t('Supported formats: JPG, PNG, SVG, WebP (max 2MB)')}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {description && !value && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}

            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}
