import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Image as ImageIcon, Link as LinkIcon, Loader2, Type, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/LanguageContext';
import type {
    InspectorElement,
    InspectorImage,
    VisualEditCandidate,
    VisualEditField,
    VisualEditPayload,
    VisualEditResponse,
} from '@/types/inspector';

interface UploadedProjectFile {
    id: number;
    filename: string;
    mime_type: string;
    size: number;
    human_size: string;
    is_image: boolean;
    url: string;
}

interface VisualEditModalProps {
    open: boolean;
    projectId?: string;
    element: InspectorElement | null;
    initialValues: Partial<Record<VisualEditField, string>>;
    previewPath?: string;
    onOpenChange: (open: boolean) => void;
    onApplyPreview: (payload: VisualEditPayload) => void;
    onRevertPreview: (payload: VisualEditPayload) => void;
    onSaved?: (response: VisualEditResponse) => void;
    onFileUploaded?: (file: UploadedProjectFile) => void;
}

const TEXT_TAGS = ['div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'li', 'a', 'button', 'td', 'th'];
const SECTION_IMAGE_FIELDS: Array<Extract<VisualEditField, 'src' | 'alt'>> = ['src', 'alt'];

const FIELD_ORDER: Record<string, VisualEditField[]> = {
    a: ['text', 'href', 'title'],
    img: ['src', 'alt', 'title'],
    input: ['placeholder', 'title'],
    textarea: ['placeholder', 'title'],
    button: ['text', 'title'],
};

function editableFieldsFor(element: InspectorElement | null): VisualEditField[] {
    if (!element) return [];

    const fields = FIELD_ORDER[element.tagName] ?? [];

    if (fields.length > 0) {
        return fields;
    }

    return TEXT_TAGS.includes(element.tagName) ? ['text'] : [];
}

function fieldIcon(field: VisualEditField) {
    if (field === 'src') return <ImageIcon className="h-4 w-4" />;
    if (field === 'href') return <LinkIcon className="h-4 w-4" />;
    return <Type className="h-4 w-4" />;
}

function imageOriginalValue(image: InspectorImage, field: Extract<VisualEditField, 'src' | 'alt'>): string {
    if (field === 'src') {
        return image.src || image.currentSrc || '';
    }

    return image.alt || '';
}

function uniqueValues(values: Array<string | undefined>): string[] {
    return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value !== '')));
}

function imageSource(image: InspectorImage): string {
    return image.src || image.currentSrc || '';
}

function groupImagesBySource(images: InspectorImage[]): Array<{ source: string; images: InspectorImage[] }> {
    const groups = new Map<string, InspectorImage[]>();

    for (const image of images) {
        const source = imageSource(image);
        const key = source || `empty-${image.id}`;
        const existing = groups.get(key) ?? [];
        existing.push(image);
        groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([key, groupedImages]) => ({
        source: key.startsWith('empty-') ? '' : key,
        images: groupedImages,
    }));
}

export function VisualEditModal({
    open,
    projectId,
    element,
    initialValues,
    previewPath,
    onOpenChange,
    onApplyPreview,
    onRevertPreview,
    onSaved,
    onFileUploaded,
}: VisualEditModalProps) {
    const { t } = useTranslation();
    const fields = useMemo(() => editableFieldsFor(element), [element]);
    const sectionImages = useMemo(() => {
        if (!element || element.tagName === 'img') return [];

        return element.images ?? [];
    }, [element]);
    const [values, setValues] = useState<Partial<Record<VisualEditField, string>>>({});
    const [imageValues, setImageValues] = useState<Record<string, Partial<Record<Extract<VisualEditField, 'src' | 'alt'>, string>>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingPayload, setPendingPayload] = useState<VisualEditPayload | null>(null);
    const [pendingRemaining, setPendingRemaining] = useState<VisualEditPayload[]>([]);
    const [candidates, setCandidates] = useState<VisualEditCandidate[]>([]);
    const [appliedPayloads, setAppliedPayloads] = useState<VisualEditPayload[]>([]);
    const [bulkImageUrl, setBulkImageUrl] = useState('');
    const [bulkTargetSource, setBulkTargetSource] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        const nextValues: Partial<Record<VisualEditField, string>> = {};
        for (const field of fields) {
            nextValues[field] = initialValues[field] ?? '';
        }

        setValues(nextValues);
        setImageValues(Object.fromEntries(
            sectionImages.map(image => [
                image.id,
                {
                    src: imageOriginalValue(image, 'src'),
                    alt: imageOriginalValue(image, 'alt'),
                },
            ])
        ));
        setError(null);
        setPendingPayload(null);
        setPendingRemaining([]);
        setCandidates([]);
        setAppliedPayloads([]);
        setBulkImageUrl('');
        setBulkTargetSource(null);
    }, [fields, initialValues, open, sectionImages]);

    const close = useCallback((nextOpen: boolean) => {
        if (!nextOpen && appliedPayloads.length > 0) {
            for (const payload of appliedPayloads) {
                onRevertPreview(payload);
            }
        }

        if (!nextOpen) {
            setPendingPayload(null);
            setPendingRemaining([]);
            setCandidates([]);
            setAppliedPayloads([]);
            setError(null);
            setBulkImageUrl('');
            setBulkTargetSource(null);
        }

        onOpenChange(nextOpen);
    }, [appliedPayloads, onOpenChange, onRevertPreview]);

    const updateValue = (field: VisualEditField, value: string) => {
        setValues(prev => ({ ...prev, [field]: value }));
    };

    const updateImageValue = (imageId: string, field: Extract<VisualEditField, 'src' | 'alt'>, value: string) => {
        setImageValues(prev => ({
            ...prev,
            [imageId]: {
                ...prev[imageId],
                [field]: value,
            },
        }));
    };

    const buildPayloads = useCallback((): VisualEditPayload[] => {
        if (!element) return [];

        const elementPayloads = fields
            .map(field => ({
                selector: element.cssSelector,
                tagName: element.tagName,
                field,
                originalValue: initialValues[field] ?? '',
                newValue: values[field] ?? '',
                originalValueAliases: field === 'src'
                    ? uniqueValues([initialValues[field]])
                    : undefined,
                previewPath,
            }))
            .filter(payload => payload.originalValue !== payload.newValue);

        const imagePayloads = sectionImages.flatMap(image => SECTION_IMAGE_FIELDS.map(field => ({
            selector: image.cssSelector,
            tagName: 'img',
            field,
            originalValue: imageOriginalValue(image, field),
            newValue: imageValues[image.id]?.[field] ?? '',
            originalValueAliases: field === 'src'
                ? uniqueValues([image.src, image.currentSrc])
                : undefined,
            previewPath,
        }))).filter(payload => payload.originalValue !== payload.newValue);

        return [...elementPayloads, ...imagePayloads];
    }, [element, fields, imageValues, initialValues, previewPath, sectionImages, values]);

    const postPayload = useCallback(async (payload: VisualEditPayload) => {
        if (!projectId) {
            throw new Error(t('Project is not available'));
        }

        const response = await axios.post<VisualEditResponse>(`/project/${projectId}/visual-edits`, payload);

        return response.data;
    }, [projectId, t]);

    const persistQueue = useCallback(async (payloads: VisualEditPayload[]) => {
        for (let index = 0; index < payloads.length; index++) {
            const payload = payloads[index];
            const response = await postPayload(payload);

            if (response.needs_source_choice) {
                setPendingPayload(payload);
                setPendingRemaining(payloads.slice(index + 1));
                setCandidates(response.candidates ?? []);
                setError(response.message ?? t('Choose the source file to update.'));
                return false;
            }

            if (!response.success) {
                throw new Error(response.error || response.message || t('Failed to save visual edit'));
            }

            onSaved?.(response);
        }

        return true;
    }, [onSaved, postPayload, t]);

    const handleSave = async () => {
        const payloads = buildPayloads();

        if (payloads.length === 0) {
            close(false);
            return;
        }

        setIsSaving(true);
        setError(null);
        setCandidates([]);
        setPendingPayload(null);
        setPendingRemaining([]);

        for (const payload of payloads) {
            onApplyPreview(payload);
        }
        setAppliedPayloads(payloads);

        try {
            const completed = await persistQueue(payloads);
            if (completed) {
                setAppliedPayloads([]);
                toast.success(t('Visual edit saved'));
                onOpenChange(false);
            }
        } catch (err) {
            for (const payload of payloads) {
                onRevertPreview(payload);
            }
            setAppliedPayloads([]);
            setError(axios.isAxiosError(err) ? err.response?.data?.error || t('Failed to save visual edit') : (err as Error).message);
            toast.error(t('Failed to save visual edit'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCandidate = async (candidate: VisualEditCandidate) => {
        if (!pendingPayload) return;

        setIsSaving(true);
        setError(null);

        try {
            const response = await postPayload({ ...pendingPayload, sourcePath: candidate.sourcePath });

            if (!response.success) {
                throw new Error(response.error || response.message || t('Failed to save visual edit'));
            }

            onSaved?.(response);
            const completed = await persistQueue(pendingRemaining);

            if (completed) {
                setAppliedPayloads([]);
                toast.success(t('Visual edit saved'));
                onOpenChange(false);
            }
        } catch (err) {
            for (const payload of appliedPayloads) {
                onRevertPreview(payload);
            }
            setAppliedPayloads([]);
            setError(axios.isAxiosError(err) ? err.response?.data?.error || t('Failed to save visual edit') : (err as Error).message);
            toast.error(t('Failed to save visual edit'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, imageId?: string) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !projectId) return;

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(`/project/${projectId}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const serverFile = response.data.file;
            const url = serverFile.api_url || serverFile.url;

            if (imageId) {
                updateImageValue(imageId, 'src', url);
            } else {
                updateValue('src', url);
            }
            onFileUploaded?.({
                id: serverFile.id,
                filename: serverFile.original_filename,
                mime_type: serverFile.mime_type,
                size: serverFile.size,
                human_size: serverFile.human_size,
                is_image: serverFile.is_image,
                url,
            });
            toast.success(t('Image uploaded'));
        } catch (err) {
            const message = axios.isAxiosError(err)
                ? err.response?.data?.error || err.response?.data?.message
                : null;
            setError(message || t('Failed to upload image'));
            toast.error(message || t('Failed to upload image'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleBulkImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !projectId) return;

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(`/project/${projectId}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const serverFile = response.data.file;
            const url = serverFile.api_url || serverFile.url;

            setBulkImageUrl(url);
            onFileUploaded?.({
                id: serverFile.id,
                filename: serverFile.original_filename,
                mime_type: serverFile.mime_type,
                size: serverFile.size,
                human_size: serverFile.human_size,
                is_image: serverFile.is_image,
                url,
            });
            toast.success(t('Image uploaded'));
        } catch (err) {
            const message = axios.isAxiosError(err)
                ? err.response?.data?.error || err.response?.data?.message
                : null;
            setError(message || t('Failed to upload image'));
            toast.error(message || t('Failed to upload image'));
        } finally {
            setIsUploading(false);
        }
    };

    const sectionImageGroups = useMemo(() => groupImagesBySource(sectionImages), [sectionImages]);

    const applyBulkSource = () => {
        if (!bulkImageUrl || sectionImages.length === 0) return;

        const targetSource = bulkTargetSource?.trim() || null;

        setImageValues(prev => {
            const next = { ...prev };

            for (const image of sectionImages) {
                const source = imageSource(image);
                const matchesTarget = !targetSource || source === targetSource;

                if (!matchesTarget) {
                    continue;
                }

                next[image.id] = {
                    ...next[image.id],
                    src: bulkImageUrl,
                };
            }

            return next;
        });

        toast.success(
            targetSource
                ? t('Selected image group replaced in preview')
                : t('All mapped images replaced in preview')
        );
    };

    const useImageForBulk = (image: InspectorImage) => {
        setBulkTargetSource(imageSource(image) || null);
        setBulkImageUrl(imageSource(image));
    };

    const title = element
        ? `<${element.tagName}${element.elementId ? `#${element.elementId}` : ''}>`
        : t('Edit element');

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="h-[92vh] w-[min(96vw,1600px)] max-w-none overflow-hidden p-0">
                <div className="grid h-full min-h-0 grid-rows-[auto,1fr,auto]">
                    <DialogHeader className="border-b px-5 py-4 text-left sm:text-left">
                        <DialogTitle>{t('Edit visual element')}</DialogTitle>
                    </DialogHeader>

                    <div className="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
                        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
                            <div className="rounded-md border bg-muted/40 px-3 py-2">
                                <p className="truncate font-mono text-xs text-muted-foreground" title={title}>
                                    {title}
                                </p>
                                {element?.cssSelector && (
                                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground" title={element.cssSelector}>
                                        {element.cssSelector}
                                    </p>
                                )}
                            </div>

                            {fields.map(field => (
                                <div key={field} className="space-y-2">
                                    <Label htmlFor={`visual-edit-${field}`} className="flex items-center gap-2">
                                        {fieldIcon(field)}
                                        {t(field === 'text' ? 'Text' : field)}
                                    </Label>
                                    {field === 'text' ? (
                                        <Textarea
                                            id={`visual-edit-${field}`}
                                            value={values[field] ?? ''}
                                            onChange={event => updateValue(field, event.target.value)}
                                            rows={4}
                                        />
                                    ) : (
                                        <div className="flex gap-2">
                                            <Input
                                                id={`visual-edit-${field}`}
                                                value={values[field] ?? ''}
                                                onChange={event => updateValue(field, event.target.value)}
                                            />
                                            {field === 'src' && element?.tagName === 'img' && (
                                                <Button type="button" variant="outline" size="icon" disabled={isUploading} asChild>
                                                    <Label htmlFor="visual-edit-image-upload" className="h-10 w-10 cursor-pointer justify-center">
                                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                    </Label>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {field === 'src' && element?.tagName === 'img' && (
                                        <input
                                            id="visual-edit-image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={event => handleImageUpload(event)}
                                            disabled={isUploading}
                                        />
                                    )}
                                </div>
                            ))}

                            {values.src && element?.tagName === 'img' && (
                                <div className="overflow-hidden rounded-md border bg-muted">
                                    <img src={values.src} alt={values.alt || ''} className="max-h-48 w-full object-contain" />
                                </div>
                            )}
                        </div>

                        <div className="min-h-0 border-t bg-muted/20 lg:border-l lg:border-t-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-4 p-5">
                                    <div className="space-y-3 rounded-xl border bg-background p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold">{t('Image map')}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {sectionImages.length > 0
                                                        ? t('Map, preview, and replace every image in this section.')
                                                        : t('No nested images were found in the current selection.')}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="shrink-0">
                                                {sectionImages.length}
                                            </Badge>
                                        </div>

                                        {sectionImages.length > 0 && (
                                            <>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <Label htmlFor="bulk-image-url">{t('Bulk image URL')}</Label>
                                                        <Input
                                                            id="bulk-image-url"
                                                            value={bulkImageUrl}
                                                            onChange={event => setBulkImageUrl(event.target.value)}
                                                            placeholder={t('Paste a URL to replace images in bulk')}
                                                        />
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button type="button" variant="outline" className="w-full" disabled={isUploading} asChild>
                                                            <Label htmlFor="bulk-image-upload" className="h-10 w-full cursor-pointer justify-center">
                                                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                                <span className="ms-2">{t('Attach')}</span>
                                                            </Label>
                                                        </Button>
                                                        <input
                                                            id="bulk-image-upload"
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={handleBulkImageUpload}
                                                            disabled={isUploading}
                                                        />
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        className="sm:col-span-1"
                                                        onClick={applyBulkSource}
                                                        disabled={!bulkImageUrl || isUploading}
                                                    >
                                                        {bulkTargetSource ? t('Replace selected source') : t('Replace all images')}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="sm:col-span-1"
                                                        onClick={() => {
                                                            setBulkImageUrl('');
                                                            setBulkTargetSource(null);
                                                        }}
                                                        disabled={isUploading}
                                                    >
                                                        {t('Clear')}
                                                    </Button>
                                                </div>

                                                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                                                    {bulkTargetSource ? (
                                                        <span className="block truncate font-mono" title={bulkTargetSource}>
                                                            {t('Selected source')}: {bulkTargetSource}
                                                        </span>
                                                    ) : (
                                                        <span>{t('No source selected. The replacement will apply to every mapped image.')}</span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {sectionImages.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-medium">{t('Mapped images')}</p>
                                                <Badge variant="secondary" className="shrink-0">
                                                    {sectionImageGroups.length}
                                                </Badge>
                                            </div>

                                            <div className="space-y-3">
                                                {sectionImageGroups.map((group, groupIndex) => (
                                                    <button
                                                        key={`${group.source || 'empty'}-${groupIndex}`}
                                                        type="button"
                                                        onClick={() => setBulkTargetSource(group.source || null)}
                                                        className={[
                                                            'w-full rounded-lg border bg-background p-3 text-left transition-colors',
                                                            bulkTargetSource === (group.source || null)
                                                                ? 'border-primary bg-primary/5'
                                                                : 'hover:bg-muted/60',
                                                        ].join(' ')}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                                                                {group.images[0] && imageSource(group.images[0]) ? (
                                                                    <img
                                                                        src={imageSource(group.images[0])}
                                                                        alt={group.images[0].alt || ''}
                                                                        className="h-full w-full object-contain"
                                                                    />
                                                                ) : (
                                                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                                                                        {group.source || t('No source URL')}
                                                                    </p>
                                                                    <Badge variant="outline" className="shrink-0">
                                                                        {group.images.length}
                                                                    </Badge>
                                                                </div>
                                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                                    {group.images.map(image => image.cssSelector).join(' · ')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {sectionImages.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-medium">{t('Image details')}</p>
                                                <span className="text-xs text-muted-foreground">
                                                    {t('Edit src and alt individually if needed')}
                                                </span>
                                            </div>

                                            <div className="space-y-3 pr-1">
                                                {sectionImages.map((image, index) => {
                                                    const currentValues = imageValues[image.id] ?? {};
                                                    const src = currentValues.src ?? imageOriginalValue(image, 'src');
                                                    const alt = currentValues.alt ?? imageOriginalValue(image, 'alt');
                                                    const uploadId = `visual-edit-section-image-upload-${index}`;

                                                    return (
                                                        <div key={image.id} className="rounded-md border bg-muted/30 p-3">
                                                            <div className="flex gap-3">
                                                                <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
                                                                    {src ? (
                                                                        <img src={src} alt={alt} className="h-full w-full object-contain" />
                                                                    ) : (
                                                                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0 flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <p className="truncate font-mono text-xs text-muted-foreground" title={image.cssSelector}>
                                                                            {image.cssSelector}
                                                                        </p>
                                                                        <span className="shrink-0 text-xs text-muted-foreground">
                                                                            {index + 1}/{sectionImages.length}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex gap-2">
                                                                        <Input
                                                                            value={src}
                                                                            onChange={event => updateImageValue(image.id, 'src', event.target.value)}
                                                                            aria-label={t('Image URL')}
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            onClick={() => useImageForBulk(image)}
                                                                        >
                                                                            {t('Use in bulk')}
                                                                        </Button>
                                                                        <Button type="button" variant="outline" size="icon" disabled={isUploading} asChild>
                                                                            <Label htmlFor={uploadId} className="h-10 w-10 cursor-pointer justify-center">
                                                                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                                            </Label>
                                                                        </Button>
                                                                        <input
                                                                            id={uploadId}
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="hidden"
                                                                            onChange={event => handleImageUpload(event, image.id)}
                                                                            disabled={isUploading}
                                                                        />
                                                                    </div>

                                                                    <Input
                                                                        value={alt}
                                                                        onChange={event => updateImageValue(image.id, 'alt', event.target.value)}
                                                                        aria-label={t('alt')}
                                                                        placeholder={t('alt')}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter className="border-t px-5 py-4">
                        {error && (
                            <div className="mr-auto flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        {pendingPayload && candidates.length > 0 && (
                            <div className="mr-auto max-h-40 w-full max-w-xl space-y-2 overflow-auto rounded-md border bg-background p-3">
                                <p className="text-sm font-medium">{t('Choose source file')}</p>
                                {candidates.map(candidate => (
                                    <button
                                        key={candidate.sourcePath}
                                        type="button"
                                        onClick={() => handleCandidate(candidate)}
                                        disabled={isSaving}
                                        className="w-full rounded-md border bg-background px-3 py-2 text-left hover:bg-muted"
                                    >
                                        <span className="block truncate font-mono text-xs">{candidate.sourcePath}</span>
                                        {candidate.snippet && (
                                            <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                                                {candidate.snippet}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <Button type="button" variant="outline" onClick={() => close(false)} disabled={isSaving || isUploading}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={isSaving || isUploading || !!pendingPayload}>
                            {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                            {t('Save')}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default VisualEditModal;
