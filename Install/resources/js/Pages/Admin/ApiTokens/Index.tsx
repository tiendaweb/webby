import { useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminPageHeader } from '@/components/Admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from '@/components/ui/table';
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Copy, KeyRound, Loader2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import type { PageProps } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';

interface AdminToken {
    id: number;
    name: string;
    owner: { id: number; name: string } | null;
    abilities: string[];
    last_used_at: string | null;
    expires_at: string | null;
    created_at: string;
}

interface ApiTokensPageProps extends PageProps {
    tokens: AdminToken[];
    abilities: string[];
    riskyAbilities?: string[];
}

/** Fallback only — the server is the source of truth (AdminApiTokenController::RISKY_ABILITIES). */
const DEFAULT_RISKY_ABILITIES = ['users:impersonate', 'database:execute'];

export default function ApiTokensIndex({ auth, tokens, abilities, riskyAbilities }: ApiTokensPageProps) {
    const RISKY_ABILITIES = riskyAbilities ?? DEFAULT_RISKY_ABILITIES;
    const { t } = useTranslation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [name, setName] = useState('');
    const [selectedAbilities, setSelectedAbilities] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [issuedToken, setIssuedToken] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<number | null>(null);

    const toggleAbility = (ability: string) => {
        setSelectedAbilities((prev) =>
            prev.includes(ability) ? prev.filter((a) => a !== ability) : [...prev, ability]
        );
    };

    const handleCreate = async () => {
        if (!name.trim() || selectedAbilities.length === 0) {
            toast.error(t('Give the token a name and select at least one ability.'));
            return;
        }
        setIsCreating(true);
        try {
            const response = await axios.post('/admin/api-tokens', {
                name: name.trim(),
                abilities: selectedAbilities,
            });
            setIssuedToken(response.data.token);
            router.reload({ only: ['tokens'] });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || t('Failed to create token'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevoke = async (tokenId: number) => {
        setRevokingId(tokenId);
        try {
            await axios.delete(`/admin/api-tokens/${tokenId}`);
            toast.success(t('Token revoked'));
            router.reload({ only: ['tokens'] });
        } catch {
            toast.error(t('Failed to revoke token'));
        } finally {
            setRevokingId(null);
        }
    };

    const closeDialog = (open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            setName('');
            setSelectedAbilities([]);
            setIssuedToken(null);
        }
    };

    return (
        <AdminLayout user={auth.user!} title={t('Admin API Tokens')}>
            <AdminPageHeader
                title={
                    <span className="flex items-center gap-2">
                        <KeyRound className="h-6 w-6" />
                        {t('Admin API Tokens')}
                    </span>
                }
                subtitle={t('Tokens that authenticate the admin MCP connector (/api/mcp/admin) for Claude, ChatGPT, or Grok.')}
                action={
                    <Dialog open={dialogOpen} onOpenChange={closeDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 me-2" />
                                {t('New Token')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{t('New Admin Token')}</DialogTitle>
                                <DialogDescription>
                                    {issuedToken
                                        ? t('Copy this token now — it will not be shown again.')
                                        : t('Grant only the abilities this token actually needs. None are selected by default.')}
                                </DialogDescription>
                            </DialogHeader>

                            {issuedToken ? (
                                <div className="space-y-2">
                                    <Label>{t('Token')}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value={issuedToken} readOnly className="font-mono text-sm" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(issuedToken);
                                                toast.success(t('Token copied to clipboard'));
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('Name')}</Label>
                                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('e.g. Claude Desktop')} maxLength={120} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Abilities')}</Label>
                                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                                            {abilities.map((ability) => (
                                                <label key={ability} className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <Checkbox
                                                        checked={selectedAbilities.includes(ability)}
                                                        onCheckedChange={() => toggleAbility(ability)}
                                                    />
                                                    <span className="font-mono">{ability}</span>
                                                    {RISKY_ABILITIES.includes(ability) && (
                                                        <TriangleAlert className="h-3 w-3 text-destructive" />
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            <TriangleAlert className="h-3 w-3 inline me-1 text-destructive" />
                                            {t('users:impersonate and database:execute carry the highest risk — only grant them if this token truly needs them.')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                {issuedToken ? (
                                    <Button onClick={() => closeDialog(false)}>{t('Done')}</Button>
                                ) : (
                                    <Button onClick={handleCreate} disabled={isCreating}>
                                        {isCreating && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                        {t('Create Token')}
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle>{t('Active Tokens')}</CardTitle>
                    <CardDescription>
                        {t('A token here is equivalent to an admin session for whatever abilities it holds. Never share it or paste it into a client-facing surface.')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Owner')}</TableHead>
                                <TableHead>{t('Abilities')}</TableHead>
                                <TableHead>{t('Last Used')}</TableHead>
                                <TableHead className="text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tokens.map((token) => (
                                <TableRow key={token.id}>
                                    <TableCell className="font-medium">{token.name}</TableCell>
                                    <TableCell>{token.owner?.name ?? '—'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {token.abilities.map((ability) => (
                                                <span
                                                    key={ability}
                                                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                                        RISKY_ABILITIES.includes(ability)
                                                            ? 'bg-destructive/10 text-destructive'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {ability}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : t('Never')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={revokingId === token.id}>
                                                    {revokingId === token.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    )}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('Revoke this token?')}</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {t('Any MCP client using it will immediately lose access.')}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={() => handleRevoke(token.id)}
                                                    >
                                                        {t('Revoke')}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tokens.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        {t('No admin tokens issued yet.')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
