import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { MessageSquare, Edit2, Copy, X, Code2, Container, PanelTop } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import type { InspectorElement, ElementMention, SectionCodeEditScope } from '@/types/inspector';

interface ElementContextMenuProps {
    /** The element that was clicked */
    element: InspectorElement;
    /** Position where the menu should appear */
    position: { x: number; y: number };
    /** Called when user clicks "Mention in Chat" */
    onMention: (element: ElementMention) => void;
    /** Called when user clicks "Edit visually" */
    onEdit: (element: InspectorElement) => void;
    /** Called when user clicks "Copy Selector" */
    onCopySelector: (selector: string) => void;
    /** Called when user clicks a code edit action */
    onViewCode: (element: InspectorElement, scope: SectionCodeEditScope) => void;
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
    onViewCode,
    onClose,
}: ElementContextMenuProps) {
    const { t } = useTranslation();
    const menuRef = useRef<HTMLDivElement>(null);
    const adjustedPosition = useMemo(() => {
        const width = 360;
        const height = 420;
        const padding = 12;

        if (typeof window === 'undefined') {
            return position;
        }

        return {
            x: Math.max(padding, Math.min(position.x, window.innerWidth - width - padding)),
            y: Math.max(padding, Math.min(position.y, window.innerHeight - height - padding)),
        };
    }, [position]);

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

    const handleViewCode = useCallback((scope: SectionCodeEditScope) => {
        onViewCode(element, scope);
    }, [element, onViewCode]);

    // Format element display
    const tagDisplay = element.tagName;
    const idDisplay = element.elementId ? `#${element.elementId}` : '';
    const classDisplay = element.classNames.length > 0 ? `.${element.classNames[0]}` : '';
    const elementLabel = `<${tagDisplay}${idDisplay}${classDisplay}>`;

    // Check if element has editable text or attributes
    const isTextEditable = ['div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'li', 'a', 'button', 'td', 'th'].includes(element.tagName);
    const hasEditableAttributes = Object.keys(element.attributes).length > 0 || ['a', 'img', 'input', 'textarea', 'button'].includes(element.tagName);
    const hasContainedImages = (element.images?.length ?? 0) > 0;
    const canEdit = isTextEditable || hasEditableAttributes || hasContainedImages;

    return (
        <div
            ref={menuRef}
            className="fixed z-[100000] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95"
            style={{
                top: adjustedPosition.y,
                left: adjustedPosition.x,
            }}
        >
            <div className="border-b bg-muted/30 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-muted-foreground" title={elementLabel}>
                            {elementLabel}
                        </p>
                        {element.textPreview && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={element.textPreview}>
                                &quot;{element.textPreview}&quot;
                            </p>
                        )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
                        {t('Menu')}
                    </Badge>
                </div>
            </div>

            <div className="max-h-[min(520px,calc(100vh-24px))] overflow-auto">
                <div className="space-y-3 p-2">
                    <section className="space-y-1.5">
                        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {t('Quick edit')}
                        </p>
                        {canEdit && (
                            <MenuAction
                                icon={<Edit2 className="h-4 w-4" />}
                                title={t('Edit visually')}
                                description={t('Change text, attributes, or images without opening the code editor.')}
                                onClick={handleEdit}
                            />
                        )}
                        <MenuAction
                            icon={<Code2 className="h-4 w-4" />}
                            title={t('Edit selected element')}
                            description={t('Open the smallest source block for this element.')}
                            onClick={() => handleViewCode('element')}
                        />
                        <MenuAction
                            icon={<Container className="h-4 w-4" />}
                            title={t('Edit container')}
                            description={t('Open the nearest div or layout container.')}
                            onClick={() => handleViewCode('container')}
                        />
                        <MenuAction
                            icon={<PanelTop className="h-4 w-4" />}
                            title={t('Edit full section')}
                            description={t('Open the full section wrapper.')}
                            onClick={() => handleViewCode('section')}
                        />
                    </section>

                    <section className="space-y-1.5">
                        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {t('Use with AI')}
                        </p>
                        <MenuAction
                            icon={<MessageSquare className="h-4 w-4" />}
                            title={t('Mention in chat')}
                            description={t('Insert this element into the prompt as a reference.')}
                            onClick={handleMention}
                        />
                    </section>

                    <section className="space-y-1.5">
                        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {t('Technical')}
                        </p>
                        <MenuAction
                            icon={<Copy className="h-4 w-4" />}
                            title={t('Copy selector')}
                            description={t('Copy the CSS selector for debugging or custom edits.')}
                            onClick={handleCopySelector}
                        />
                    </section>

                    <div className="pt-1">
                        <button
                            onClick={onClose}
                            className={cn(
                                "relative flex w-full items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors",
                                "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            )}
                        >
                            <X className="mr-2 h-4 w-4" />
                            {t('Close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MenuAction({
    icon,
    title,
    description,
    onClick,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors",
                "hover:border-border hover:bg-accent focus:border-border focus:bg-accent focus:outline-none"
            )}
        >
            <div className="mt-0.5 rounded-md border bg-background p-2 text-foreground shadow-sm transition-colors group-hover:bg-card">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{title}</span>
                </div>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    {description}
                </p>
            </div>
        </button>
    );
}

export default ElementContextMenu;
