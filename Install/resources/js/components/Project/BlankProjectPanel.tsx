import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, RefreshCw, ExternalLink, FileUp, Loader2, Eye } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import axios from 'axios';

interface BlankProjectPanelProps {
    projectId: string;
    previewUrl?: string | null;
    subdomain?: string | null;
}

export function BlankProjectPanel({
    projectId,
    previewUrl,
    subdomain,
}: BlankProjectPanelProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [files, setFiles] = useState<any[]>([]);

    const loadFiles = useCallback(async () => {
        try {
            const response = await axios.get(`/api/blank-project/${projectId}/files`);
            if (response.data.success) {
                setFiles(response.data.files);
            }
        } catch (error) {
            toast.error(t('common:Failed to load files', { default: 'Failed to load files' }));
        }
    }, [projectId, t]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles) return;

        setIsLoading(true);
        const formData = new FormData();
        for (let i = 0; i < uploadedFiles.length; i++) {
            formData.append('files[]', uploadedFiles[i]);
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
                loadFiles();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('common:Upload failed', { default: 'Upload failed' }));
        } finally {
            setIsLoading(false);
            // Reset input
            if (event.target) event.target.value = '';
        }
    };

    const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
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
                loadFiles();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('common:Upload failed', { default: 'Upload failed' }));
        } finally {
            setIsLoading(false);
            if (event.target) event.target.value = '';
        }
    };

    const handleGeneratePreview = async () => {
        setIsSyncing(true);
        try {
            const response = await axios.post(`/api/blank-project/${projectId}/preview`);
            if (response.data.success) {
                toast.success(response.data.message);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to generate preview');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h2 className="text-2xl font-bold mb-2">HTML Project Manager</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            Upload your HTML, CSS, and JavaScript files or a ZIP archive.
                        </p>
                    </div>

                    {/* File Upload Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Individual File Upload */}
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                            <input
                                type="file"
                                id="file-input"
                                multiple
                                onChange={handleFileUpload}
                                disabled={isLoading}
                                className="hidden"
                                accept=".html,.htm,.css,.js,.json,.svg,.png,.jpg,.jpeg,.gif,.webp"
                            />
                            <label htmlFor="file-input" className="cursor-pointer block">
                                <FileUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                                <p className="text-sm font-medium mb-1">Upload Files</p>
                                <p className="text-xs text-gray-500">or drag and drop</p>
                            </label>
                        </div>

                        {/* ZIP Upload */}
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
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
                            onClick={handleGeneratePreview}
                            disabled={isSyncing || isLoading}
                            variant="default"
                            size="sm"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Regenerate Preview
                                </>
                            )}
                        </Button>

                        {previewUrl && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                            >
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Preview
                                </a>
                            </Button>
                        )}

                        {subdomain && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                            >
                                <a href={`https://${subdomain}.aapp.host`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Published
                                </a>
                            </Button>
                        )}
                    </div>

                    {/* Files List */}
                    {files.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Project Files</h3>
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
                        <p className="font-medium text-blue-900 dark:text-blue-200 mb-2">How to use:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300 text-xs">
                            <li>Upload your HTML/CSS/JS files or a ZIP archive</li>
                            <li>Files are automatically synced to preview</li>
                            <li>View the preview to verify your project</li>
                            <li>Publish to a subdomain when ready</li>
                        </ol>
                    </div>
                </div>
            </Card>
        </div>
    );
}
