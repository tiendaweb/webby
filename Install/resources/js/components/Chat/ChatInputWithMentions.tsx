import { useCallback, useEffect, useMemo, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
    $getRoot,
    $createParagraphNode,
    $createTextNode,
    COMMAND_PRIORITY_HIGH,
    KEY_ENTER_COMMAND,
    EditorState,
    type LexicalEditor,
} from 'lexical';
import { Button } from '@/components/ui/button';
import { Send, Square, Loader2, X, MousePointerClick, Image, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementMention } from '@/types/inspector';
import type { AttachedFile } from '@/types/chat';
import { useTranslation } from '@/contexts/LanguageContext';
import { FileMentionNode } from './nodes/FileMentionNode';
import { FileMentionPlugin } from './plugins/FileMentionPlugin';
import { ChatUploadButton } from './ChatUploadButton';
import { extractFileMentions } from './utils/extractFileMentions';

interface FileData {
    fileIds: number[];
    attachedFiles: AttachedFile[];
}

interface ChatInputWithMentionsProps {
    /** Current text value (for controlled component) */
    value: string;
    /** Called when text changes */
    onChange: (value: string) => void;
    /** Called when form is submitted */
    onSubmit: (e: React.FormEvent, fileData?: FileData) => void;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Currently selected element to mention */
    selectedElement: ElementMention | null;
    /** Called to clear the selected element */
    onClearElement: () => void;
    /** Placeholder text */
    placeholder?: string;
    /** Whether a build is in progress (shows stop button) */
    isLoading?: boolean;
    /** Called when stop button is clicked */
    onCancel?: () => void;
    /** Whether file storage is enabled for this project's plan */
    storageEnabled?: boolean;
    /** Project ID for file uploads */
    projectId?: string;
    /** Max file size in MB from plan */
    maxFileSizeMb?: number;
    /** Allowed file types from plan */
    allowedTypes?: string[] | null;
    /** Project files for @mention autocomplete */
    projectFiles?: AttachedFile[];
    /** Files uploaded via paperclip button (managed by parent) */
    uploadedFiles?: AttachedFile[];
    /** Called when a file is uploaded */
    onFileUploaded?: (file: AttachedFile) => void;
    /** Called to remove an uploaded file badge */
    onRemoveUploadedFile?: (fileId: number) => void;
    /** Called when files are dropped onto the input (parent handles upload) */
    onFilesDropped?: (files: File[]) => void;
}

// Theme for Lexical editor
const theme = {
    paragraph: 'mb-0',
    text: {
        base: '',
    },
};

// Handle errors
function onError(error: Error) {
    console.error('Lexical error:', error);
}

/**
 * Plugin to capture the editor instance via ref.
 */
function EditorRefPlugin({ editorRef }: { editorRef: React.MutableRefObject<LexicalEditor | null> }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        editorRef.current = editor;
    }, [editor, editorRef]);
    return null;
}

/**
 * Plugin to sync editor content with parent component.
 */
function SyncPlugin({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const [editor] = useLexicalComposerContext();
    const isExternalUpdate = useRef(false);

    // Sync external value changes to editor
    useEffect(() => {
        if (isExternalUpdate.current) {
            isExternalUpdate.current = false;
            return;
        }

        editor.update(() => {
            const root = $getRoot();
            const currentText = root.getTextContent();

            if (currentText !== value) {
                root.clear();
                const paragraph = $createParagraphNode();
                if (value) {
                    paragraph.append($createTextNode(value));
                }
                root.append(paragraph);
            }
        });
    }, [editor, value]);

    // Sync editor changes to parent
    const handleChange = useCallback(
        (editorState: EditorState) => {
            editorState.read(() => {
                const text = $getRoot().getTextContent();
                if (text !== value) {
                    isExternalUpdate.current = true;
                    onChange(text);
                }
            });
        },
        [onChange, value]
    );

    return <OnChangePlugin onChange={handleChange} />;
}

/**
 * Plugin to handle Enter key submission.
 */
function EnterKeyPlugin({ onSubmit }: { onSubmit: () => void }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerCommand(
            KEY_ENTER_COMMAND,
            (event: KeyboardEvent | null) => {
                if (event && !event.shiftKey) {
                    event.preventDefault();
                    onSubmit();
                    return true;
                }
                return false;
            },
            COMMAND_PRIORITY_HIGH
        );
    }, [editor, onSubmit]);

    return null;
}

/**
 * Chat input component with Lexical editor, element mention, and file mention support.
 */
export function ChatInputWithMentions({
    value,
    onChange,
    onSubmit,
    disabled = false,
    selectedElement,
    onClearElement,
    placeholder,
    isLoading = false,
    onCancel,
    storageEnabled,
    projectId,
    maxFileSizeMb,
    allowedTypes,
    projectFiles,
    uploadedFiles,
    onFileUploaded,
    onRemoveUploadedFile,
    onFilesDropped,
}: ChatInputWithMentionsProps) {
    const { t } = useTranslation();
    const editorRef = useRef<LexicalEditor | null>(null);
    const defaultPlaceholder = t('Describe what you want to build...');
    const actualPlaceholder = placeholder || defaultPlaceholder;

    const hasUploadedFiles = uploadedFiles && uploadedFiles.length > 0;

    const handleSubmit = useCallback(
        (e?: React.FormEvent) => {
            e?.preventDefault();

            // Extract @mentioned files from the editor, resolving full metadata from projectFiles
            const mentionData = editorRef.current
                ? extractFileMentions(editorRef.current.getEditorState(), projectFiles)
                : { fileIds: [], attachedFiles: [] };

            // Merge with badge files (from paperclip uploads), deduplicate by ID
            const badgeIds = uploadedFiles?.map(f => f.id) ?? [];
            const allFileIds = [...new Set([...mentionData.fileIds, ...badgeIds])];
            const allFiles = [...mentionData.attachedFiles, ...(uploadedFiles ?? [])]
                .filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i);
            const fileData: FileData | undefined = allFileIds.length > 0
                ? { fileIds: allFileIds, attachedFiles: allFiles }
                : undefined;

            if (value.trim() || selectedElement || allFileIds.length > 0) {
                onSubmit(e || ({ preventDefault: () => {} } as React.FormEvent), fileData);
            }
        },
        [value, selectedElement, onSubmit, uploadedFiles, projectFiles]
    );

    const handleDrop = useCallback((e: React.DragEvent) => {
        if (!storageEnabled || !onFilesDropped || disabled) return;
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onFilesDropped(files);
        }
    }, [storageEnabled, onFilesDropped, disabled]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        if (!storageEnabled || disabled) return;
        e.preventDefault();
        e.stopPropagation();
    }, [storageEnabled, disabled]);

    // Memoize initialConfig to prevent LexicalComposer remount
    // Always register FileMentionNode to avoid "Unknown node type" errors on deserialization
    const initialConfig = useMemo(() => ({
        namespace: 'ChatInput',
        theme,
        onError,
        nodes: [FileMentionNode],
    }), []);

    return (
        <form onSubmit={handleSubmit}>
            <div
                className="relative bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden transition-all focus-within:border-primary/50 focus-within:shadow-md"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                {/* Element mention chip */}
                {selectedElement && (
                    <div className="px-3 pt-3 pb-1">
                        <ElementChip element={selectedElement} onRemove={onClearElement} />
                    </div>
                )}

                {/* Uploaded file badges */}
                {hasUploadedFiles && (
                    <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5">
                        {uploadedFiles!.map(file => (
                            <FileChip
                                key={file.id}
                                file={file}
                                onRemove={() => onRemoveUploadedFile?.(file.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Lexical editor */}
                <LexicalComposer initialConfig={initialConfig}>
                    <div className="relative">
                        <PlainTextPlugin
                            contentEditable={
                                <ContentEditable
                                    className={cn(
                                        'w-full px-4 py-3 text-sm resize-none border-0 bg-transparent',
                                        'focus:outline-none focus:ring-0 min-h-[60px] max-h-[120px] overflow-y-auto',
                                        disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
                                    )}
                                />
                            }
                            placeholder={
                                <div className="absolute top-3 start-4 text-sm text-muted-foreground pointer-events-none">
                                    {actualPlaceholder}
                                </div>
                            }
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                        <EditorRefPlugin editorRef={editorRef} />
                        <SyncPlugin value={value} onChange={onChange} />
                        <HistoryPlugin />
                        <EnterKeyPlugin onSubmit={handleSubmit} />
                        {storageEnabled && projectFiles && projectFiles.length > 0 && (
                            <FileMentionPlugin files={projectFiles} disabled={disabled} />
                        )}
                    </div>
                </LexicalComposer>

                {/* Footer with hints and buttons */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <kbd className="px-1.5 py-0.5 bg-background rounded border border-border text-[10px] font-medium">
                            Enter
                        </kbd>
                        <span>{t('to send')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {storageEnabled && projectId && maxFileSizeMb && onFileUploaded && (
                            <ChatUploadButton
                                projectId={projectId}
                                maxFileSizeMb={maxFileSizeMb}
                                allowedTypes={allowedTypes ?? null}
                                disabled={disabled || isLoading}
                                onFileUploaded={onFileUploaded}
                            />
                        )}
                        {isLoading && onCancel && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={onCancel}
                                className="h-8 px-3 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                            >
                                <Square className="h-3.5 w-3.5 me-1.5" />
                                {t('Stop')}
                            </Button>
                        )}
                        <Button
                            type="submit"
                            size="sm"
                            disabled={(!value.trim() && !selectedElement && !hasUploadedFiles) || disabled}
                            className="h-8 px-3"
                        >
                            {isLoading ? (
                                <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5 me-1.5" />
                            )}
                            {t('Send')}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}

/**
 * Element chip component for displaying selected element.
 */
interface ElementChipProps {
    element: ElementMention;
    onRemove: () => void;
}

function ElementChip({ element, onRemove }: ElementChipProps) {
    // Extract class from selector for display
    const getDisplaySelector = () => {
        if (element.selector.startsWith('#')) {
            return element.selector;
        }
        const match = element.selector.match(/\.([^:\s>]+)/);
        return match ? `.${match[1]}` : '';
    };

    return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
            <MousePointerClick className="h-3 w-3" />
            <span className="font-mono">
                {element.tagName}{getDisplaySelector()}
            </span>
            {element.textPreview && (
                <span className="text-muted-foreground truncate max-w-[150px]" title={element.textPreview}>
                    &quot;{element.textPreview.length > 20 ? element.textPreview.substring(0, 20) + '...' : element.textPreview}&quot;
                </span>
            )}
            <button
                type="button"
                onClick={onRemove}
                className="ms-0.5 p-0.5 hover:bg-primary/20 rounded"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

/**
 * File chip component for displaying uploaded file badges.
 */
function FileChip({ file, onRemove }: { file: AttachedFile; onRemove: () => void }) {
    return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border-transparent bg-secondary text-secondary-foreground rounded-md text-xs font-medium">
            {file.is_image ? (
                <Image className="h-3 w-3 shrink-0" />
            ) : (
                <FileText className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate max-w-[120px]">{file.filename}</span>
            <button
                type="button"
                onClick={onRemove}
                className="ms-0.5 p-0.5 hover:bg-secondary-foreground/10 rounded"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

export default ChatInputWithMentions;
