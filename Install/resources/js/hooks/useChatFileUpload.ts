import { useCallback, useState } from 'react';
import axios from 'axios';
import type { AttachedFile } from '@/types/chat';

interface UseChatFileUploadOptions {
    projectId: string;
    maxFileSizeMb: number;
    allowedTypes: string[] | null;
}

interface UseChatFileUploadReturn {
    uploadFile: (file: File) => Promise<AttachedFile | null>;
    isUploading: boolean;
    uploadProgress: number;
    uploadError: string | null;
    clearError: () => void;
}

export function useChatFileUpload({
    projectId,
    maxFileSizeMb,
    allowedTypes,
}: UseChatFileUploadOptions): UseChatFileUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const validateFile = useCallback((file: File): string | null => {
        const maxBytes = maxFileSizeMb * 1024 * 1024;
        if (file.size > maxBytes) {
            return `File exceeds maximum size of ${maxFileSizeMb} MB`;
        }

        if (allowedTypes && allowedTypes.length > 0) {
            const isAllowed = allowedTypes.some(pattern => {
                if (pattern.endsWith('/*')) {
                    const prefix = pattern.slice(0, -2);
                    return file.type.startsWith(prefix);
                }
                return file.type === pattern || pattern === '*/*';
            });
            if (!isAllowed) {
                return `File type ${file.type} is not allowed`;
            }
        }

        return null;
    }, [maxFileSizeMb, allowedTypes]);

    const uploadFile = useCallback(async (file: File): Promise<AttachedFile | null> => {
        const validationError = validateFile(file);
        if (validationError) {
            setUploadError(validationError);
            return null;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post<{ file: { id: number; original_filename: string; mime_type: string; size: number; human_size: string; is_image: boolean; url: string }; storage_used: number }>(
                `/project/${projectId}/files`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const progress = progressEvent.total
                            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                            : 0;
                        setUploadProgress(progress);
                    },
                },
            );

            const serverFile = response.data.file;
            return {
                id: serverFile.id,
                filename: serverFile.original_filename,
                mime_type: serverFile.mime_type,
                size: serverFile.size,
                human_size: serverFile.human_size,
                is_image: serverFile.is_image,
                url: serverFile.url,
            };
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error || error.response?.data?.message || 'Upload failed'
                : 'Upload failed';
            setUploadError(errorMessage);
            return null;
        } finally {
            setIsUploading(false);
        }
    }, [projectId, validateFile]);

    const clearError = useCallback(() => setUploadError(null), []);

    return { uploadFile, isUploading, uploadProgress, uploadError, clearError };
}
