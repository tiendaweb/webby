import { Button } from '@/components/ui/button';
import { Save, Trash2, X, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PendingEdit } from '@/types/inspector';

interface PendingEditsPanelProps {
    edits: PendingEdit[];
    onSaveAll: () => void;
    onDiscardAll: () => void;
    onRemoveEdit?: (id: string) => void;
    isSaving?: boolean;
}

/**
 * Panel showing pending text/attribute edits with save/discard actions.
 * Appears at the bottom of the preview when edits are pending.
 */
export function PendingEditsPanel({
    edits,
    onSaveAll,
    onDiscardAll,
    onRemoveEdit,
    isSaving = false,
}: PendingEditsPanelProps) {
    const { t } = useTranslation();

    if (edits.length === 0) return null;

    return (
        <div className="shrink-0 border-t border-border shadow-lg bg-card relative z-50">
            {/* Header */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-card">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                        {t(':count pending changes', { count: edits.length })}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDiscardAll}
                        disabled={isSaving}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t('Discard All')}
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={onSaveAll}
                        disabled={isSaving}
                        className="h-7 px-3 text-xs"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                {t('Saving...')}
                            </>
                        ) : (
                            <>
                                <Save className="h-3.5 w-3.5 mr-1" />
                                {t('Save All')}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Edit list - native scrolling for simplicity */}
            <div className="max-h-40 overflow-y-auto bg-card p-2 space-y-1">
                {edits.map((edit) => (
                    <EditItem
                        key={edit.id}
                        edit={edit}
                        onRemove={onRemoveEdit ? () => onRemoveEdit(edit.id) : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

interface EditItemProps {
    edit: PendingEdit;
    onRemove?: () => void;
}

function EditItem({ edit, onRemove }: EditItemProps) {
    const { element, field, originalValue, newValue } = edit;

    // Truncate values for display
    const truncate = (str: string, max: number) =>
        str.length > max ? str.substring(0, max) + '...' : str;

    const displayOriginal = truncate(originalValue, 30);
    const displayNew = truncate(newValue, 30);

    return (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted text-xs">
            {/* Element info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-primary">
                        &lt;{element.tagName}{element.cssSelector.startsWith('#') ? '' : `.${element.classNames[0] || ''}`}&gt;
                    </span>
                    {field !== 'text' && (
                        <span className="text-muted-foreground">
                            [{field}]
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="line-through text-destructive" title={originalValue}>
                        &quot;{displayOriginal}&quot;
                    </span>
                    <span className="text-muted-foreground">&rarr;</span>
                    <span className="text-success font-medium" title={newValue}>
                        &quot;{displayNew}&quot;
                    </span>
                </div>
            </div>

            {/* Remove button */}
            {onRemove && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                >
                    <X className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    );
}

export default PendingEditsPanel;
