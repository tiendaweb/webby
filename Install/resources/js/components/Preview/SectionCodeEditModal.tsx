import { useCallback, useEffect, useMemo, useState } from 'react';
import Editor, { BeforeMount } from '@monaco-editor/react';
import axios from 'axios';
import { AlertTriangle, Copy, FileCode2, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/contexts/LanguageContext';
import type {
    InspectorElement,
    SectionCodeCandidate,
    SectionCodeResolveResponse,
    SectionCodeSaveResponse,
} from '@/types/inspector';

interface SectionCodeEditModalProps {
    open: boolean;
    projectId?: string;
    element: InspectorElement | null;
    outerHTML: string;
    previewPath?: string;
    onOpenChange: (open: boolean) => void;
    onSaved?: (response: SectionCodeSaveResponse) => void;
}

function languageForPath(path?: string, fallback?: string): string {
    if (fallback) return fallback;
    if (!path) return 'html';

    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'tsx':
        case 'ts':
            return 'typescript';
        case 'jsx':
        case 'js':
            return 'javascript';
        case 'php':
            return 'php';
        case 'html':
        case 'htm':
            return 'html';
        default:
            return 'plaintext';
    }
}

export function SectionCodeEditModal({
    open,
    projectId,
    element,
    outerHTML,
    previewPath,
    onOpenChange,
    onSaved,
}: SectionCodeEditModalProps) {
    const { t } = useTranslation();
    const [sourcePath, setSourcePath] = useState<string | null>(null);
    const [originalCode, setOriginalCode] = useState('');
    const [content, setContent] = useState('');
    const [language, setLanguage] = useState('html');
    const [matchType, setMatchType] = useState<SectionCodeResolveResponse['matchType'] | null>(null);
    const [matchConfidence, setMatchConfidence] = useState<number | null>(null);
    const [matchReason, setMatchReason] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<SectionCodeCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selector = element?.cssSelector ?? '';
    const hasEditableSource = !!sourcePath && originalCode !== '';
    const hasChanges = content !== originalCode;

    const resetState = useCallback(() => {
        setSourcePath(null);
        setOriginalCode('');
        setContent('');
        setLanguage('html');
        setMatchType(null);
        setMatchConfidence(null);
        setMatchReason(null);
        setCandidates([]);
        setError(null);
        setIsLoading(false);
        setIsSaving(false);
    }, []);

    const resolveSource = useCallback(async (candidatePath?: string) => {
        if (!projectId || !element || !outerHTML) return;

        setIsLoading(true);
        setError(null);
        setCandidates([]);

        try {
            const response = await axios.post<SectionCodeResolveResponse>(`/project/${projectId}/section-code/resolve`, {
                selector: element.cssSelector,
                tagName: element.tagName,
                outerHTML,
                textPreview: element.textPreview,
                previewPath,
                sourcePath: candidatePath,
            });

            const data = response.data;

            if (data.success && data.sourcePath && typeof data.code === 'string') {
                setSourcePath(data.sourcePath);
                setOriginalCode(data.code);
                setContent(data.code);
                setLanguage(languageForPath(data.sourcePath, data.language));
                setMatchType(data.matchType ?? null);
                setMatchConfidence(typeof data.confidence === 'number' ? data.confidence : null);
                setMatchReason(data.reason ?? null);
                setCandidates([]);
                return;
            }

            setSourcePath(null);
            setOriginalCode('');
            setContent(outerHTML);
            setLanguage('html');
            setMatchType(null);
            setMatchConfidence(null);
            setMatchReason(null);
            setCandidates(data.candidates ?? []);
            setError(data.error || data.message || t('No safe source block was found for this section.'));
        } catch (err) {
            setSourcePath(null);
            setOriginalCode('');
            setContent(outerHTML);
            setLanguage('html');
            setMatchType(null);
            setMatchConfidence(null);
            setMatchReason(null);
            setCandidates([]);
            setError(axios.isAxiosError(err)
                ? err.response?.data?.error || t('Failed to load section code')
                : t('Failed to load section code'));
        } finally {
            setIsLoading(false);
        }
    }, [element, outerHTML, previewPath, projectId, t]);

    useEffect(() => {
        if (!open) {
            resetState();
            return;
        }

        setContent(outerHTML);
        void resolveSource();
    }, [open, outerHTML, resetState, resolveSource]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content || outerHTML);
            toast.success(t('Code copied to clipboard'));
        } catch {
            toast.error(t('Failed to copy code'));
        }
    }, [content, outerHTML, t]);

    const handleSave = async () => {
        if (!projectId || !sourcePath || !hasEditableSource || !hasChanges) return;

        setIsSaving(true);
        setError(null);

        try {
            const response = await axios.post<SectionCodeSaveResponse>(`/project/${projectId}/section-code/save`, {
                sourcePath,
                originalCode,
                newCode: content,
            });

            if (!response.data.success) {
                throw new Error(response.data.error || response.data.message || t('Failed to save section code'));
            }

            if (response.data.warning) {
                toast.warning(response.data.warning);
            }

            toast.success(t('Section code saved'));
            onSaved?.(response.data);
            onOpenChange(false);
        } catch (err) {
            setError(axios.isAxiosError(err)
                ? err.response?.data?.error || t('Failed to save section code')
                : (err as Error).message);
            toast.error(t('Failed to save section code'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditorWillMount: BeforeMount = (monaco) => {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
            allowJs: true,
        });

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false,
        });
    };

    const editorTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
        ? 'vs-dark'
        : 'light';
    const displayPath = sourcePath || (candidates.length > 0 ? t('Choose source file') : t('Rendered HTML'));
    const readOnly = !hasEditableSource || isLoading || isSaving;
    const matchTypeLabel = matchType ? ({
        exact: t('Exact match'),
        normalized: t('Normalized match'),
        structure: t('Structural match'),
        'preview-path': t('Preview path'),
    })[matchType] ?? t('Resolved') : null;
    const editorStatus = sourcePath
        ? `${matchTypeLabel ?? t('Resolved')} ${matchConfidence !== null ? `• ${matchConfidence}%` : ''}`.trim()
        : t('Rendered preview only');

    const title = useMemo(() => {
        if (!element) return t('Edit code');

        return `<${element.tagName}${element.elementId ? `#${element.elementId}` : ''}>`;
    }, [element, t]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1600px] flex-col overflow-hidden p-0 !translate-y-[-50%]">
                <DialogHeader className="border-b px-5 py-4 text-start">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <FileCode2 className="h-4 w-4 text-primary" />
                                {t('Edit code')}
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                {t('Edit the selected section source code.')}
                            </DialogDescription>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="font-mono text-[11px]">
                                    {title}
                                </Badge>
                                {selector && (
                                    <Badge variant="secondary" className="font-mono text-[11px]">
                                        {selector}
                                    </Badge>
                                )}
                                {sourcePath ? (
                                    <Badge variant="success" className="text-[11px]">
                                        {sourcePath}
                                    </Badge>
                                ) : (
                                    <Badge variant="warning" className="text-[11px]">
                                        {t('No source yet')}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {sourcePath && (
                                <Badge variant="outline" className="text-[11px]">
                                    {editorStatus}
                                </Badge>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 lg:grid-cols-[360px_1fr]">
                    <aside className="min-h-0 border-e bg-muted/20">
                        <ScrollArea className="h-full">
                            <div className="space-y-4 p-4">
                                <div className="rounded-lg border bg-card p-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <p className="text-sm font-medium">{t('Source selection')}</p>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {sourcePath
                                            ? t('This source was resolved automatically. Save will update the source file.')
                                            : t('Pick the file that contains the real source block. The rendered preview is read-only until we have a safe match.')}
                                    </p>
                                </div>

                                {error && (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    </div>
                                )}

                                {matchReason && sourcePath && (
                                    <div className="rounded-lg border bg-card p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            {t('Match reason')}
                                        </p>
                                        <p className="mt-2 text-sm">{matchReason}</p>
                                    </div>
                                )}

                                <div className="rounded-lg border bg-card p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            {candidates.length > 0 ? t('Source candidates') : t('Current source')}
                                        </p>
                                        {candidates.length > 0 && (
                                            <Badge variant="secondary" className="text-[11px]">
                                                {candidates.length}
                                            </Badge>
                                        )}
                                    </div>

                                    {candidates.length > 0 ? (
                                        <div className="mt-3 space-y-2">
                                            {candidates.map(candidate => (
                                                <button
                                                    key={candidate.sourcePath}
                                                    type="button"
                                                    onClick={() => resolveSource(candidate.sourcePath)}
                                                    disabled={isLoading || isSaving}
                                                    className="w-full rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-muted"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="truncate font-mono text-xs">{candidate.sourcePath}</span>
                                                        <div className="flex items-center gap-1">
                                                            {typeof candidate.confidence === 'number' && (
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {candidate.confidence}%
                                                                </Badge>
                                                            )}
                                                            {candidate.matchType && (
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    {candidate.matchType}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {candidate.reason && (
                                                        <p className="mt-1 text-xs text-muted-foreground">{candidate.reason}</p>
                                                    )}
                                                    {candidate.snippet && (
                                                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                            {candidate.snippet}
                                                        </p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                                            {sourcePath
                                                ? t('This section is already attached to a source file.')
                                                : t('No safe source block was found for this section. The editor keeps the rendered HTML as a fallback so you can inspect it.')}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-lg border bg-card p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {t('Selected block')}
                                    </p>
                                    <div className="mt-2 space-y-2 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-muted-foreground">{t('Preview path')}</span>
                                            <span className="truncate font-mono text-xs">{previewPath || t('Unknown')}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-muted-foreground">{t('Editor mode')}</span>
                                            <span className="truncate font-mono text-xs">{readOnly ? t('Read only') : t('Editable')}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-muted-foreground">{t('Current source')}</span>
                                            <span className="truncate font-mono text-xs">{displayPath}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </aside>

                    <main className="min-h-0 flex flex-col">
                        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {t('Code editor')}
                                </p>
                                <p className="truncate font-mono text-xs text-muted-foreground" title={displayPath}>
                                    {displayPath}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" onClick={handleCopy} disabled={!content && !outerHTML}>
                                    <Copy className="me-2 h-4 w-4" />
                                    {t('Copy')}
                                </Button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 p-4">
                            <div className="h-full overflow-hidden rounded-xl border bg-background shadow-sm">
                                <Editor
                                    height="100%"
                                    language={language}
                                    value={content}
                                    onChange={value => setContent(value ?? '')}
                                    theme={editorTheme}
                                    beforeMount={handleEditorWillMount}
                                    options={{
                                        fontSize: 13,
                                        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        lineNumbers: 'on',
                                        tabSize: 2,
                                        wordWrap: 'on',
                                        automaticLayout: true,
                                        padding: { top: 12 },
                                        readOnly,
                                    }}
                                />
                            </div>
                        </div>
                    </main>
                </div>

                <DialogFooter className="border-t bg-background px-5 py-4">
                    <div className="flex w-full items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                            {sourcePath ? t('Changes will update the source file and refresh preview.') : t('Select a safe source before saving.')}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={handleSave} disabled={!hasEditableSource || !hasChanges || isSaving || isLoading}>
                                {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
                                {t('Save')}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default SectionCodeEditModal;
