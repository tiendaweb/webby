import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, X, User, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface UserOption {
    id: number;
    name: string;
    email: string;
}

interface UserSelectProps {
    value: string;
    onChange: (value: string) => void;
    error?: boolean;
    placeholder?: string;
    disabled?: boolean;
}

export function UserSelect({
    value,
    onChange,
    error,
    placeholder,
    disabled = false,
}: UserSelectProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState<UserOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Debounced search
    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (search.length < 2) {
            setUsers([]);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    route('admin.users.search') + `?search=${encodeURIComponent(search)}`
                );
                const data = await response.json();
                setUsers(data.users || []);
            } catch (err) {
                console.error('Failed to search users:', err);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [search]);

    // If value is set but we don't have selectedUser, try to fetch it
    useEffect(() => {
        if (value && !selectedUser) {
            // Try to find in current users list
            const found = users.find((u) => u.id.toString() === value);
            if (found) {
                setSelectedUser(found);
            }
        }
    }, [value, users, selectedUser]);

    const handleSelect = (user: UserOption) => {
        setSelectedUser(user);
        onChange(user.id.toString());
        setOpen(false);
        setSearch('');
    };

    const handleClear = () => {
        setSelectedUser(null);
        onChange('');
        setSearch('');
    };

    return (
        <div className="relative">
            {selectedUser ? (
                <div
                    className={cn(
                        'flex items-center justify-between border rounded-md px-3 py-2 bg-background',
                        error && 'border-destructive',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">{selectedUser.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                        </div>
                    </div>
                    {!disabled && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={handleClear}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">{t('Clear selection')}</span>
                        </Button>
                    )}
                </div>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={placeholder || t('Search for a user...')}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    if (!open) setOpen(true);
                                }}
                                onClick={() => setOpen(true)}
                                className={cn(
                                    'ps-9',
                                    error && 'border-destructive'
                                )}
                                disabled={disabled}
                            />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        <div className="max-h-[300px] overflow-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                                    <span className="text-sm text-muted-foreground">{t('Searching...')}</span>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    {search.length < 2
                                        ? t('Type at least 2 characters to search')
                                        : t('No users found')}
                                </div>
                            ) : (
                                <div className="py-1">
                                    {users.map((user) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            className="w-full px-3 py-2 text-start hover:bg-accent transition-colors"
                                            onClick={() => handleSelect(user)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
