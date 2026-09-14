import { useState, useEffect, useCallback, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ChevronRight, ChevronDown, FileText, Folder, FolderOpen, FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface FileEntry {
    path: string;
    name: string;
    size: number;
    is_dir: boolean;  // API returns snake_case
    mod_time: string;
}

interface FileTreeProps {
    projectId: string;
    onFileSelect: (path: string) => void;
    selectedFile: string | null;
    refreshTrigger?: number;
}

interface TreeNodeData {
    name: string;
    path: string;
    isDir: boolean;
    children: TreeNodeData[];
}

export function FileTree({ projectId, onFileSelect, selectedFile, refreshTrigger = 0 }: FileTreeProps) {
    const { t } = useTranslation();
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['.', 'src']));
    const [selectedPath, setSelectedPath] = useState<string | null>(selectedFile || null);
    const [isDraggingProjectFile, setIsDraggingProjectFile] = useState(false);
    const [isUploadingProjectFile, setIsUploadingProjectFile] = useState(false);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`/builder/projects/${projectId}/files`);
            setFiles(res.data.files || []);
        } catch (err) {
            console.error('Failed to fetch files:', err);
            setError(t('Failed to load files'));
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles, refreshTrigger]);

    useEffect(() => {
        setSelectedPath(selectedFile || null);
    }, [selectedFile]);

    const toggleDir = (path: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const createFile = async () => {
        const path = window.prompt(t('File path'), 'index.html');
        if (!path) return;

        try {
            await axios.post(`/api/blank-project/${projectId}/file`, { path });
            toast.success(t('File created'));
            await fetchFiles();
            setSelectedPath(path);
            onFileSelect(path);
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error || err.response?.data?.message : null;
            toast.error(message || t('Failed to create file'));
        }
    };

    const createFolder = async () => {
        const path = window.prompt(t('Folder path'), 'assets');
        if (!path) return;

        try {
            await axios.post(`/api/blank-project/${projectId}/folder`, { path });
            toast.success(t('Folder created'));
            setExpanded(prev => new Set(prev).add(path));
            setSelectedPath(path);
            await fetchFiles();
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error || err.response?.data?.message : null;
            toast.error(message || t('Failed to create folder'));
        }
    };

    const selectNode = (path: string, isDir: boolean) => {
        setSelectedPath(path);

        if (!isDir) {
            onFileSelect(path);
        }
    };

    const getParentPath = (path: string) => {
        const index = path.lastIndexOf('/');
        return index > 0 ? path.slice(0, index) : null;
    };

    const selectedEntry = selectedPath ? files.find(file => file.path === selectedPath) : null;

    const renameSelected = async () => {
        if (!selectedPath) return;

        const nextPath = window.prompt(t('New path'), selectedPath);
        if (nextPath === null) return;

        const trimmedPath = nextPath.trim();
        if (!trimmedPath || trimmedPath === selectedPath) return;

        try {
            const response = await axios.patch<{ path?: string }>(`/builder/projects/${projectId}/path`, {
                from: selectedPath,
                to: trimmedPath,
            });
            const renamedPath = response.data.path || trimmedPath;
            const originalPath = selectedPath;
            const wasDirectory = selectedEntry?.is_dir ?? false;

            toast.success(t('Renamed'));
            setSelectedPath(renamedPath);
            setExpanded(prev => {
                const next = new Set(prev);
                const parent = getParentPath(renamedPath);
                if (parent) {
                    next.add(parent);
                }
                if (wasDirectory) {
                    next.add(renamedPath);
                }
                return next;
            });
            await fetchFiles();

            if (wasDirectory) {
                if (selectedFile && (selectedFile === originalPath || selectedFile.startsWith(`${originalPath}/`))) {
                    onFileSelect(`${renamedPath}${selectedFile.slice(originalPath.length)}`);
                }
            } else {
                onFileSelect(renamedPath);
            }
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error || err.response?.data?.message : null;
            toast.error(message || t('Failed to rename'));
        }
    };

    const deleteSelected = async () => {
        if (!selectedPath) return;
        if (!window.confirm(t('Delete selected item?'))) return;

        try {
            const deletedPath = selectedPath;
            await axios.delete(`/api/blank-project/${projectId}/path`, { data: { path: deletedPath } });
            toast.success(t('Deleted'));
            setSelectedPath(null);
            if (selectedFile === deletedPath || selectedFile?.startsWith(`${deletedPath}/`)) {
                onFileSelect('');
            }
            await fetchFiles();
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error || err.response?.data?.message : null;
            toast.error(message || t('Failed to delete'));
        }
    };

    const projectFileFromDrop = (event: DragEvent<HTMLDivElement>) => {
        const allowedExtensions = ['html', 'htm', 'css', 'js', 'mjs', 'jsx', 'ts', 'tsx', 'php', 'json', 'svg'];

        return Array.from(event.dataTransfer.files).find((file) => {
            const extension = file.name.split('.').pop()?.toLowerCase();
            return extension ? allowedExtensions.includes(extension) : false;
        });
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        if (!Array.from(event.dataTransfer.types).includes('Files')) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
        setIsDraggingProjectFile(true);
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDraggingProjectFile(false);
        }
    };

    const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingProjectFile(false);

        const projectFile = projectFileFromDrop(event);
        if (!projectFile) {
            toast.error(t('Drop an HTML, React, TypeScript, CSS, JS, or PHP file'));
            return;
        }

        setIsUploadingProjectFile(true);
        try {
            const content = await projectFile.text();
            await axios.put(`/builder/projects/${projectId}/file`, {
                path: projectFile.name,
                content,
            });
            toast.success(t('File uploaded'));
            await fetchFiles();
            setSelectedPath(projectFile.name);
            onFileSelect(projectFile.name);
        } catch (err) {
            const message = axios.isAxiosError(err) ? err.response?.data?.error || err.response?.data?.message : null;
            toast.error(message || t('Failed to upload file'));
        } finally {
            setIsUploadingProjectFile(false);
        }
    };

    const tree = buildTree(files);

    return (
        <div
            className={`h-full bg-muted/30 flex flex-col transition-colors ${
                isDraggingProjectFile ? 'bg-primary/10 ring-2 ring-inset ring-primary/40' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="h-10 px-3 border-b flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t('Files')}</h2>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={createFile} title={t('New file')}>
                        <FilePlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={createFolder} title={t('New folder')}>
                        <FolderPlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={renameSelected} disabled={!selectedPath} title={t('Rename')}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={deleteSelected} disabled={!selectedPath} title={t('Delete')}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={fetchFiles}
                        disabled={loading || isUploadingProjectFile}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading || isUploadingProjectFile ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2">
                    {isDraggingProjectFile && (
                        <div className="mb-2 rounded-md border border-dashed border-primary/60 bg-primary/10 px-2 py-3 text-center text-xs font-medium text-primary">
                            {t('Drop project file to upload')}
                        </div>
                    )}
                    {error ? (
                        <p className="text-destructive text-sm text-center py-4">{error}</p>
                    ) : loading && files.length === 0 ? (
                        <div className="space-y-1">
                            {/* Skeleton file tree */}
                            <div className="flex items-center gap-2 py-1 px-2">
                                <Skeleton className="h-3.5 w-3.5" />
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                            <div className="flex items-center gap-2 py-1 px-2 ps-5">
                                <Skeleton className="h-3.5 w-3.5" />
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex items-center gap-2 py-1 px-2 ps-5">
                                <Skeleton className="h-3.5 w-3.5" />
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex items-center gap-2 py-1 px-2 ps-8">
                                <Skeleton className="h-3.5 w-3.5 opacity-0" />
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-28" />
                            </div>
                            <div className="flex items-center gap-2 py-1 px-2 ps-8">
                                <Skeleton className="h-3.5 w-3.5 opacity-0" />
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex items-center gap-2 py-1 px-2">
                                <Skeleton className="h-3.5 w-3.5 opacity-0" />
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                    ) : files.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">
                            {t('No files yet')}
                        </p>
                    ) : (
                        <TreeNode
                            node={tree}
                            depth={0}
                            expanded={expanded}
                            onToggle={toggleDir}
                            onSelect={selectNode}
                            selectedPath={selectedPath}
                        />
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function buildTree(files: FileEntry[]): TreeNodeData {
    const root: TreeNodeData = { name: '.', path: '.', isDir: true, children: [] };

    for (const file of files) {
        const parts = file.path.split('/');
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const path = parts.slice(0, i + 1).join('/');
            const isLast = i === parts.length - 1;

            let child = current.children.find(c => c.name === part);
            if (!child) {
                child = {
                    name: part,
                    path,
                    isDir: isLast ? file.is_dir : true,  // Use is_dir from API
                    children: [],
                };
                current.children.push(child);
            }
            current = child;
        }
    }

    // Sort: directories first, then alphabetically
    const sortChildren = (node: TreeNodeData) => {
        node.children.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
    };
    sortChildren(root);

    return root;
}

interface TreeNodeProps {
    node: TreeNodeData;
    depth: number;
    expanded: Set<string>;
    onToggle: (path: string) => void;
    onSelect: (path: string, isDir: boolean) => void;
    selectedPath: string | null;
}

function TreeNode({ node, depth, expanded, onToggle, onSelect, selectedPath }: TreeNodeProps) {
    if (node.name === '.') {
        return (
            <>
                {node.children.map(child => (
                    <TreeNode
                        key={child.path}
                        node={child}
                        depth={0}
                        expanded={expanded}
                        onToggle={onToggle}
                        onSelect={onSelect}
                        selectedPath={selectedPath}
                    />
                ))}
            </>
        );
    }

    const isExpanded = expanded.has(node.path);
    const isSelected = node.path === selectedPath;
    const indent = depth * 12;

    const getFileIcon = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'tsx':
            case 'ts':
                return <span className="text-blue-500">TS</span>;
            case 'jsx':
            case 'js':
                return <span className="text-yellow-500">JS</span>;
            case 'css':
                return <span className="text-purple-500">CSS</span>;
            case 'html':
                return <span className="text-orange-500">HTML</span>;
            case 'json':
                return <span className="text-green-500">{ }</span>;
            case 'md':
                return <span className="text-gray-500">MD</span>;
            default:
                return <FileText className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <div>
            <div
                onClick={() => {
                    onSelect(node.path, node.isDir);
                    if (node.isDir) {
                        onToggle(node.path);
                    }
                }}
                className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer text-sm
                    ${isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                style={{ paddingLeft: `${indent + 8}px` }}
            >
                {node.isDir ? (
                    <>
                        {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {isExpanded ? (
                            <FolderOpen className="h-4 w-4 text-primary" />
                        ) : (
                            <Folder className="h-4 w-4 text-primary" />
                        )}
                    </>
                ) : (
                    <>
                        <span className="w-3.5" />
                        <span className="w-4 h-4 text-xs font-mono flex items-center justify-center">
                            {getFileIcon(node.name)}
                        </span>
                    </>
                )}
                <span className="truncate">{node.name}</span>
            </div>

            {node.isDir && isExpanded && (
                <>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            expanded={expanded}
                            onToggle={onToggle}
                            onSelect={onSelect}
                            selectedPath={selectedPath}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
