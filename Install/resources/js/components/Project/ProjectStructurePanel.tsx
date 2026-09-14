import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/contexts/LanguageContext';
import { Code2, Copy, EyeOff, FileCode, Loader2, Plus, RefreshCw, Rows3, Trash2, ArrowDown, ArrowUp, Pencil } from 'lucide-react';

interface StructureNode {
    id: string;
    sourcePath: string;
    index: number;
    tagName: string;
    title: string;
    textPreview: string;
    hidden: boolean;
}

interface StructurePage {
    path: string;
    name: string;
    title: string;
    sections: StructureNode[];
}

interface ProjectStructurePanelProps {
    projectId: string;
    onSourceChanged?: () => void;
    onOpenCode?: (path: string) => void;
}

export function ProjectStructurePanel({ projectId, onSourceChanged, onOpenCode }: ProjectStructurePanelProps) {
    const { t } = useTranslation();
    const [pages, setPages] = useState<StructurePage[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyNode, setBusyNode] = useState<string | null>(null);

    const fetchStructure = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/project/${projectId}/structure`);
            setPages(response.data.pages || []);
        } catch {
            toast.error(t('Failed to load site structure'));
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        fetchStructure();
    }, [fetchStructure]);

    const runAction = async (node: StructureNode, action: string, label?: string) => {
        if (action === 'delete' && !window.confirm(t('Delete this section?'))) return;

        setBusyNode(node.id);
        try {
            const response = await axios.post(`/project/${projectId}/structure/actions`, {
                sourcePath: node.sourcePath,
                nodeId: node.id,
                action,
                label,
            });
            setPages(response.data.structure?.pages || []);
            toast.success(t('Structure updated'));
            onSourceChanged?.();
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error : null;
            toast.error(message || t('Failed to update structure'));
        } finally {
            setBusyNode(null);
        }
    };

    const renameNode = (node: StructureNode) => {
        const nextLabel = window.prompt(t('Section name'), node.title);
        if (nextLabel === null || nextLabel.trim() === '') return;
        runAction(node, 'rename', nextLabel.trim());
    };

    const addAfter = (node: StructureNode) => {
        const nextLabel = window.prompt(t('New section name'), t('New section'));
        if (nextLabel === null) return;
        runAction(node, 'add_after', nextLabel.trim());
    };

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="h-12 px-4 border-b flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Rows3 className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold leading-tight">{t('Structure')}</h2>
                        <p className="text-xs text-muted-foreground truncate">{t('Pages and editable sections')}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchStructure} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="rounded-md border p-3 space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-64" />
                            </div>
                        ))
                    ) : pages.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground">
                            <FileCode className="h-8 w-8 mb-2" />
                            <p className="text-sm">{t('No editable pages found')}</p>
                        </div>
                    ) : (
                        pages.map((page) => (
                            <section key={page.path} className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                                            {page.title || page.name}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground truncate">{page.path}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenCode?.(page.path)}>
                                        <Code2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {page.sections.length === 0 ? (
                                        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                            {t('No sections detected in this page')}
                                        </div>
                                    ) : (
                                        page.sections.map((node) => (
                                            <div key={node.id} className="rounded-md border bg-card p-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium truncate">{node.title}</span>
                                                            <Badge variant="outline" className="text-[10px]">{node.tagName}</Badge>
                                                            {node.hidden && <Badge variant="secondary" className="text-[10px]">{t('Hidden')}</Badge>}
                                                        </div>
                                                        {node.textPreview && (
                                                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{node.textPreview}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyNode !== null} onClick={() => runAction(node, 'move_up')} title={t('Move up')}>
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyNode !== null} onClick={() => runAction(node, 'move_down')} title={t('Move down')}>
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyNode !== null} onClick={() => renameNode(node)} title={t('Rename')}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyNode !== null} onClick={() => runAction(node, 'duplicate')} title={t('Duplicate')}>
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyNode !== null || node.hidden} onClick={() => runAction(node, 'hide')} title={t('Hide')}>
                                                        <EyeOff className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyNode !== null} onClick={() => addAfter(node)} title={t('Add section after')}>
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyNode !== null} onClick={() => onOpenCode?.(node.sourcePath)} title={t('Open code')}>
                                                        <Code2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={busyNode !== null} onClick={() => runAction(node, 'delete')} title={t('Delete')}>
                                                        {busyNode === node.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
