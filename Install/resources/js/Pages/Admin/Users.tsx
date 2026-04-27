import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ColumnDef } from '@tanstack/react-table';
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
    DialogTrigger,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil, UserCircle, Eye } from 'lucide-react';
import { User, PageProps } from '@/types';
import { AdminUser, PaginationData } from '@/types/admin';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface UsersProps {
    user: User;
    users: {
        data: AdminUser[];
    };
    pagination: PaginationData;
}

// Skeleton column configuration for Users table
const skeletonColumns: TableColumnConfig[] = [
    { type: 'avatar-text', width: 'w-48' },   // User (name + email)
    { type: 'badge', width: 'w-16' },         // Role
    { type: 'status', width: 'w-32' },        // Status (switch + badge)
    { type: 'text', width: 'w-16' },          // Projects
    { type: 'text', width: 'w-24' },          // Joined
    { type: 'actions', width: 'w-12' },       // Actions
];

export default function Users({ user, users, pagination: _pagination }: UsersProps) {
    const { t, locale } = useTranslation();
    const { isDemo } = usePage<PageProps>().props;
    const { isLoading } = useAdminLoading();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user' as 'admin' | 'user',
        status: 'active' as 'active' | 'inactive',
    });

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'user',
            status: 'active',
        });
        setFormErrors({});
    };

    const validateForm = (isEdit: boolean) => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) {
            errors.name = t('Name is required');
        }
        if (!formData.email.trim()) {
            errors.email = t('Email is required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = t('Invalid email format');
        }
        if (!isEdit && !formData.password.trim()) {
            errors.password = t('Password is required');
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAdd = () => {
        if (!validateForm(false)) {
            return;
        }
        router.post(route('admin.users.store'), formData, {
            onSuccess: () => {
                setIsAddDialogOpen(false);
                resetForm();
                toast.success(t('User created successfully'));
            },
            onError: (errors) => {
                setFormErrors(errors as Record<string, string>);
                toast.error(Object.values(errors)[0] as string);
            },
        });
    };

    const handleEdit = () => {
        if (!selectedUser) return;

        if (!validateForm(true)) {
            return;
        }

        const updateData: Record<string, string> = {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            status: formData.status,
        };

        if (formData.password) {
            updateData.password = formData.password;
        }

        router.put(route('admin.users.update', selectedUser.id), updateData, {
            onSuccess: () => {
                setIsEditDialogOpen(false);
                setSelectedUser(null);
                resetForm();
                toast.success(t('User updated successfully'));
            },
            onError: (errors) => {
                setFormErrors(errors as Record<string, string>);
                toast.error(Object.values(errors)[0] as string);
            },
        });
    };

    const handleDelete = (adminUser: AdminUser) => {
        if (adminUser.id === user.id) {
            toast.error(t('You cannot delete your own account'));
            return;
        }
        setUserToDelete(adminUser);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!userToDelete) return;
        router.delete(route('admin.users.destroy', userToDelete.id), {
            onSuccess: () => {
                toast.success(t('User deleted'));
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
            },
            onError: () => toast.error(t('Failed to delete user')),
        });
    };

    const handleImpersonate = (adminUser: AdminUser) => {
        router.post(route('admin.users.impersonate', adminUser.id));
    };

    const handleToggleStatus = (adminUser: AdminUser) => {
        router.put(route('admin.users.update', adminUser.id), {
            status: adminUser.status === 'active' ? 'inactive' : 'active',
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Status updated')),
        });
    };

    const openEditDialog = (adminUser: AdminUser) => {
        setSelectedUser(adminUser);
        setFormData({
            name: adminUser.name,
            email: adminUser.email,
            password: '',
            role: adminUser.role,
            status: adminUser.status,
        });
        setIsEditDialogOpen(true);
    };

    const columns: ColumnDef<AdminUser>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('User')} />
            ),
            cell: ({ row }) => {
                const adminUser = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="font-medium">{adminUser.name}</p>
                            <p className="text-sm text-muted-foreground">{adminUser.email}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'role',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Role')} />
            ),
            cell: ({ row }) => {
                const role = row.original.role;
                return (
                    <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                        {role === 'admin' ? t('Admin') : t('User')}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Status')} />
            ),
            cell: ({ row }) => {
                const adminUser = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={adminUser.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(adminUser)}
                            disabled={adminUser.id === user.id}
                        />
                        <Badge variant={adminUser.status === 'active' ? 'default' : 'secondary'}>
                            {adminUser.status === 'active' ? t('Active') : t('Inactive')}
                        </Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: 'projects_count',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Projects')} />
            ),
            cell: ({ row }) => row.original.projects_count,
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Joined')} />
            ),
            cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(locale),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const adminUser = row.original;
                return (
                    <TableActionMenu>
                        <TableActionMenuTrigger />
                        <TableActionMenuContent align="end">
                            <TableActionMenuLabel>{t('Actions')}</TableActionMenuLabel>
                            {!isDemo && adminUser.role !== 'admin' && adminUser.id !== user.id && (
                                <TableActionMenuItem onClick={() => handleImpersonate(adminUser)}>
                                    <Eye className="me-2 h-4 w-4" />
                                    {t('Impersonate')}
                                </TableActionMenuItem>
                            )}
                            <TableActionMenuItem onClick={() => openEditDialog(adminUser)}>
                                <Pencil className="me-2 h-4 w-4" />
                                {t('Edit')}
                            </TableActionMenuItem>
                            {adminUser.id !== user.id && (
                                <>
                                    <TableActionMenuSeparator />
                                    <TableActionMenuItem
                                        variant="destructive"
                                        onClick={() => handleDelete(adminUser)}
                                    >
                                        <Trash2 className="me-2 h-4 w-4" />
                                        {t('Delete')}
                                    </TableActionMenuItem>
                                </>
                            )}
                        </TableActionMenuContent>
                    </TableActionMenu>
                );
            },
        },
    ];

    return (
        <AdminLayout user={user} title={t('Users')}>
            <AdminPageHeader
                title={t('Users')}
                subtitle={t('Manage all registered users')}
                action={
                    <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                        setIsAddDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 me-2" />
                                {t('Create User')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('Create User')}</DialogTitle>
                                <DialogDescription>
                                    {t('Add a new user to the system')}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('Name')}</Label>
                                    <Input
                                        id="name"
                                        placeholder={t('John Doe')}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className={formErrors.name ? 'border-destructive' : ''}
                                    />
                                    {formErrors.name && (
                                        <p className="text-sm text-destructive">{formErrors.name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('Email')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className={formErrors.email ? 'border-destructive' : ''}
                                    />
                                    {formErrors.email && (
                                        <p className="text-sm text-destructive">{formErrors.email}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">{t('Password')}</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="********"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className={formErrors.password ? 'border-destructive' : ''}
                                    />
                                    {formErrors.password && (
                                        <p className="text-sm text-destructive">{formErrors.password}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="role">{t('Role')}</Label>
                                        <Select
                                            value={formData.role}
                                            onValueChange={(value: 'admin' | 'user') =>
                                                setFormData({ ...formData, role: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select role')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">{t('User')}</SelectItem>
                                                <SelectItem value="admin">{t('Admin')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status">{t('Status')}</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value: 'active' | 'inactive') =>
                                                setFormData({ ...formData, status: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select status')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">{t('Active')}</SelectItem>
                                                <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button onClick={handleAdd}>{t('Create User')}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            {isLoading ? (
                <TableSkeleton
                    columns={skeletonColumns}
                    rows={10}
                    showSearch
                />
            ) : (
                <DataTable
                    columns={columns}
                    data={users.data}
                    searchKey="name"
                    searchPlaceholder={t('Search users...')}
                />
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Edit User')}</DialogTitle>
                        <DialogDescription>
                            {t('Update user information')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">{t('Name')}</Label>
                            <Input
                                id="edit-name"
                                placeholder={t('John Doe')}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={formErrors.name ? 'border-destructive' : ''}
                            />
                            {formErrors.name && (
                                <p className="text-sm text-destructive">{formErrors.name}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">{t('Email')}</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={formErrors.email ? 'border-destructive' : ''}
                            />
                            {formErrors.email && (
                                <p className="text-sm text-destructive">{formErrors.email}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">{t('New Password (leave blank to keep current)')}</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                placeholder="********"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-role">{t('Role')}</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: 'admin' | 'user') =>
                                        setFormData({ ...formData, role: value })
                                    }
                                    disabled={selectedUser?.id === user.id}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">{t('User')}</SelectItem>
                                        <SelectItem value="admin">{t('Admin')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">{t('Status')}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: 'active' | 'inactive') =>
                                        setFormData({ ...formData, status: value })
                                    }
                                    disabled={selectedUser?.id === user.id}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleEdit}>{t('Save Changes')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) setUserToDelete(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Are you sure you want to delete this user?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('This action cannot be undone. This will permanently delete the user account and all associated data.')}
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
