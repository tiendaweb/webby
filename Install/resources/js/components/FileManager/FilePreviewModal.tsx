import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileAudio, File } from 'lucide-react';
import type { ProjectFile } from '@/types/storage';
import { useTranslation } from '@/contexts/LanguageContext';

interface FilePreviewModalProps {
    file: ProjectFile | null;
    open: boolean;
    onClose: () => void;
}

export function FilePreviewModal({ file, open, onClose }: FilePreviewModalProps) {
    const { t } = useTranslation();

    if (!file) return null;

    const renderPreview = () => {
        if (file.is_image) {
            return (
                <div className="flex items-center justify-center rounded-lg bg-muted">
                    <img
                        src={file.url}
                        alt={file.original_filename}
                        className="max-w-full max-h-[60vh] object-contain"
                    />
                </div>
            );
        }

        if (file.is_pdf) {
            return (
                <iframe
                    src={file.url}
                    title={file.original_filename}
                    className="w-full h-[70vh] rounded-lg border"
                />
            );
        }

        if (file.is_video) {
            return (
                <video
                    src={file.url}
                    controls
                    className="w-full max-h-[70vh] rounded-lg"
                >
                    {t('Your browser does not support the video tag.')}
                </video>
            );
        }

        if (file.is_audio) {
            return (
                <div className="flex flex-col items-center justify-center py-12">
                    <FileAudio className="h-24 w-24 text-muted-foreground/30 mb-6" />
                    <audio src={file.url} controls className="w-full max-w-md">
                        {t('Your browser does not support the audio tag.')}
                    </audio>
                </div>
            );
        }

        // Default: show icon and download option
        const Icon = file.mime_type?.startsWith('text/') ? FileText : File;
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Icon className="h-24 w-24 text-muted-foreground/30 mb-6" />
                <p className="text-muted-foreground mb-4">
                    {t('Preview not available for this file type')}
                </p>
                <Button asChild>
                    <a href={file.url} download={file.original_filename}>
                        <Download className="h-4 w-4 me-2" />
                        {t('Download File')}
                    </a>
                </Button>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-lg truncate">
                        {file.original_filename}
                    </DialogTitle>
                    <DialogDescription>
                        {file.human_size} &bull; {file.mime_type}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-auto">
                    {renderPreview()}
                </div>
            </DialogContent>
        </Dialog>
    );
}
