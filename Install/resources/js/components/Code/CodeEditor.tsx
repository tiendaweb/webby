import { useState, useEffect, useCallback, useMemo } from 'react';
import Editor, { BeforeMount } from '@monaco-editor/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Lock, Save } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/LanguageContext';

// Protected files that cannot be edited via the code editor.
// Must match the Go backend's executor.ProtectedWriteFiles list.
const PROTECTED_FILES = [
    'vite.config.ts',
    'tsconfig.json',
    'package.json',
    'package-lock.json',
    'components.json',
    'tailwind.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'postcss.config.cjs',
    'index.html',
    'src/main.tsx',
    'src/index.css',
    'template.json',
];

interface CodeEditorProps {
    projectId: string;
    selectedFile: string | null;
    onSave?: () => void;
}

export function CodeEditor({ projectId, selectedFile, onSave }: CodeEditorProps) {
    const { t } = useTranslation();
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { resolvedTheme } = useTheme();

    const fetchFile = useCallback(async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`/builder/projects/${projectId}/file`, {
                params: { path }
            });
            setContent(res.data.content);
            setOriginalContent(res.data.content);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || t('Failed to load file'));
            } else {
                setError(t('Failed to load file'));
            }
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        if (selectedFile) {
            fetchFile(selectedFile);
        } else {
            setContent('');
            setOriginalContent('');
        }
    }, [selectedFile, fetchFile]);

    const handleSave = async () => {
        if (!selectedFile || content === originalContent) return;

        setSaving(true);
        setError(null);
        try {
            await axios.put(`/builder/projects/${projectId}/file`, {
                path: selectedFile,
                content,
            });
            setOriginalContent(content);
            onSave?.();
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || t('Failed to save file'));
            } else {
                setError(t('Failed to save file'));
            }
        } finally {
            setSaving(false);
        }
    };

    const isReadOnly = useMemo(() => {
        if (!selectedFile) return false;
        return PROTECTED_FILES.includes(selectedFile);
    }, [selectedFile]);

    // Keyboard shortcut for save (Cmd/Ctrl+S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (!isReadOnly) {
                    handleSave();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, originalContent, selectedFile, isReadOnly]);

    const getLanguage = (path: string | null): string => {
        if (!path) return 'plaintext';
        const ext = path.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'tsx':
                return 'typescript';
            case 'ts':
                return 'typescript';
            case 'jsx':
                return 'javascript';
            case 'js':
                return 'javascript';
            case 'css':
                return 'css';
            case 'html':
                return 'html';
            case 'json':
                return 'json';
            case 'md':
                return 'markdown';
            default:
                return 'plaintext';
        }
    };

    const hasChanges = content !== originalContent;

    const handleEditorWillMount: BeforeMount = (monaco) => {
        // Configure TypeScript compiler options for JSX/TSX support
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types'],
        });

        // Disable semantic validation to avoid false positives without full type definitions
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false,
        });

        // Same for JavaScript
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            noEmit: true,
            jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
            allowJs: true,
        });

        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false,
        });
    };

    const editorTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="h-10 px-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">
                        {selectedFile || t('No file selected')}
                    </span>
                    {isReadOnly && (
                        <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                            <Lock className="h-3 w-3" />
                            {t('Read-only')}
                        </Badge>
                    )}
                    {!isReadOnly && hasChanges && (
                        <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" title={t('Unsaved changes')} />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {error && <span className="text-xs text-destructive">{error}</span>}
                    {!isReadOnly && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            className="gap-1"
                        >
                            {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Save className="h-3.5 w-3.5" />
                            )}
                            {t('Save')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1">
                {!selectedFile ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        {t('Select a file to edit')}
                    </div>
                ) : loading ? (
                    <div className="h-full p-4 space-y-2">
                        {/* Skeleton code lines */}
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-56" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-72" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-6" />
                            <Skeleton className="h-4 w-52" />
                        </div>
                    </div>
                ) : (
                    <Editor
                        height="100%"
                        language={getLanguage(selectedFile)}
                        value={content}
                        onChange={value => setContent(value || '')}
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
                            padding: { top: 8 },
                            readOnly: isReadOnly,
                        }}
                    />
                )}
            </div>
        </div>
    );
}
