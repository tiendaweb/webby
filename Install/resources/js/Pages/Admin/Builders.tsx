import { useState, useEffect, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
import axios from 'axios';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { TableSkeleton, type TableColumnConfig } from '@/components/Admin/skeletons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    TableActionMenu,
    TableActionMenuTrigger,
    TableActionMenuContent,
    TableActionMenuItem,
    TableActionMenuLabel,
    TableActionMenuSeparator,
} from '@/components/ui/table-action-menu';
import { Plus, Server, Trash2, Pencil, Copy, Loader2, RefreshCw } from 'lucide-react';
import { User } from '@/types';
import { Builder, BuilderDetails } from '@/types/admin';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

// Generate UUID that works in all contexts (including non-HTTPS)
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for non-secure contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// Copy to clipboard that works in all contexts (including non-HTTPS)
async function copyText(text: string): Promise<boolean> {
    // Try modern clipboard API first
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall through to fallback
        }
    }

    // Fallback using execCommand
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    } catch {
        return false;
    }
}

function BuilderDetailsCell({ builder }: { builder: Builder }) {
    const { t } = useTranslation();
    const [details, setDetails] = useState<BuilderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(route('admin.ai-builders.details', builder.id))
            .then(res => setDetails(res.data))
            .catch(() => setDetails({ version: '-', sessions: 0, online: false }))
            .finally(() => setLoading(false));
    }, [builder.id]);

    if (loading) {
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }

    if (!details?.online) {
        return (
            <div className="text-sm space-y-1">
                <Badge variant="destructive">{t('Offline')}</Badge>
                <div className="text-muted-foreground">{builder.projects_count ?? 0} {t('projects')}</div>
            </div>
        );
    }

    return (
        <div className="text-sm space-y-1">
            <div className="font-medium">v{details.version}</div>
            <div className="text-muted-foreground">{details.sessions} {t('sessions')}</div>
            <div className="text-muted-foreground">{builder.projects_count ?? 0} {t('projects')}</div>
        </div>
    );
}

interface BuildersProps {
    user: User;
    builders: Builder[];
}

// Skeleton column configuration for Builders table
const skeletonColumns: TableColumnConfig[] = [
    { type: 'text', width: 'w-32' },          // Name
    { type: 'text', width: 'w-48' },          // Endpoint
    { type: 'status', width: 'w-24' },        // Status
    { type: 'text', width: 'w-20' },          // Provider
    { type: 'text', width: 'w-24' },          // Created
    { type: 'actions', width: 'w-12' },       // Actions
];

export default function Builders({ user, builders }: BuildersProps) {
    const { t } = useTranslation();
    const { isLoading } = useAdminLoading();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedBuilder, setSelectedBuilder] = useState<Builder | null>(null);
    const [builderToDelete, setBuilderToDelete] = useState<Builder | null>(null);

    const [addFormData, setAddFormData] = useState({
        name: '',
        url: 'http://localhost',
        port: 8080,
        server_key: '',
        max_iterations: 20,
    });

    const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});

    const [editFormData, setEditFormData] = useState({
        name: '',
        url: 'http://localhost',
        port: 8080,
        server_key: '',
        max_iterations: 20,
    });

    const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

    const validateAddForm = useCallback(() => {
        const errors: Record<string, string> = {};
        if (!addFormData.name.trim()) {
            errors.name = t('Name is required');
        }
        if (!addFormData.url.trim()) {
            errors.url = t('URL is required');
        }
        if (!addFormData.port || addFormData.port < 1 || addFormData.port > 65535) {
            errors.port = t('Port must be between 1 and 65535');
        }
        if (!addFormData.server_key.trim()) {
            errors.server_key = t('Server key is required');
        }
        setAddFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [addFormData, t]);

    const handleAdd = useCallback(() => {
        if (!validateAddForm()) {
            return;
        }

        router.post(route('admin.ai-builders.store'), addFormData, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsAddDialogOpen(false);
                setAddFormData({
                    name: '',
                    url: 'http://localhost',
                    port: 8080,
                    server_key: '',
                    max_iterations: 20,
                });
                setAddFormErrors({});
                toast.success(t('Builder added successfully'));
            },
            onError: (errors) => {
                setAddFormErrors(errors as Record<string, string>);
                toast.error(Object.values(errors)[0] as string);
            },
        });
    }, [addFormData, validateAddForm, t]);

    const validateEditForm = useCallback(() => {
        const errors: Record<string, string> = {};
        if (!editFormData.name.trim()) {
            errors.name = t('Name is required');
        }
        if (!editFormData.url.trim()) {
            errors.url = t('URL is required');
        }
        if (!editFormData.port || editFormData.port < 1 || editFormData.port > 65535) {
            errors.port = t('Port must be between 1 and 65535');
        }
        setEditFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [editFormData, t]);

    const handleEdit = useCallback(() => {
        if (!selectedBuilder) return;

        if (!validateEditForm()) {
            return;
        }

        // Only send server_key if it was changed (not empty)
        const dataToSend = editFormData.server_key
            ? editFormData
            : { name: editFormData.name, url: editFormData.url, port: editFormData.port, max_iterations: editFormData.max_iterations };

        router.put(route('admin.ai-builders.update', selectedBuilder.id), dataToSend, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsEditDialogOpen(false);
                setSelectedBuilder(null);
                setEditFormErrors({});
                toast.success(t('Builder updated successfully'));
            },
            onError: (errors) => {
                setEditFormErrors(errors as Record<string, string>);
                toast.error(Object.values(errors)[0] as string);
            },
        });
    }, [selectedBuilder, editFormData, validateEditForm, t]);

    const handleDelete = useCallback((builder: Builder) => {
        setBuilderToDelete(builder);
        setIsDeleteDialogOpen(true);
    }, []);

    const confirmDelete = useCallback(() => {
        if (!builderToDelete) return;
        router.delete(route('admin.ai-builders.destroy', builderToDelete.id), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Builder deleted'));
                setIsDeleteDialogOpen(false);
                setBuilderToDelete(null);
            },
            onError: () => toast.error(t('Failed to delete builder')),
        });
    }, [builderToDelete, t]);

    const handleToggleStatus = useCallback((builder: Builder) => {
        router.put(route('admin.ai-builders.update', builder.id), {
            status: builder.status === 'active' ? 'inactive' : 'active',
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => toast.success(t('Status updated')),
        });
    }, [t]);

    const openEditDialog = useCallback((builder: Builder) => {
        setSelectedBuilder(builder);
        setEditFormData({
            name: builder.name,
            url: builder.url,
            port: builder.port,
            server_key: '', // Empty - user must generate new one or leave blank to keep existing
            max_iterations: builder.max_iterations,
        });
        setIsEditDialogOpen(true);
    }, []);

    const generateAddServerKey = useCallback(() => {
        const key = 'sk-' + generateUUID();
        setAddFormData(prev => ({ ...prev, server_key: key }));
        toast.success(t('Server key generated'));
    }, [t]);

    const generateEditServerKey = useCallback(() => {
        const key = 'sk-' + generateUUID();
        setEditFormData(prev => ({ ...prev, server_key: key }));
        toast.success(t('Server key generated'));
    }, [t]);

    const copyServerKey = useCallback(async (builder: Builder) => {
        const success = await copyText(builder.server_key);
        if (success) {
            toast.success(t('Server key copied to clipboard'));
        } else {
            toast.error(t('Failed to copy server key'));
        }
    }, [t]);

    const columns: ColumnDef<Builder>[] = useMemo(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Name')} />
            ),
            cell: ({ row }) => {
                const builder = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{builder.name}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'url',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('URL')} />
            ),
            cell: ({ row }) => {
                const builder = row.original;
                return (
                    <span className="font-mono text-sm">
                        {builder.url}:{builder.port}
                    </span>
                );
            },
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Status')} />
            ),
            cell: function StatusCell({ row }) {
                const builder = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={builder.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(builder)}
                        />
                        <Badge variant={builder.status === 'active' ? 'default' : 'secondary'}>
                            {builder.status === 'active' ? t('active') : t('inactive')}
                        </Badge>
                    </div>
                );
            },
        },
        {
            id: 'details',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Details')} />
            ),
            cell: ({ row }) => <BuilderDetailsCell builder={row.original} />,
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: function ActionsCell({ row }) {
                const builder = row.original;
                return (
                    <TableActionMenu>
                        <TableActionMenuTrigger />
                        <TableActionMenuContent>
                            <TableActionMenuLabel>{t('Actions')}</TableActionMenuLabel>
                            <TableActionMenuItem onClick={() => copyServerKey(builder)}>
                                <Copy className="me-2 h-4 w-4" />
                                {t('Copy Key')}
                            </TableActionMenuItem>
                            <TableActionMenuItem onClick={() => openEditDialog(builder)}>
                                <Pencil className="me-2 h-4 w-4" />
                                {t('Edit')}
                            </TableActionMenuItem>
                            <TableActionMenuSeparator />
                            <TableActionMenuItem
                                variant="destructive"
                                onClick={() => handleDelete(builder)}
                            >
                                <Trash2 className="me-2 h-4 w-4" />
                                {t('Delete')}
                            </TableActionMenuItem>
                        </TableActionMenuContent>
                    </TableActionMenu>
                );
            },
        },
    ], [t, handleToggleStatus, openEditDialog, handleDelete, copyServerKey]);

    return (
        <AdminLayout user={user} title={t('AI Builders')}>
            <AdminPageHeader
                title={t('AI Builders')}
                subtitle={t('Manage AI builder server instances')}
                action={
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 me-2" />
                        {t('Add AI Builder')}
                    </Button>
                }
            />

            {isLoading ? (
                <TableSkeleton
                    columns={skeletonColumns}
                    rows={5}
                    showSearch
                />
            ) : (
                <DataTable
                    columns={columns}
                    data={builders}
                    searchKey="name"
                    searchPlaceholder={t('Search builders...')}
                />
            )}

            {/* Add Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) setAddFormErrors({});
            }}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{t('Add AI Builder')}</DialogTitle>
                        <DialogDescription>
                            {t('Add a new AI builder instance to the pool')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="add-name">{t('Name')}</Label>
                            <Input
                                id="add-name"
                                placeholder={t('Primary Builder')}
                                value={addFormData.name}
                                onChange={(e) => setAddFormData(prev => ({ ...prev, name: e.target.value }))}
                                className={addFormErrors.name ? 'border-destructive' : ''}
                            />
                            {addFormErrors.name && (
                                <p className="text-sm text-destructive">{addFormErrors.name}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="add-url">{t('URL')}</Label>
                                <Input
                                    id="add-url"
                                    placeholder="http://localhost"
                                    value={addFormData.url}
                                    onChange={(e) => setAddFormData(prev => ({ ...prev, url: e.target.value }))}
                                    className={addFormErrors.url ? 'border-destructive' : ''}
                                />
                                {addFormErrors.url && (
                                    <p className="text-sm text-destructive">{addFormErrors.url}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="add-port">{t('Port')}</Label>
                                <Input
                                    id="add-port"
                                    type="number"
                                    placeholder="8080"
                                    value={addFormData.port}
                                    onChange={(e) => setAddFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 8080 }))}
                                    className={addFormErrors.port ? 'border-destructive' : ''}
                                />
                                {addFormErrors.port && (
                                    <p className="text-sm text-destructive">{addFormErrors.port}</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="add-server_key">{t('Server Key')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="add-server_key"
                                    placeholder={t('Enter server key')}
                                    value={addFormData.server_key}
                                    onChange={(e) => setAddFormData(prev => ({ ...prev, server_key: e.target.value }))}
                                    className={addFormErrors.server_key ? 'border-destructive' : ''}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={generateAddServerKey}
                                >
                                    <RefreshCw className="h-4 w-4 me-2" />
                                    {t('Generate')}
                                </Button>
                            </div>
                            {addFormErrors.server_key && (
                                <p className="text-sm text-destructive">{addFormErrors.server_key}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="add-max_iterations">{t('Max Iterations')}</Label>
                            <Input
                                id="add-max_iterations"
                                type="number"
                                min={5}
                                max={100}
                                value={addFormData.max_iterations}
                                onChange={(e) => setAddFormData(prev => ({ ...prev, max_iterations: parseInt(e.target.value) || 20 }))}
                                className={addFormErrors.max_iterations ? 'border-destructive' : ''}
                            />
                            <p className="text-xs text-muted-foreground">{t('Range: 5-100. Default: 20')}</p>
                            {addFormErrors.max_iterations && (
                                <p className="text-sm text-destructive">{addFormErrors.max_iterations}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={handleAdd}>{t('Add AI Builder')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) setEditFormErrors({});
            }}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{t('Edit AI Builder')}</DialogTitle>
                        <DialogDescription>
                            {t('Update AI builder configuration')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">{t('Name')}</Label>
                            <Input
                                id="edit-name"
                                placeholder={t('Primary Builder')}
                                value={editFormData.name}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                className={editFormErrors.name ? 'border-destructive' : ''}
                            />
                            {editFormErrors.name && (
                                <p className="text-sm text-destructive">{editFormErrors.name}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-url">{t('URL')}</Label>
                                <Input
                                    id="edit-url"
                                    placeholder="http://localhost"
                                    value={editFormData.url}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                                    className={editFormErrors.url ? 'border-destructive' : ''}
                                />
                                {editFormErrors.url && (
                                    <p className="text-sm text-destructive">{editFormErrors.url}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-port">{t('Port')}</Label>
                                <Input
                                    id="edit-port"
                                    type="number"
                                    placeholder="8080"
                                    value={editFormData.port}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 8080 }))}
                                    className={editFormErrors.port ? 'border-destructive' : ''}
                                />
                                {editFormErrors.port && (
                                    <p className="text-sm text-destructive">{editFormErrors.port}</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-server_key">{t('Server Key')}</Label>
                            <p className="text-sm text-muted-foreground">{t('Leave empty to keep existing key, or generate a new one')}</p>
                            <div className="flex gap-2">
                                <Input
                                    id="edit-server_key"
                                    placeholder={t('Generate new key or leave empty')}
                                    value={editFormData.server_key}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, server_key: e.target.value }))}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={generateEditServerKey}
                                >
                                    <RefreshCw className="h-4 w-4 me-2" />
                                    {t('Generate')}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-max_iterations">{t('Max Iterations')}</Label>
                            <Input
                                id="edit-max_iterations"
                                type="number"
                                min={5}
                                max={100}
                                value={editFormData.max_iterations}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, max_iterations: parseInt(e.target.value) || 20 }))}
                                className={editFormErrors.max_iterations ? 'border-destructive' : ''}
                            />
                            <p className="text-xs text-muted-foreground">{t('Range: 5-100. Default: 20')}</p>
                            {editFormErrors.max_iterations && (
                                <p className="text-sm text-destructive">{editFormErrors.max_iterations}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={handleEdit}>{t('Save Changes')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) setBuilderToDelete(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Are you sure you want to delete this builder?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('This action cannot be undone. This will permanently delete the builder configuration.')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className={buttonVariants({ variant: 'destructive' })}
                        >
                            {t('Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
