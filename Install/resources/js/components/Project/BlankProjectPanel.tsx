import { useState, useCallback, useEffect, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, ExternalLink, FileUp, Loader2, Eye, Hammer, Cpu } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import axios from 'axios';
import { buildPublishedUrl } from '@/lib/publishedUrl';

interface BlankProjectPanelProps {
    projectId: string;
    previewUrl?: string | null;
    subdomain?: string | null;
    baseDomain?: string | null;
}

interface UploadedProjectFile {
    id?: string | number | null;
    filename: string;
    size?: string | null;
    type?: string | null;
    url?: string | null;
}

export function BlankProjectPanel({
    projectId,
    previewUrl,
    subdomain,
    baseDomain,
}: BlankProjectPanelProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [isBuilding, setIsBuilding] = useState(false);
    const [dragTarget, setDragTarget] = useState<'files' | 'zip' | null>(null);
    const [files, setFiles] = useState<UploadedProjectFile[]>([]);
    const [currentRuntime, setCurrentRuntime] = useState<string | null>(null);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(previewUrl ?? null);
    const publishedUrl = buildPublishedUrl(subdomain, baseDomain);
    const displayPreviewUrl = localPreviewUrl || previewUrl;

    useEffect(() => {
        setLocalPreviewUrl(previewUrl ?? null);
    }, [previewUrl]);

    const errorMessage = useCallback((error: unknown, fallback: string) => (
        axios.isAxiosError(error)
            ? error.response?.data?.message || error.response?.data?.error || fallback
            : fallback
    ), []);

    const loadFiles = useCallback(async () => {
        try {
            const response = await axios.get(`/api/blank-project/${projectId}/files`);
            if (response.data.success) {
                setFiles(response.data.files);
                setCurrentRuntime(response.data.runtime ?? null);
            }
        } catch {
            toast.error(t('common:Failed to load files', { default: 'Failed to load files' }));
        }
    }, [projectId, t]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const uploadFiles = useCallback(async (uploadedFiles: File[]) => {
        if (uploadedFiles.length === 0) return;

        setIsLoading(true);
        const formData = new FormData();
        for (const file of uploadedFiles) {
            formData.append('files[]', file);
        }

        try {
            const response = await axios.post(
                `/api/blank-project/${projectId}/upload-files`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setCurrentRuntime(response.data.runtime ?? currentRuntime);
                setLocalPreviewUrl(`/preview/${projectId}/`);
                loadFiles();
            }
        } catch (error: unknown) {
            toast.error(errorMessage(error, t('common:Upload failed', { default: 'Upload failed' })));
        } finally {
            setIsLoading(false);
        }
    }, [projectId, loadFiles, t, errorMessage, currentRuntime]);

    const uploadZip = useCallback(async (file: File) => {
        if (!file) return;

        setIsLoading(true);
        const formData = new FormData();
        formData.append('zip_file', file);

        try {
            const response = await axios.post(
                `/api/blank-project/${projectId}/upload-zip`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setCurrentRuntime(response.data.runtime ?? currentRuntime);
                setLocalPreviewUrl(`/preview/${projectId}/`);
                loadFiles();
            }
        } catch (error: unknown) {
            toast.error(errorMessage(error, t('common:Upload failed', { default: 'Upload failed' })));
        } finally {
            setIsLoading(false);
        }
    }, [projectId, loadFiles, t, errorMessage, currentRuntime]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles) return;
        await uploadFiles(Array.from(uploadedFiles));
        if (event.target) event.target.value = '';
    };

    const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await uploadZip(file);
        if (event.target) event.target.value = '';
    };

    const handleDragOver = (target: 'files' | 'zip') => (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isLoading) {
            setDragTarget(target);
        }
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragTarget(null);
        }
    };

    const handleDropFiles = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setDragTarget(null);
        if (isLoading) return;

        const droppedFiles = Array.from(event.dataTransfer.files);
        await uploadFiles(droppedFiles);
    };

    const handleDropZip = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setDragTarget(null);
        if (isLoading) return;

        const droppedFiles = Array.from(event.dataTransfer.files);
        const zipFile = droppedFiles.find((file) => {
            const name = file.name.toLowerCase();
            return name.endsWith('.zip')
                || file.type === 'application/zip'
                || file.type === 'application/x-zip-compressed';
        });

        if (!zipFile) {
            toast.error(t('common:Drop a ZIP file', { default: 'Drop a ZIP file' }));
            return;
        }

        await uploadZip(zipFile);
    };

    const handleBuildApp = async () => {
        setIsBuilding(true);
        try {
            const response = await axios.post(`/builder/projects/${projectId}/build`);
            if (response.data.success) {
                const nextPreviewUrl = response.data.preview_url || `/preview/${projectId}/`;
                setCurrentRuntime(response.data.runtime ?? currentRuntime);
                setLocalPreviewUrl(nextPreviewUrl);
                toast.success(response.data.runtime === 'frontend'
                    ? 'React/TypeScript app built successfully'
                    : 'Preview synced successfully');
            }
        } catch (error: unknown) {
            toast.error(errorMessage(error, 'Failed to build project'));
        } finally {
            setIsBuilding(false);
        }
    };

    const runtimeLabel = currentRuntime === 'frontend'
        ? 'React/TypeScript'
        : currentRuntime === 'php'
            ? 'PHP'
            : 'Static HTML';

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h2 className="text-2xl font-bold">Site Hosting Workspace</h2>
                            <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                                <Cpu className="h-3.5 w-3.5" />
                                {runtimeLabel}
                            </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                            Upload static files, PHP, or a Vite React/TypeScript app, then preview and publish it from this workspace.
                        </p>
                    </div>

                    {/* File Upload Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Individual File Upload */}
                        <div
                            onDragEnter={handleDragOver('files')}
                            onDragOver={handleDragOver('files')}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDropFiles}
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                dragTarget === 'files'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                            }`}
                        >
                            <input
                                type="file"
                                id="file-input"
                                multiple
                                onChange={handleFileUpload}
                                disabled={isLoading}
                                className="hidden"
                                accept=".html,.htm,.css,.js,.mjs,.cjs,.ts,.tsx,.jsx,.php,.json,.lock,.lockb,.txt,.md,.xml,.csv,.sql,.svg,.yaml,.yml,.webmanifest,.png,.jpg,.jpeg,.gif,.webp,.avif,.ico,.woff,.woff2,.ttf,.otf,.eot,.pdf,.map,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.mp3,.wav,.ogg,.mp4,.webm,.mov,.wasm"
                            />
                            <label htmlFor="file-input" className="cursor-pointer block">
                                <FileUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                                <p className="text-sm font-medium mb-1">Upload Files</p>
                                <p className="text-xs text-gray-500">HTML, React, TypeScript, PHP</p>
                            </label>
                        </div>

                        {/* ZIP Upload */}
                        <div
                            onDragEnter={handleDragOver('zip')}
                            onDragOver={handleDragOver('zip')}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDropZip}
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                dragTarget === 'zip'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                            }`}
                        >
                            <input
                                type="file"
                                id="zip-input"
                                onChange={handleZipUpload}
                                disabled={isLoading}
                                className="hidden"
                                accept=".zip"
                            />
                            <label htmlFor="zip-input" className="cursor-pointer block">
                                <Upload className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                <p className="text-sm font-medium mb-1">Upload ZIP</p>
                                <p className="text-xs text-gray-500">Extract and index</p>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={handleBuildApp}
                            disabled={isBuilding || isLoading}
                            variant="default"
                            size="sm"
                        >
                            {isBuilding ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <Hammer className="w-4 h-4 mr-2" />
                                    Sync Preview
                                </>
                            )}
                        </Button>

                        {displayPreviewUrl && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                            >
                                <a href={displayPreviewUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Preview
                                </a>
                            </Button>
                        )}

                        {publishedUrl && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                            >
                                <a href={publishedUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Published
                                </a>
                            </Button>
                        )}
                    </div>

                    {/* Files List */}
                    {files.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Site Files</h3>
                            <div className="space-y-1 max-h-64 overflow-y-auto">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded text-sm"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-700 dark:text-gray-200">
                                                {file.filename}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {file.size} • {file.type}
                                            </p>
                                        </div>
                                        {file.url && (
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="sm"
                                            >
                                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4 text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-200 mb-2">Hosting flow:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300 text-xs">
                            <li>Upload static files, PHP files, or a Vite React/TypeScript ZIP</li>
                            <li>Click Sync Preview to copy static/PHP files or compile React/TypeScript with the local Vite toolchain</li>
                            <li>View the preview to verify your project</li>
                            <li>Publish to a subdomain when ready</li>
                        </ol>
                    </div>
                </div>
            </Card>
        </div>
    );
}
