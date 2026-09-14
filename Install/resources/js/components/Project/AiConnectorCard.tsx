import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Bot, Check, Clock, Copy, Loader2, Plug, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';

interface AiConnectorModuleInfo {
    id: number;
    name: string;
    description: string | null;
    pricing_type: 'one_time' | 'monthly' | 'yearly';
    price: number;
}

interface AiConnectorActivationInfo {
    id: number;
    status: 'active' | 'pending' | 'expired' | 'cancelled';
    is_active: boolean;
    payment_method: string | null;
    renewal_at: string | null;
    requires_approval: boolean;
    instructions: string | null;
    reference: string | null;
}

interface AiConnectorTokenInfo {
    id: number;
    name: string;
    last_four: string;
    last_used_at: string | null;
    expires_at: string | null;
}

export interface AiConnectorSettings {
    module: AiConnectorModuleInfo | null;
    activation: AiConnectorActivationInfo | null;
    tokens: AiConnectorTokenInfo[];
    mcpEndpoint: string | null;
}

interface AiConnectorCardProps {
    projectId: string;
    aiConnector: AiConnectorSettings;
}

function pricingLabel(module: AiConnectorModuleInfo, t: (s: string, r?: Record<string, string | number>) => string): string {
    const price = `$${module.price.toFixed(2)}`;
    switch (module.pricing_type) {
        case 'monthly':
            return t(':price / month', { price });
        case 'yearly':
            return t(':price / year', { price });
        default:
            return t(':price one-time', { price });
    }
}

export function AiConnectorCard({ projectId, aiConnector }: AiConnectorCardProps) {
    const { t } = useTranslation();
    const { module, activation, tokens, mcpEndpoint } = aiConnector;

    const [isActivating, setIsActivating] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [isCreatingToken, setIsCreatingToken] = useState(false);
    const [revokingTokenId, setRevokingTokenId] = useState<number | null>(null);
    const [newTokenName, setNewTokenName] = useState('');
    const [issuedToken, setIssuedToken] = useState<string | null>(null);
    const [issuedConnectionUrl, setIssuedConnectionUrl] = useState<string | null>(null);
    const [bankInstructions, setBankInstructions] = useState<{ instructions: string; reference: string; amount: number } | null>(null);
    const [tokenDialogOpen, setTokenDialogOpen] = useState(false);

    if (!module) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plug className="h-5 w-5" />
                        {t('AI Connector')}
                    </CardTitle>
                    <CardDescription>
                        {t('The AI Connector module is not currently available on this platform.')}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const handleActivate = async () => {
        setIsActivating(true);
        try {
            const response = await axios.post(`/project/${projectId}/ai-connector/activate`, {
                payment_method: 'bank_transfer',
            });
            const bt = response.data?.bankTransfer;
            if (bt) {
                setBankInstructions({ instructions: bt.instructions, reference: bt.reference, amount: bt.amount });
            }
            toast.success(t('Activation request created. Awaiting payment confirmation.'));
            router.reload({ only: ['aiConnector'] });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || t('Failed to activate the AI Connector'));
        } finally {
            setIsActivating(false);
        }
    };

    const handleDeactivate = async () => {
        setIsDeactivating(true);
        try {
            await axios.post(`/project/${projectId}/ai-connector/deactivate`);
            toast.success(t('AI Connector deactivated'));
            router.reload({ only: ['aiConnector'] });
        } catch {
            toast.error(t('Failed to deactivate the AI Connector'));
        } finally {
            setIsDeactivating(false);
        }
    };

    const handleCreateToken = async () => {
        if (!newTokenName.trim()) {
            toast.error(t('Give this token a name (e.g. "Claude Desktop")'));
            return;
        }
        setIsCreatingToken(true);
        try {
            const response = await axios.post(`/project/${projectId}/ai-connector/tokens`, {
                name: newTokenName.trim(),
            });
            setIssuedToken(response.data.token);
            setIssuedConnectionUrl(response.data.connection_url ?? null);
            setNewTokenName('');
            router.reload({ only: ['aiConnector'] });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || t('Failed to create token'));
        } finally {
            setIsCreatingToken(false);
        }
    };

    const handleRevokeToken = async (tokenId: number) => {
        setRevokingTokenId(tokenId);
        try {
            await axios.delete(`/project/${projectId}/ai-connector/tokens/${tokenId}`);
            toast.success(t('Token revoked'));
            router.reload({ only: ['aiConnector'] });
        } catch {
            toast.error(t('Failed to revoke token'));
        } finally {
            setRevokingTokenId(null);
        }
    };

    const statusBadge = () => {
        if (!activation) return null;
        if (activation.is_active) {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-success/10 text-success">
                    <Check className="h-3 w-3 me-1" />
                    {t('Active')}
                </span>
            );
        }
        if (activation.status === 'pending') {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-500/10 text-amber-600">
                    <Clock className="h-3 w-3 me-1" />
                    {t('Awaiting approval')}
                </span>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-5 w-5" />
                                {module.name}
                            </CardTitle>
                            <CardDescription>
                                {module.description || t('Give Claude, ChatGPT, or Grok full read/write access to this project via a dedicated MCP server, scoped to only this project.')}
                            </CardDescription>
                        </div>
                        {statusBadge()}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!activation || activation.status === 'cancelled' || activation.status === 'expired' ? (
                        <>
                            <div className="rounded-lg border p-4 bg-muted/30">
                                <p className="text-sm font-medium">{pricingLabel(module, t)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('Paid via bank transfer for now — a payment request is created and an admin confirms it once payment is received.')}
                                </p>
                            </div>
                            <Button onClick={handleActivate} disabled={isActivating}>
                                {isActivating && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                {t('Activate AI Connector')}
                            </Button>
                        </>
                    ) : activation.requires_approval ? (
                        <div className="rounded-lg border p-4 bg-amber-500/5 space-y-2">
                            <p className="text-sm">
                                {t('Your bank transfer request is awaiting admin confirmation.')}
                            </p>
                            {activation.reference && (
                                <p className="text-xs text-muted-foreground">
                                    {t('Reference:')} <span className="font-mono">{activation.reference}</span>
                                </p>
                            )}
                            {activation.instructions && (
                                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded">
                                    {activation.instructions}
                                </pre>
                            )}
                        </div>
                    ) : (
                        <>
                            {mcpEndpoint && (
                                <div className="space-y-2">
                                    <Label>{t('MCP Endpoint')}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value={mcpEndpoint} readOnly className="font-mono text-sm" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(mcpEndpoint);
                                                toast.success(t('Copied to clipboard'));
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('Add this URL as a remote MCP server in Claude, ChatGPT, or Grok, together with a connector token below.')}
                                    </p>
                                </div>
                            )}

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={isDeactivating}>
                                        {isDeactivating && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                        {t('Deactivate')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('Deactivate AI Connector?')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('This immediately revokes every connector token for this project. Any AI assistant using them will lose access.')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={handleDeactivate}
                                        >
                                            {t('Deactivate')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </CardContent>
            </Card>

            {activation?.is_active && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">{t('Connector Tokens')}</CardTitle>
                                <CardDescription>
                                    {t('Each token gives full read/write access to this project only. Create one per AI client.')}
                                </CardDescription>
                            </div>
                            <Button size="sm" onClick={() => setTokenDialogOpen(true)}>
                                <Plus className="h-4 w-4 me-1" />
                                {t('New Token')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {tokens.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                {t('No tokens yet. Create one to connect Claude, ChatGPT, or Grok.')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {tokens.map((token) => (
                                    <div key={token.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <p className="text-sm font-medium">{token.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                •••• {token.last_four}
                                                {token.last_used_at && (
                                                    <span className="ms-2">
                                                        {t('last used :date', { date: new Date(token.last_used_at).toLocaleDateString() })}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={revokingTokenId === token.id}
                                            onClick={() => handleRevokeToken(token.id)}
                                        >
                                            {revokingTokenId === token.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Bank transfer instructions after activation */}
            <Dialog open={!!bankInstructions} onOpenChange={(open) => !open && setBankInstructions(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Complete your bank transfer')}</DialogTitle>
                        <DialogDescription>
                            {t('Send the payment using the reference below. An admin will confirm it shortly after.')}
                        </DialogDescription>
                    </DialogHeader>
                    {bankInstructions && (
                        <div className="space-y-3">
                            <p className="text-sm">
                                {t('Amount:')} <span className="font-semibold">${bankInstructions.amount.toFixed(2)}</span>
                            </p>
                            <p className="text-sm">
                                {t('Reference:')} <span className="font-mono">{bankInstructions.reference}</span>
                            </p>
                            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded">
                                {bankInstructions.instructions}
                            </pre>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setBankInstructions(null)}>{t('Got it')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New token dialog */}
            <Dialog open={tokenDialogOpen} onOpenChange={(open) => { setTokenDialogOpen(open); if (!open) { setIssuedToken(null); setIssuedConnectionUrl(null); setNewTokenName(''); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('New Connector Token')}</DialogTitle>
                        <DialogDescription>
                            {issuedToken
                                ? t('Copy this token now — it will not be shown again.')
                                : t('Give it a name so you can recognize it later (e.g. "Claude Desktop").')}
                        </DialogDescription>
                    </DialogHeader>

                    {issuedToken ? (
                        <div className="space-y-4">
                            {issuedConnectionUrl && (
                                <div className="space-y-2">
                                    <Label>{t('Connection URL — paste this into Claude, ChatGPT or Grok')}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value={issuedConnectionUrl} readOnly className="font-mono text-xs" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(issuedConnectionUrl);
                                                toast.success(t('Copied to clipboard'));
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <ul className="ms-4 list-disc space-y-1 text-xs text-muted-foreground">
                                        <li>{t('Claude: Settings → Connectors → Add custom connector → paste this URL, no authentication.')}</li>
                                        <li>{t('ChatGPT: Settings → Connectors (developer mode) → add an MCP server → paste this URL.')}</li>
                                        <li>{t('Grok: Settings → Connectors → Add → paste this URL.')}</li>
                                    </ul>
                                </div>
                            )}
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
                                <p className="text-xs text-muted-foreground">
                                    {t('For clients that send a header instead (Claude Code, Claude Desktop, your own code): use the MCP endpoint above with "Authorization: Bearer <token>".')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="token-name">{t('Name')}</Label>
                            <Input
                                id="token-name"
                                value={newTokenName}
                                onChange={(e) => setNewTokenName(e.target.value)}
                                placeholder={t('e.g. Claude Desktop')}
                                maxLength={120}
                            />
                        </div>
                    )}

                    <DialogFooter>
                        {issuedToken ? (
                            <Button onClick={() => setTokenDialogOpen(false)}>{t('Done')}</Button>
                        ) : (
                            <Button onClick={handleCreateToken} disabled={isCreatingToken}>
                                {isCreatingToken && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                {t('Create Token')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
