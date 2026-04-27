import { useRef } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { useChatFileUpload } from '@/hooks/useChatFileUpload';
import type { AttachedFile } from '@/types/chat';

interface ChatUploadButtonProps {
    projectId: string;
    maxFileSizeMb: number;
    allowedTypes: string[] | null;
    disabled?: boolean;
    onFileUploaded: (file: AttachedFile) => void;
    onStorageUpdate?: (bytesUsed: number) => void;
}

export function ChatUploadButton({
    projectId,
    maxFileSizeMb,
    allowedTypes,
    disabled,
    onFileUploaded,
}: ChatUploadButtonProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFile, isUploading } = useChatFileUpload({
        projectId,
        maxFileSizeMb,
        allowedTypes,
    });

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            const result = await uploadFile(file);
            if (result) {
                onFileUploaded(result);
            }
        }

        // Reset input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                multiple
                disabled={disabled || isUploading}
                accept={allowedTypes?.join(',') ?? undefined}
            />
            <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClick}
                disabled={disabled || isUploading}
                className="h-8 w-8 p-0"
                title={t('Attach file')}
            >
                {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Paperclip className="h-3.5 w-3.5" />
                )}
            </Button>
        </>
    );
}
