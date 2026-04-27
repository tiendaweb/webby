import { useState, useRef, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { useForm } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { TanStackDataTable } from '@/components/Admin/TanStackDataTable';
import { useAdminLoading } from '@/hooks/useAdminLoading';
import { TableSkeleton, TableColumnConfig } from '@/components/Admin/skeletons';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    TableActionMenu,
    TableActionMenuTrigger,
    TableActionMenuContent,
    TableActionMenuItem,
    TableActionMenuSeparator,
} from '@/components/ui/table-action-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FileEdit,
    Trash2,
    Plus,
    Loader2,
    Search,
    Upload,
    File,
    X,
} from 'lucide-react';
import type { PageProps } from '@/types';

interface Plan {
    id: number;
    name: string;
}

interface Template {
    id: number;
    slug: string;
    name: string;
    description: string;
    category: string;
    version: string;
    thumbnail: string | null;
    is_system: boolean;
    zip_path: string | null;
    metadata: object | null;
    plans: Plan[];
    created_at: string;
    updated_at: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedTemplates {
    data: Template[];
    current_page: number;
    from: number;
    last_page: number;
    links: PaginationLink[];
    per_page: number;
    to: number;
    total: number;
}

interface TemplatesPageProps extends PageProps {
    templates: PaginatedTemplates;
    plans: Plan[];
}

// Skeleton column configuration for Templates table
const skeletonColumns: TableColumnConfig[] = [
    { type: 'text', width: 'w-64' },     // Template (name + description)
    { type: 'text', width: 'w-32' },     // Slug
    { type: 'text', width: 'w-32' },     // Plans
    { type: 'actions', width: 'w-12' },  // Actions
];

export default function Index() {
    const { templates, plans, auth } = usePage<TemplatesPageProps>().props;
    const { t } = useTranslation();
    const { isLoading } = useAdminLoading();
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [searchValue, setSearchValue] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

    // File upload refs and state
    const createZipInputRef = useRef<HTMLInputElement>(null);
    const editZipInputRef = useRef<HTMLInputElement>(null);
    const [createZipFileName, setCreateZipFileName] = useState<string | null>(null);
    const [editZipFileName, setEditZipFileName] = useState<string | null>(null);

    // Create form
    const { data: createData, setData: setCreateData, post: createPost, processing: createProcessing, errors: createErrors, reset: createReset } = useForm({
        name: '',
        description: '',
        zip_file: null as File | null,
        plan_ids: [] as number[],
    });

    // Edit form
    const { data: editData, setData: setEditData, post: editPost, processing: editProcessing, errors: editErrors } = useForm({
        name: '',
        description: '',
        zip_file: null as File | null,
        plan_ids: [] as number[],
        _method: 'PUT' as const,
    });

    const handleSearch = (value: string) => {
        setSearchValue(value);
        router.get(
            route('admin.ai-templates'),
            { search: value, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('admin.ai-templates'),
            { search: searchValue, page: page + 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePageSizeChange = (size: number) => {
        router.get(
            route('admin.ai-templates'),
            { search: searchValue, per_page: size, page: 1 },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleDeleteConfirm = () => {
        if (templateToDelete) {
            router.delete(route('admin.ai-templates.destroy', templateToDelete.id), {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setTemplateToDelete(null);
                    toast.success(t('Template deleted successfully'));
                },
                onError: () => toast.error(t('Failed to delete template')),
            });
        }
    };

    const openCreateModal = () => setCreateModalOpen(true);
    const closeCreateModal = () => {
        setCreateModalOpen(false);
        createReset();
        setCreateZipFileName(null);
    };

    const openEditModal = (template: Template) => {
        setEditingTemplate(template);
        setEditData({
            name: template.name,
            description: template.description,
            zip_file: null,
            plan_ids: template.plans.map(p => p.id),
            _method: 'PUT',
        });
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditingTemplate(null);
        setEditZipFileName(null);
    };

    // Set edit preview when editingTemplate changes
    useEffect(() => {
        if (editingTemplate) {
            setEditZipFileName(editingTemplate.zip_path ? t('Existing file') : null);
        } else {
            setEditZipFileName(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingTemplate?.id]);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createPost(route('admin.ai-templates.store'), {
            forceFormData: true,
            onSuccess: () => {
                closeCreateModal();
                toast.success(t('Template created successfully'));
            },
            onError: () => toast.error(t('Failed to create template')),
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate) return;
        editPost(route('admin.ai-templates.update', editingTemplate.id), {
            forceFormData: true,
            onSuccess: () => {
                closeEditModal();
                toast.success(t('Template updated successfully'));
            },
            onError: () => toast.error(t('Failed to update template')),
        });
    };

    const columns: ColumnDef<Template>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Template')} />
            ),
            cell: ({ row }) => (
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{row.original.name}</span>
                        {row.original.is_system && (
                            <Badge variant="secondary" className="text-xs">
                                {t('System')}
                            </Badge>
                        )}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                        {row.original.description}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'slug',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Slug')} />
            ),
            cell: ({ row }) => (
                <code className="text-sm text-muted-foreground">{row.original.slug}</code>
            ),
        },
        {
            accessorKey: 'plans',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Plans')} />
            ),
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.original.is_system ? (
                        <Badge variant="outline" className="text-xs">
                            {t('All Plans')}
                        </Badge>
                    ) : row.original.plans.length > 0 ? (
                        row.original.plans.map((plan) => (
                            <Badge key={plan.id} variant="secondary" className="text-xs">
                                {plan.name}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-sm text-muted-foreground">{t('None')}</span>
                    )}
                </div>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const template = row.original;
                return (
                    <TableActionMenu>
                        <TableActionMenuTrigger />
                        <TableActionMenuContent>
                            {!template.is_system && (
                                <>
                                    <TableActionMenuItem onClick={() => openEditModal(template)}>
                                        <FileEdit className="me-2 h-4 w-4" />
                                        {t('Edit')}
                                    </TableActionMenuItem>
                                    <TableActionMenuSeparator />
                                </>
                            )}
                            <TableActionMenuItem
                                variant="destructive"
                                disabled={template.is_system}
                                className={template.is_system ? 'opacity-50 cursor-not-allowed' : ''}
                                onClick={() => {
                                    if (!template.is_system) {
                                        setTemplateToDelete(template);
                                        setDeleteDialogOpen(true);
                                    }
                                }}
                            >
                                <Trash2 className="me-2 h-4 w-4" />
                                {t('Delete')}
                            </TableActionMenuItem>
                        </TableActionMenuContent>
                    </TableActionMenu>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <AdminLayout user={auth.user!} title={t('AI Templates')}>
                <AdminPageHeader
                    title={t('AI Templates')}
                    subtitle={t('Manage AI starter templates')}
                />
                <TableSkeleton columns={skeletonColumns} rows={10} showSearch filterCount={0} />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout user={auth.user!} title={t('AI Templates')}>
            <Head title={t('AI Templates')} />

            <AdminPageHeader
                title={t('AI Templates')}
                subtitle={t('Manage AI starter templates')}
                action={
                    <Button onClick={openCreateModal}>
                        <Plus className="h-4 w-4 me-2" />
                        {t('Add Template')}
                    </Button>
                }
            />

            <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center justify-between">
                    <div className="relative max-w-sm">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('Search templates...')}
                            value={searchValue}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="ps-9 w-[300px]"
                        />
                    </div>
                </div>

                {/* Table */}
                <TanStackDataTable
                    columns={columns}
                    data={templates.data}
                    showSearch={false}
                    serverPagination={{
                        pageCount: templates.last_page,
                        pageIndex: templates.current_page - 1,
                        pageSize: templates.per_page,
                        total: templates.total,
                        onPageChange: handlePageChange,
                        onPageSizeChange: handlePageSizeChange,
                    }}
                />
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Delete Template')}</DialogTitle>
                        <DialogDescription>
                            {templateToDelete?.is_system ? (
                                <span className="text-destructive font-medium">
                                    {t('System templates cannot be deleted.')}
                                </span>
                            ) : (
                                <>{t('Are you sure you want to delete ":name"? This action cannot be undone.', { name: templateToDelete?.name || '' })}</>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {!templateToDelete?.is_system && (
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteConfirm}>
                                {t('Delete Template')}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Add Template')}</DialogTitle>
                        <DialogDescription>
                            {t('Upload a new starter template for AI projects')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="create-name">{t('Template Name')} *</Label>
                            <Input
                                id="create-name"
                                value={createData.name}
                                onChange={(e) => setCreateData('name', e.target.value)}
                                placeholder={t('e.g. Landing Page, Dashboard, E-commerce')}
                                required
                            />
                            {createErrors.name && (
                                <p className="text-sm text-destructive">{createErrors.name}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="create-description">{t('Description')} *</Label>
                            <Textarea
                                id="create-description"
                                value={createData.description}
                                onChange={(e) => setCreateData('description', e.target.value)}
                                placeholder={t('Brief description of what this template includes')}
                                rows={2}
                                required
                            />
                            {createErrors.description && (
                                <p className="text-sm text-destructive">{createErrors.description}</p>
                            )}
                        </div>

                        {/* ZIP File */}
                        <div className="space-y-2">
                            <Label>{t('Template ZIP File')} *</Label>
                            <div className="flex items-center gap-3">
                                {createZipFileName ? (
                                    <>
                                        <File className="h-5 w-5 text-muted-foreground shrink-0" />
                                        <span className="text-sm flex-1 truncate">{createZipFileName}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => {
                                                setCreateZipFileName(null);
                                                setCreateData('zip_file', null);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <input
                                            ref={createZipInputRef}
                                            type="file"
                                            accept=".zip"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setCreateZipFileName(file.name);
                                                    setCreateData('zip_file', file);
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => createZipInputRef.current?.click()}
                                        >
                                            <Upload className="h-4 w-4 me-2" />
                                            {t('Choose ZIP File')}
                                        </Button>
                                        <span className="text-xs text-muted-foreground">{t('Max 10MB')}</span>
                                    </>
                                )}
                            </div>
                            {createErrors.zip_file && (
                                <p className="text-sm text-destructive">{createErrors.zip_file}</p>
                            )}
                        </div>

                        {/* Available to Plans */}
                        <div className="space-y-2">
                            <Label>{t('Available to Plans')}</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                                {plans.map((plan) => (
                                    <div key={plan.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`create-plan-${plan.id}`}
                                            checked={createData.plan_ids.includes(plan.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setCreateData('plan_ids', [...createData.plan_ids, plan.id]);
                                                } else {
                                                    setCreateData('plan_ids', createData.plan_ids.filter(id => id !== plan.id));
                                                }
                                            }}
                                        />
                                        <Label htmlFor={`create-plan-${plan.id}`} className="text-sm font-normal cursor-pointer">
                                            {plan.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('Select which plans can use this template. System templates are always available to all plans.')}
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeCreateModal}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={createProcessing}>
                                {createProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                        {t('Uploading...')}
                                    </>
                                ) : (
                                    t('Upload Template')
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Edit Template')}</DialogTitle>
                        <DialogDescription>
                            {t('Update template details and files')}
                        </DialogDescription>
                    </DialogHeader>
                    {editingTemplate && (
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">{t('Template Name')} *</Label>
                                <Input
                                    id="edit-name"
                                    value={editData.name}
                                    onChange={(e) => setEditData('name', e.target.value)}
                                    placeholder={t('e.g. Landing Page, Dashboard, E-commerce')}
                                    required
                                />
                                {editErrors.name && (
                                    <p className="text-sm text-destructive">{editErrors.name}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">{t('Description')} *</Label>
                                <Textarea
                                    id="edit-description"
                                    value={editData.description}
                                    onChange={(e) => setEditData('description', e.target.value)}
                                    placeholder={t('Brief description of what this template includes')}
                                    rows={2}
                                    required
                                />
                                {editErrors.description && (
                                    <p className="text-sm text-destructive">{editErrors.description}</p>
                                )}
                            </div>

                            {/* ZIP File */}
                            <div className="space-y-2">
                                <Label>{t('Template ZIP File')}</Label>
                                <div className="flex items-center gap-3">
                                    {editZipFileName ? (
                                        <>
                                            <File className="h-5 w-5 text-muted-foreground shrink-0" />
                                            <span className="text-sm flex-1 truncate">
                                                {editingTemplate.zip_path && !editData.zip_file ? t('Existing file') : editZipFileName}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => {
                                                    setEditZipFileName(null);
                                                    setEditData('zip_file', null);
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                ref={editZipInputRef}
                                                type="file"
                                                accept=".zip"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setEditZipFileName(file.name);
                                                        setEditData('zip_file', file);
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => editZipInputRef.current?.click()}
                                            >
                                                <Upload className="h-4 w-4 me-2" />
                                                {t('Choose ZIP File')}
                                            </Button>
                                            <span className="text-xs text-muted-foreground">{t('Leave empty to keep current')}</span>
                                        </>
                                    )}
                                </div>
                                {editErrors.zip_file && (
                                    <p className="text-sm text-destructive">{editErrors.zip_file}</p>
                                )}
                            </div>

                            {/* Available to Plans */}
                            <div className="space-y-2">
                                <Label>{t('Available to Plans')}</Label>
                                {editingTemplate?.is_system ? (
                                    <div className="border rounded-md p-3 bg-muted/50">
                                        <p className="text-sm text-muted-foreground">
                                            {t('System templates are automatically available to all plans.')}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                                            {plans.map((plan) => (
                                                <div key={plan.id} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`edit-plan-${plan.id}`}
                                                        checked={editData.plan_ids.includes(plan.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setEditData('plan_ids', [...editData.plan_ids, plan.id]);
                                                            } else {
                                                                setEditData('plan_ids', editData.plan_ids.filter(id => id !== plan.id));
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={`edit-plan-${plan.id}`} className="text-sm font-normal cursor-pointer">
                                                        {plan.name}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('Select which plans can use this template.')}
                                        </p>
                                    </>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeEditModal}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={editProcessing}>
                                    {editProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                            {t('Saving...')}
                                        </>
                                    ) : (
                                        t('Save Changes')
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
