import { useEffect, useRef } from 'react';
import { Image, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttachedFile } from '@/types/chat';
import { useTranslation } from '@/contexts/LanguageContext';

interface FileMentionDropdownProps {
    files: AttachedFile[];
    selectedIndex: number;
    onSelect: (file: AttachedFile) => void;
    position: { top: number; left: number };
}

export function FileMentionDropdown({ files, selectedIndex, onSelect, position }: FileMentionDropdownProps) {
    const { t } = useTranslation();
    const listRef = useRef<HTMLDivElement>(null);

    // Scroll selected item into view
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const item = list.children[selectedIndex] as HTMLElement | undefined;
        item?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    if (files.length === 0) {
        return (
            <div
                className="fixed z-[9999] w-64 bg-popover border border-border rounded-lg shadow-lg p-3 text-sm text-muted-foreground"
                style={{ top: position.top, left: position.left }}
            >
                {t('No files found')}
            </div>
        );
    }

    return (
        <div
            ref={listRef}
            className="fixed z-[9999] w-72 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[240px] overflow-y-auto"
            style={{ top: position.top, left: position.left }}
        >
            {files.map((file, i) => (
                <button
                    key={file.id}
                    type="button"
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-sm text-start hover:bg-accent transition-colors',
                        i === selectedIndex && 'bg-accent',
                    )}
                    onMouseDown={(e) => {
                        e.preventDefault(); // Prevent editor blur
                        onSelect(file);
                    }}
                >
                    {file.is_image ? (
                        file.url ? (
                            <img src={file.url} className="w-8 h-8 rounded object-cover shrink-0" alt="" />
                        ) : (
                            <Image className="w-8 h-8 p-1.5 rounded bg-muted text-muted-foreground shrink-0" />
                        )
                    ) : (
                        <FileText className="w-8 h-8 p-1.5 rounded bg-muted text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{file.filename}</div>
                        {file.human_size && (
                            <div className="text-xs text-muted-foreground">{file.human_size}</div>
                        )}
                    </div>
                    {i === 0 && (
                        <kbd className="text-[10px] px-1 py-0.5 bg-muted rounded border border-border text-muted-foreground shrink-0">
                            Tab
                        </kbd>
                    )}
                </button>
            ))}
        </div>
    );
}
