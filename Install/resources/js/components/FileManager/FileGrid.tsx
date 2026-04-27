import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    File,
    FileText,
    FileVideo,
    FileAudio,
    Image as ImageIcon,
    Download,
    Trash2,
    Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectFile } from '@/types/storage';

interface FileGridProps {
    files: ProjectFile[];
    selectedIds: Set<number>;
    onSelect: (id: number, selected: boolean) => void;
    onSelectAll: (selected: boolean) => void;
    onDelete: (id: number) => void;
    onPreview: (file: ProjectFile) => void;
    deleting?: Set<number>;
}

const FILE_ICONS = {
    image: ImageIcon,
    pdf: FileText,
    video: FileVideo,
    audio: FileAudio,
    default: File,
} as const;

function getFileIconType(file: ProjectFile): keyof typeof FILE_ICONS {
    if (file.is_image) return 'image';
    if (file.is_pdf) return 'pdf';
    if (file.is_video) return 'video';
    if (file.is_audio) return 'audio';
    return 'default';
}

function FileCard({
    file,
    selected,
    onSelect,
    onDelete,
    onPreview,
    isDeleting,
}: {
    file: ProjectFile;
    selected: boolean;
    onSelect: (selected: boolean) => void;
    onDelete: () => void;
    onPreview: () => void;
    isDeleting: boolean;
}) {
    const iconType = getFileIconType(file);
    const Icon = FILE_ICONS[iconType];

    return (
        <div
            className={cn(
                'group relative rounded-lg border bg-card p-3 transition-all hover:shadow-md',
                selected && 'ring-2 ring-primary border-primary',
                isDeleting && 'opacity-50 pointer-events-none'
            )}
        >
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2 z-10">
                <Checkbox
                    checked={selected}
                    onCheckedChange={onSelect}
                    className="bg-background/80 backdrop-blur-sm"
                />
            </div>

            {/* Thumbnail / Icon */}
            <div
                className="aspect-square rounded-md bg-muted flex items-center justify-center mb-2 overflow-hidden cursor-pointer"
                onClick={onPreview}
            >
                {file.is_image ? (
                    <img
                        src={file.url}
                        alt={file.original_filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <Icon className="h-12 w-12 text-muted-foreground/50" />
                )}
            </div>

            {/* File Info */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <p className="text-sm font-medium truncate">{file.original_filename}</p>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{file.original_filename}</p>
                </TooltipContent>
            </Tooltip>
            <p className="text-xs text-muted-foreground mt-0.5">
                {file.human_size}
            </p>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            onClick={onPreview}
                        >
                            <Eye className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                        >
                            <a href={file.url} download={file.original_filename}>
                                <Download className="h-3.5 w-3.5" />
                            </a>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}

export function FileGrid({
    files,
    selectedIds,
    onSelect,
    onSelectAll,
    onDelete,
    onPreview,
    deleting = new Set(),
}: FileGridProps) {
    const allSelected = files.length > 0 && selectedIds.size === files.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < files.length;

    if (files.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Header with Select All */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => onSelectAll(!!checked)}
                        className={cn(someSelected && 'data-[state=checked]:bg-primary/50')}
                        ref={(el) => {
                            if (el) {
                                // @ts-expect-error - setting indeterminate state on checkbox
                                el.indeterminate = someSelected;
                            }
                        }}
                    />
                    <span className="text-sm text-muted-foreground">
                        {selectedIds.size > 0
                            ? `${selectedIds.size} selected`
                            : `${files.length} ${files.length === 1 ? 'file' : 'files'}`}
                    </span>
                </div>
            </div>

            {/* File Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {files.map((file) => (
                    <FileCard
                        key={file.id}
                        file={file}
                        selected={selectedIds.has(file.id)}
                        onSelect={(checked) => onSelect(file.id, checked)}
                        onDelete={() => onDelete(file.id)}
                        onPreview={() => onPreview(file)}
                        isDeleting={deleting.has(file.id)}
                    />
                ))}
            </div>
        </div>
    );
}
