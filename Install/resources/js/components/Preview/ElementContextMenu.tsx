import { useCallback, useEffect, useRef } from 'react';
import { MessageSquare, Edit2, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import type { InspectorElement, ElementMention } from '@/types/inspector';

interface ElementContextMenuProps {
    /** The element that was clicked */
    element: InspectorElement;
    /** Position where the menu should appear */
    position: { x: number; y: number };
    /** Called when user clicks "Mention in Chat" */
    onMention: (element: ElementMention) => void;
    /** Called when user clicks "Edit Text" */
    onEdit: (element: InspectorElement) => void;
    /** Called when user clicks "Copy Selector" */
    onCopySelector: (selector: string) => void;
    /** Called to close the menu */
    onClose: () => void;
}

/**
 * Convert InspectorElement to ElementMention for chat.
 */
function toElementMention(element: InspectorElement): ElementMention {
    return {
        id: element.id,
        tagName: element.tagName,
        selector: element.cssSelector,
        textPreview: element.textPreview,
    };
}

/**
 * Context menu that appears when an element is clicked in inspect mode.
 * Provides options to mention the element in chat, edit it, or copy its selector.
 */
export function ElementContextMenu({
    element,
    position,
    onMention,
    onEdit,
    onCopySelector,
    onClose,
}: ElementContextMenuProps) {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const handleMention = useCallback(() => {
        onMention(toElementMention(element));
    }, [element, onMention]);

    const handleEdit = useCallback(() => {
        onEdit(element);
    }, [element, onEdit]);

    const handleCopySelector = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(element.cssSelector);
            onCopySelector(element.cssSelector);
        } catch (err) {
            console.error('Failed to copy selector:', err);
        }
    }, [element.cssSelector, onCopySelector]);

    // Format element display
    const tagDisplay = element.tagName;
    const idDisplay = element.elementId ? `#${element.elementId}` : '';
    const classDisplay = element.classNames.length > 0 ? `.${element.classNames[0]}` : '';
    const elementLabel = `<${tagDisplay}${idDisplay}${classDisplay}>`;

    // Check if element has editable text
    const isTextEditable = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'li', 'a', 'button', 'td', 'th'].includes(element.tagName);

    return (
        <div
            ref={menuRef}
            className="fixed z-[100000] w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            style={{
                top: position.y,
                left: position.x,
            }}
        >
            {/* Element info header */}
            <div className="px-2 py-1.5 border-b mb-1">
                <p className="text-xs font-mono text-muted-foreground truncate" title={elementLabel}>
                    {elementLabel}
                </p>
                {element.textPreview && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={element.textPreview}>
                        &quot;{element.textPreview}&quot;
                    </p>
                )}
            </div>

            {/* Actions */}
            <button
                onClick={handleMention}
                className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                )}
            >
                <MessageSquare className="mr-2 h-4 w-4" />
                {t('Mention in Chat')}
            </button>

            {isTextEditable && (
                <button
                    onClick={handleEdit}
                    className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    )}
                >
                    <Edit2 className="mr-2 h-4 w-4" />
                    {t('Edit Text')}
                </button>
            )}

            <div className="my-1 h-px bg-border" />

            <button
                onClick={handleCopySelector}
                className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                )}
            >
                <Copy className="mr-2 h-4 w-4" />
                {t('Copy Selector')}
            </button>

            <div className="my-1 h-px bg-border" />

            <button
                onClick={onClose}
                className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-muted-foreground",
                    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                )}
            >
                <X className="mr-2 h-4 w-4" />
                {t('Cancel')}
            </button>
        </div>
    );
}

export default ElementContextMenu;
