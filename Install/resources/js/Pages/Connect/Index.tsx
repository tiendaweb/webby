import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
    Bot,
    Check,
    CheckCircle2,
    ChevronDown,
    Copy,
    Loader2,
    Plug,
    RefreshCw,
    ShieldAlert,
    Terminal,
    Trash2,
    TriangleAlert,
    XCircle,
    Zap,
} from 'lucide-react';
import type { PageProps } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';

interface ConnectorToken {
    id: number;
    name: string;
    owner: string | null;
    abilities: string[];
    ability_count: number;
    last_used_at: string | null;
    expires_at: string | null;
    created_at: string | null;
    is_expired: boolean;
}

interface McpCall {
    id: number;
    server: string;
    tool_name: string;
    success: boolean;
    error_message: string | null;
    project_id: string | null;
    duration_ms: number | null;
    created_at: string | null;
}

interface ProjectConnector {
    id: number;
    status: string;
    is_active: boolean;
    project_id: string;
    project_name: string;
    endpoint: string;
    settings_url: string;
    ends_at: string | null;
}

interface OauthClient {
    id: string;
    name: string;
    client_uri: string | null;
    redirect_hosts: string[];
    created_at: string | null;
    last_used_at: string | null;
    active_connections: number;
}

interface ToolInfo {
    name: string;
    description: string;
    requires: string | null;
}

interface ConnectionForms {
    endpoint: string;
    url_with_token: string;
    header: string;
    claude_code: string;
    claude_desktop_json: string;
    vscode_json: string;
    curl: string;
}

interface IssuedConnection {
    token: string;
    name: string;
    abilities: string[];
    expires_at: string | null;
    connection: ConnectionForms;
}

interface ConnectPageProps extends PageProps {
    endpoints: {
        admin: string;
        admin_url_token_template: string;
        project_template: string;
        project_url_token_template: string;
    };
    tokens: ConnectorToken[];
    oauthClients: OauthClient[];
    abilities: string[];
    riskyAbilities: string[];
    toolCount: number;
    projectToolCount: number;
    tools: ToolInfo[];
    recentCalls: McpCall[];
    projectConnectors: ProjectConnector[];
    platform: { name: string; url: string; base_domain: string | null; project_count: number };
    currentAdmin: { id: number; name: string; email: string };
}

type ClientKey = 'claude' | 'claude-code' | 'chatgpt' | 'grok' | 'other';

/**
 * The two ways a client can carry the credential. Everything on this page
 * is organised around this distinction because it is the one that decides
 * whether a given product can connect at all: the web apps of Claude,
 * ChatGPT and Grok accept a URL and nothing else, so they need the token
 * inside the URL; CLI and desktop clients send a header, which keeps the
 * secret out of the address.
 */
type AuthStyle = 'url' | 'header';

export default function ConnectIndex({
    auth,
    endpoints,
    tokens,
    oauthClients,
    abilities,
    riskyAbilities,
    toolCount,
    projectToolCount,
    tools,
    recentCalls,
    projectConnectors,
    platform,
}: ConnectPageProps) {
    const { t } = useTranslation();

    const [client, setClient] = useState<ClientKey>('claude');
    const [tokenName, setTokenName] = useState('');
    const [expiresInDays, setExpiresInDays] = useState('');
    const [selected, setSelected] = useState<string[]>(abilities);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [issued, setIssued] = useState<IssuedConnection | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<number | null>(null);
    const [revokingClientId, setRevokingClientId] = useState<string | null>(null);
    const [testState, setTestState] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle');
    const [testMessage, setTestMessage] = useState<string>('');

    const clients: Array<{ key: ClientKey; label: string; hint: string; auth: AuthStyle; icon: typeof Bot }> = [
        { key: 'claude', label: 'Claude', hint: t('claude.ai · Desktop · Custom connector'), auth: 'url', icon: Bot },
        { key: 'claude-code', label: 'Claude Code', hint: t('Terminal / IDE'), auth: 'header', icon: Terminal },
        { key: 'chatgpt', label: 'ChatGPT', hint: t('Developer mode connector'), auth: 'url', icon: Bot },
        { key: 'grok', label: 'Grok', hint: t('xAI connectors'), auth: 'url', icon: Zap },
        { key: 'other', label: t('Other client'), hint: t('Inspector, curl, your own code'), auth: 'header', icon: Plug },
    ];

    const activeClient = clients.find((c) => c.key === client) ?? clients[0];

    const allSelected = selected.length === abilities.length;

    const toggleAbility = (ability: string) => {
        setSelected((prev) => (prev.includes(ability) ? prev.filter((a) => a !== ability) : [...prev, ability]));
    };

    const copy = async (value: string, key: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(key);
            window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
            toast.success(t('Copied to clipboard'));
        } catch {
            toast.error(t('Could not copy — select the text and copy it manually.'));
        }
    };

    const handleCreate = async () => {
        if (selected.length === 0) {
            toast.error(t('Select at least one permission.'));
            return;
        }

        setIsCreating(true);
        setTestState('idle');

        try {
            const response = await axios.post('/connect/tokens', {
                name: tokenName.trim() || null,
                abilities: selected,
                expires_in_days: expiresInDays ? Number(expiresInDays) : null,
                client,
            });
            setIssued(response.data as IssuedConnection);
            setTokenName('');
            router.reload({ only: ['tokens'] });
            toast.success(t('Connection created. Copy it now — it is shown only once.'));
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string; message?: string } } };
            toast.error(error.response?.data?.error ?? error.response?.data?.message ?? t('Could not create the connection.'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevoke = async (id: number) => {
        setRevokingId(id);
        try {
            await axios.delete(`/connect/tokens/${id}`);
            toast.success(t('Connection revoked.'));
            router.reload({ only: ['tokens'] });
        } catch {
            toast.error(t('Could not revoke this connection.'));
        } finally {
            setRevokingId(null);
        }
    };

    const handleRevokeOauthClient = async (id: string) => {
        setRevokingClientId(id);
        try {
            await axios.delete(`/connect/oauth-clients/${id}`);
            toast.success(t('App disconnected.'));
            router.reload({ only: ['oauthClients'] });
        } catch {
            toast.error(t('Could not disconnect this app.'));
        } finally {
            setRevokingClientId(null);
        }
    };

    /**
     * Calls the endpoint the way a connector would (initialize over
     * Streamable HTTP) so a failure surfaces here — with the real error —
     * rather than as an unexplained "could not connect" inside Claude.
     */
    const handleTest = async () => {
        if (!issued) return;

        setTestState('running');
        setTestMessage('');

        try {
            const response = await fetch(issued.connection.url_with_token, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {
                        protocolVersion: '2025-06-18',
                        capabilities: {},
                        clientInfo: { name: 'connect-screen', version: '1.0.0' },
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok || data?.error) {
                setTestState('fail');
                setTestMessage(data?.error?.message ?? `HTTP ${response.status}`);
                return;
            }

            const listed = await fetch(issued.connection.url_with_token, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
            }).then((r) => r.json());

            const count = listed?.result?.tools?.length ?? 0;
            setTestState('ok');
            setTestMessage(
                t(':server answered and exposed :count tools.', {
                    server: data?.result?.serverInfo?.name ?? 'MCP',
                    count,
                })
            );
        } catch (e: unknown) {
            setTestState('fail');
            setTestMessage(e instanceof Error ? e.message : String(e));
        }
    };

    const connectionUrl = issued?.connection.url_with_token ?? '';

    /** Per-client, step-by-step wiring instructions. */
    const instructions = useMemo(() => {
        const tokenUrl = connectionUrl || `${endpoints.admin_url_token_template}`;
        const oauthUrl = endpoints.admin;
        const bearer = issued ? issued.connection.header : 'Authorization: Bearer <TOKEN>';

        // Every product gets the OAuth route first: it is the only one where
        // the thing you paste is not a secret, so it survives being sent to a
        // colleague, and the connector renews itself instead of dying when a
        // token expires.
        const oauthWay = (steps: string[]) => ({
            name: t('Way 1 — Sign in (OAuth, recommended)'),
            steps,
            value: oauthUrl,
            valueLabel: t('MCP endpoint — this URL holds no secret'),
        });

        return {
            claude: {
                title: t('Connect from Claude'),
                ways: [
                    oauthWay([
                        t('Open claude.ai and go to Settings → Connectors.'),
                        t('Click "Add custom connector" and paste the endpoint below.'),
                        t('Claude will send you to this platform to sign in and approve the connection.'),
                        t('Approve it, and enable the connector in a new chat from the tools menu.'),
                    ]),
                    {
                        name: t('Way 2 — URL with the token inside (no sign-in)'),
                        steps: [
                            t('Same screen, but paste this URL instead and leave authentication as "no authentication".'),
                            t('Use this when you cannot complete a browser sign-in. Treat the URL as a password.'),
                        ],
                        value: tokenUrl,
                        valueLabel: t('Connection URL'),
                    },
                    {
                        name: t('Way 3 — Claude Desktop (config file)'),
                        steps: [
                            t('Open Claude Desktop → Settings → Developer → Edit config.'),
                            t('Paste this into claude_desktop_config.json and restart Claude Desktop.'),
                            t('Requires Node.js: it bridges the remote server through mcp-remote.'),
                        ],
                        value: issued?.connection.claude_desktop_json ?? '{ … }',
                        valueLabel: 'claude_desktop_config.json',
                        code: true,
                    },
                ],
            },
            'claude-code': {
                title: t('Connect from Claude Code'),
                ways: [
                    {
                        // Same OAuth route as the others, but what you paste
                        // is a command rather than a bare URL.
                        name: t('Way 1 — Sign in (OAuth, recommended)'),
                        steps: [
                            t('Run the command below in the terminal, in any project.'),
                            t('Then type /mcp inside Claude Code and choose "Authenticate" — it opens the browser.'),
                            t('Approve the connection and /mcp will show the server as connected.'),
                        ],
                        value: `claude mcp add --transport http webby ${oauthUrl}`,
                        valueLabel: t('Command'),
                        code: true,
                    },
                    {
                        name: t('Way 2 — One command with a token'),
                        steps: [
                            t('Run this in the terminal, in any project.'),
                            t('Check it with /mcp inside Claude Code — the server should be listed as connected.'),
                        ],
                        value: issued?.connection.claude_code ?? `claude mcp add --transport http webby ${oauthUrl} --header "Authorization: Bearer <TOKEN>"`,
                        valueLabel: t('Command'),
                        code: true,
                    },
                    {
                        name: t('Way 3 — VS Code / JetBrains (mcp.json)'),
                        steps: [t('Add this server entry to your editor MCP configuration.')],
                        value: issued?.connection.vscode_json ?? '{ … }',
                        valueLabel: 'mcp.json',
                        code: true,
                    },
                ],
            },
            chatgpt: {
                title: t('Connect from ChatGPT'),
                ways: [
                    oauthWay([
                        t('In ChatGPT, open Settings → Connectors (developer mode must be enabled for your account).'),
                        t('Choose "Create" / "Add MCP server" and paste the endpoint below.'),
                        t('Pick OAuth as the authentication method; ChatGPT registers itself and sends you here to approve.'),
                        t('Save and enable the connector in the composer for the chats where you want it.'),
                    ]),
                    {
                        name: t('Way 2 — URL with the token inside (no sign-in)'),
                        steps: [
                            t('Same screen, but paste this URL and pick "No authentication".'),
                            t('The credential travels inside the URL — treat it as a password.'),
                        ],
                        value: tokenUrl,
                        valueLabel: t('Connection URL'),
                    },
                    {
                        name: t('Way 3 — From the API / Agents SDK'),
                        steps: [t('Reference the server as a hosted MCP tool in your request.')],
                        value: `{
  "type": "mcp",
  "server_label": "webby",
  "server_url": "${tokenUrl}",
  "require_approval": "never"
}`,
                        valueLabel: t('Tool definition'),
                        code: true,
                    },
                ],
            },
            grok: {
                title: t('Connect from Grok'),
                ways: [
                    oauthWay([
                        t('Open Grok → Settings → Connectors → Add.'),
                        t('Choose a custom / MCP server and paste the endpoint below.'),
                        t('Grok will send you here to sign in and approve the connection.'),
                    ]),
                    {
                        name: t('Way 2 — URL with the token inside (no sign-in)'),
                        steps: [t('Same screen, but paste this URL and choose no authentication.')],
                        value: tokenUrl,
                        valueLabel: t('Connection URL'),
                    },
                    {
                        name: t('Way 3 — xAI API'),
                        steps: [t('Pass the server in the tools array of your request.')],
                        value: `{
  "type": "mcp",
  "server_label": "webby",
  "server_url": "${tokenUrl}"
}`,
                        valueLabel: t('Tool definition'),
                        code: true,
                    },
                ],
            },
            other: {
                title: t('Any other MCP client'),
                ways: [
                    {
                        name: t('Way 1 — Header authentication'),
                        steps: [
                            t('Point the client at the endpoint over Streamable HTTP (a single POST per call).'),
                            t('Send the credential as an Authorization header.'),
                        ],
                        value: `${oauthUrl}\n${bearer}`,
                        valueLabel: t('Endpoint + header'),
                        code: true,
                    },
                    {
                        name: t('Way 2 — OAuth discovery'),
                        steps: [
                            t('A client that speaks OAuth finds everything it needs from this document.'),
                            t('It registers itself, sends you here to approve, and refreshes its own token afterwards.'),
                        ],
                        value: `${platform.url}/.well-known/oauth-protected-resource`,
                        valueLabel: t('Discovery document'),
                    },
                    {
                        name: t('Way 3 — Check it with curl'),
                        steps: [t('A tools/list call should answer with the full tool catalogue.')],
                        value: issued?.connection.curl ?? `curl -sS ${oauthUrl} -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
                        valueLabel: 'curl',
                        code: true,
                    },
                    {
                        name: t('Way 4 — MCP Inspector'),
                        steps: [t('Run the inspector and connect it to the URL below with transport "Streamable HTTP".')],
                        value: `npx @modelcontextprotocol/inspector\n${oauthUrl}`,
                        valueLabel: t('Inspector'),
                        code: true,
                    },
                ],
            },
        } as Record<ClientKey, { title: string; ways: Array<{ name: string; steps: string[]; value: string; valueLabel: string; code?: boolean }> }>;
    }, [connectionUrl, endpoints, issued, platform.url, t]);

    const CopyField = ({ value, label, code, id }: { value: string; label: string; code?: boolean; id: string }) => (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy(value, id)}>
                    {copied === id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="ms-1.5 text-xs">{copied === id ? t('Copied') : t('Copy')}</span>
                </Button>
            </div>
            <pre
                className={`overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs ${code ? 'font-mono' : 'font-mono break-all whitespace-pre-wrap'}`}
            >
                {value}
            </pre>
        </div>
    );

    return (
        <AdminLayout user={auth.user!} title={t('Connect assistants')}>
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                            <Plug className="h-6 w-6 text-primary" />
                            {t('Connect assistants')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t('Give Claude, ChatGPT or Grok direct control of :platform: create, upload, edit and publish sites, manage customers and databases.', {
                                platform: platform.name,
                            })}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1">
                            <Bot className="h-3 w-3" /> {t(':count admin tools', { count: toolCount })}
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                            <Plug className="h-3 w-3" /> {t(':count per-site tools', { count: projectToolCount })}
                        </Badge>
                    </div>
                </div>

                {/* Ready-to-paste endpoints. Deliberately above the token
                    step: with OAuth, the endpoint URL alone is a complete
                    answer to "what do I paste into Claude?", and it carries
                    no secret — so it is the thing most people need and the
                    only one they can safely send to a colleague. */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('URLs ready to copy')}</CardTitle>
                        <CardDescription>
                            {t('Paste the first one into the connector settings of Claude, ChatGPT or Grok. It holds no secret — the assistant will send you here to sign in and approve.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <CopyField
                            id="ready-endpoint"
                            label={t('MCP endpoint (sign-in / OAuth) — for Claude, ChatGPT and Grok')}
                            value={endpoints.admin}
                        />
                        <CopyField
                            id="ready-discovery"
                            label={t('OAuth discovery document — for clients that ask for it')}
                            value={`${platform.url}/.well-known/oauth-protected-resource`}
                        />
                        <CopyField
                            id="ready-project"
                            label={t('Per-site endpoint — replace {PROJECT_ID} with the project id')}
                            value={endpoints.project_template}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('Prefer a URL that needs no sign-in (a headless client, a script)? Create a connection below and use the URL it gives you — that one carries the credential inside it.')}
                        </p>
                    </CardContent>
                </Card>

                {/* Step 1 — create the connection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('1. Create the connection')}</CardTitle>
                        <CardDescription>
                            {t('Pick where you will use it. Everything below is filled in for that client automatically.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                            {clients.map((c) => {
                                const Icon = c.icon;
                                const isActive = c.key === client;
                                return (
                                    <button
                                        key={c.key}
                                        type="button"
                                        onClick={() => setClient(c.key)}
                                        className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-start transition-colors ${
                                            isActive ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent'
                                        }`}
                                    >
                                        <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="text-sm font-medium">{c.label}</span>
                                        <span className="text-[11px] leading-tight text-muted-foreground">{c.hint}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="token-name">{t('Name (optional)')}</Label>
                                <Input
                                    id="token-name"
                                    value={tokenName}
                                    onChange={(e) => setTokenName(e.target.value)}
                                    placeholder={t('e.g. Claude on my laptop')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="token-expiry">{t('Expires in (days)')}</Label>
                                <Input
                                    id="token-expiry"
                                    type="number"
                                    min={1}
                                    max={3650}
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(e.target.value)}
                                    placeholder={t('Leave empty for no expiry')}
                                />
                            </div>
                        </div>

                        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                                <div className="text-sm">
                                    <span className="font-medium">{t('Permissions')}</span>{' '}
                                    <span className="text-muted-foreground">
                                        {allSelected
                                            ? t('full access (:count)', { count: abilities.length })
                                            : t(':selected of :total selected', { selected: selected.length, total: abilities.length })}
                                    </span>
                                </div>
                                {/* The presets sit outside the collapsible on
                                    purpose: "give it everything" is the common
                                    case and should not require opening a panel
                                    of 26 checkboxes first. */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant={allSelected ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelected(abilities)}
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        <span className="ms-1.5">{t('Select all permissions')}</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelected(abilities.filter((a) => !riskyAbilities.includes(a)))}
                                    >
                                        {t('Safe set only')}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setSelected([])}>
                                        {t('Clear')}
                                    </Button>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            {advancedOpen ? t('Hide') : t('Customise')}
                                            <ChevronDown className={`ms-1.5 h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                                        </Button>
                                    </CollapsibleTrigger>
                                </div>
                            </div>
                            <CollapsibleContent className="pt-3">
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {abilities.map((ability) => (
                                        <label
                                            key={ability}
                                            className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
                                        >
                                            <Checkbox checked={selected.includes(ability)} onCheckedChange={() => toggleAbility(ability)} />
                                            <span className="font-mono text-xs">{ability}</span>
                                            {riskyAbilities.includes(ability) && (
                                                <TriangleAlert className="ms-auto h-3.5 w-3.5 text-amber-500" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <Button onClick={handleCreate} disabled={isCreating} size="lg" className="w-full md:w-auto">
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                            <span className="ms-2">{t('Create connection for :client', { client: activeClient.label })}</span>
                        </Button>
                    </CardContent>
                </Card>

                {/* The issued credential */}
                {issued && (
                    <Card className="border-primary/40 bg-primary/[0.03]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                {t('2. Your connection')}
                            </CardTitle>
                            <CardDescription>
                                {t('Shown once and never again. Anyone holding this URL or token has the permissions listed below.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <CopyField
                                id="url"
                                label={t('Connection URL — for Claude, ChatGPT and Grok connectors')}
                                value={issued.connection.url_with_token}
                            />
                            <CopyField id="token" label={t('Token — for clients that send a header')} value={issued.token} />
                            <CopyField id="endpoint" label={t('Endpoint (header auth)')} value={issued.connection.endpoint} />

                            <div className="flex flex-wrap items-center gap-3">
                                <Button variant="outline" onClick={handleTest} disabled={testState === 'running'}>
                                    {testState === 'running' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    <span className="ms-2">{t('Test this connection')}</span>
                                </Button>
                                {testState === 'ok' && (
                                    <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" /> {testMessage}
                                    </span>
                                )}
                                {testState === 'fail' && (
                                    <span className="flex items-center gap-1.5 text-sm text-destructive">
                                        <XCircle className="h-4 w-4" /> {testMessage}
                                    </span>
                                )}
                            </div>

                            <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>{t('Treat this like a password')}</AlertTitle>
                                <AlertDescription>
                                    {t('This connection can read and change every customer site on this installation. Revoke it below the moment you no longer need it or suspect it leaked — every call it makes is recorded in the audit log.')}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3 — instructions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('3. How to connect')}</CardTitle>
                        <CardDescription>
                            {issued
                                ? t('The values below already include your new connection.')
                                : t('Create a connection above and these steps will fill in with real values.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={client} onValueChange={(v) => setClient(v as ClientKey)}>
                            <TabsList className="flex h-auto w-full flex-wrap justify-start">
                                {clients.map((c) => (
                                    <TabsTrigger key={c.key} value={c.key}>
                                        {c.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {clients.map((c) => (
                                <TabsContent key={c.key} value={c.key} className="space-y-6 pt-4">
                                    <h3 className="text-sm font-semibold">{instructions[c.key].title}</h3>
                                    {instructions[c.key].ways.map((way, index) => (
                                        <div key={way.name} className="space-y-3 rounded-lg border p-4">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{index + 1}</Badge>
                                                <span className="text-sm font-medium">{way.name}</span>
                                            </div>
                                            <ol className="ms-4 list-decimal space-y-1 text-sm text-muted-foreground">
                                                {way.steps.map((step) => (
                                                    <li key={step}>{step}</li>
                                                ))}
                                            </ol>
                                            <CopyField id={`${c.key}-${index}`} label={way.valueLabel} value={way.value} code={way.code} />
                                        </div>
                                    ))}
                                    {!issued && (
                                        <p className="text-xs text-muted-foreground">
                                            {t('Placeholders like <TOKEN> are replaced once you create a connection above.')}
                                        </p>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>

                {/* What the assistant can do */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('What the assistant can do once connected')}</CardTitle>
                        <CardDescription>
                            {t('These are the :count tools exposed by the admin server. Each one is gated by the permission next to it.', {
                                count: toolCount,
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-2">
                            {[
                                { title: t('Create sites from a prompt'), body: t('admin_projects_create writes the files itself — no template involved — and can publish to a subdomain in the same call.') },
                                { title: t('Upload an existing project'), body: t('admin_projects_import takes a ZIP inline or from a URL and extracts it into a workspace.') },
                                { title: t('Edit anything, live'), body: t('admin_files_list / read / write / rename / delete and mkdir reach every project on the platform.') },
                                { title: t('Publish and unpublish'), body: t('admin_projects_publish assigns the subdomain and flips visibility.') },
                                { title: t('Each customer’s own database'), body: t('Read and write the Firestore database behind any customer site — their own Firebase project, or the platform one namespaced to them. Collections, documents, filtered queries, create/update/delete.') },
                                { title: t('The platform database'), body: t('Browse connections and tables, read and write rows, create or alter tables, or run a single guarded SQL statement.') },
                                { title: t('Customers, plans and billing'), body: t('Create accounts, change plans, review transactions and subscriptions.') },
                            ].map((item) => (
                                <div key={item.title} className="rounded-lg border p-3">
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                                </div>
                            ))}
                        </div>

                        <Collapsible className="mt-4">
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" size="sm">
                                    {t('See the full tool list')}
                                    <ChevronDown className="ms-1.5 h-4 w-4" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-3">
                                <div className="max-h-80 overflow-y-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Tool')}</TableHead>
                                                <TableHead className="hidden md:table-cell">{t('What it does')}</TableHead>
                                                <TableHead>{t('Requires')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tools.map((tool) => (
                                                <TableRow key={tool.name}>
                                                    <TableCell className="font-mono text-xs">{tool.name}</TableCell>
                                                    <TableCell className="hidden max-w-md text-xs text-muted-foreground md:table-cell">
                                                        {tool.description}
                                                    </TableCell>
                                                    <TableCell>
                                                        {tool.requires ? (
                                                            <Badge
                                                                variant={riskyAbilities.includes(tool.requires) ? 'destructive' : 'secondary'}
                                                                className="font-mono text-[10px]"
                                                            >
                                                                {tool.requires}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </CardContent>
                </Card>

                {/* Apps connected through OAuth. Separate from the token list
                    below because these were never issued by hand — the app
                    enrolled itself and an administrator approved it. */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Apps connected with sign-in (OAuth)')}</CardTitle>
                        <CardDescription>
                            {t('Assistants that registered themselves and were approved on the consent screen. Disconnecting one revokes its access immediately.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* The URL and the exact steps live here, next to the
                            list, so connecting a new app never means going to
                            look for them somewhere else on the page. */}
                        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                            <CopyField
                                id="oauth-endpoint"
                                label={t('Paste this URL into the assistant — it holds no secret')}
                                value={endpoints.admin}
                            />
                            <div className="grid gap-3 md:grid-cols-3">
                                {[
                                    {
                                        name: 'Claude',
                                        steps: [
                                            t('claude.ai → Settings → Connectors'),
                                            t('"Add custom connector", paste the URL above'),
                                            t('Claude sends you here to sign in — approve it'),
                                            t('Turn the connector on in a new chat, from the tools menu'),
                                        ],
                                    },
                                    {
                                        name: 'ChatGPT',
                                        steps: [
                                            t('Settings → Connectors (developer mode must be on)'),
                                            t('"Create" / "Add MCP server", paste the URL above'),
                                            t('Choose OAuth as the authentication method'),
                                            t('Approve it here, then enable it in the composer'),
                                        ],
                                    },
                                    {
                                        name: 'Grok',
                                        steps: [
                                            t('Grok → Settings → Connectors → Add'),
                                            t('Choose a custom / MCP server, paste the URL above'),
                                            t('Approve it here when Grok sends you over'),
                                            t('Turn it on for your conversation'),
                                        ],
                                    },
                                ].map((client) => (
                                    <div key={client.name} className="rounded-md border bg-background p-3">
                                        <p className="mb-1.5 text-sm font-medium">{client.name}</p>
                                        <ol className="ms-4 list-decimal space-y-1 text-xs text-muted-foreground">
                                            {client.steps.map((step) => (
                                                <li key={step}>{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                ))}
                            </div>
                            <details>
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                    {t('A client that asks for the discovery document instead')}
                                </summary>
                                <div className="pt-2">
                                    <CopyField
                                        id="oauth-discovery"
                                        label={t('OAuth discovery document')}
                                        value={`${platform.url}/.well-known/oauth-protected-resource`}
                                    />
                                </div>
                            </details>
                        </div>

                        {oauthClients.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                {t('No app has connected this way yet. Follow the steps above and it will appear here.')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {oauthClients.map((client) => (
                                    <div key={client.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-sm font-medium">{client.name}</span>
                                                {client.active_connections > 0 ? (
                                                    <Badge variant="default" className="gap-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {t(':count active', { count: client.active_connections })}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">{t('registered, not connected')}</Badge>
                                                )}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {client.redirect_hosts.join(', ') || client.id}
                                                {client.last_used_at
                                                    ? ' · ' + t('last used :date', { date: new Date(client.last_used_at).toLocaleString() })
                                                    : ''}
                                            </div>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" disabled={revokingClientId === client.id}>
                                                    {revokingClientId === client.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    )}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('Disconnect :name?', { name: client.name })}</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {t('It loses access immediately. It can ask to connect again, but you would have to approve it on the consent screen.')}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRevokeOauthClient(client.id)}>
                                                        {t('Disconnect')}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Active connections */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('Connections with a token')}</CardTitle>
                        <CardDescription>{t('Every admin connector token on this installation, issued here or minted by an OAuth sign-in. Revoking one disconnects it immediately.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tokens.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t('No connection has been created yet.')}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Name')}</TableHead>
                                        <TableHead className="hidden md:table-cell">{t('Permissions')}</TableHead>
                                        <TableHead className="hidden lg:table-cell">{t('Last used')}</TableHead>
                                        <TableHead className="hidden lg:table-cell">{t('Expires')}</TableHead>
                                        <TableHead className="text-end">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tokens.map((token) => (
                                        <TableRow key={token.id}>
                                            <TableCell>
                                                <div className="text-sm font-medium">{token.name}</div>
                                                <div className="text-xs text-muted-foreground">{token.owner}</div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant="secondary">{t(':count permissions', { count: token.ability_count })}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                                                {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : t('never')}
                                            </TableCell>
                                            <TableCell className="hidden text-xs lg:table-cell">
                                                {token.is_expired ? (
                                                    <Badge variant="destructive">{t('expired')}</Badge>
                                                ) : token.expires_at ? (
                                                    new Date(token.expires_at).toLocaleDateString()
                                                ) : (
                                                    <span className="text-muted-foreground">{t('never')}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" disabled={revokingId === token.id}>
                                                            {revokingId === token.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            )}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t('Revoke this connection?')}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t('The assistant using ":name" will lose access immediately. This cannot be undone — you would have to create a new connection.', {
                                                                    name: token.name,
                                                                })}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleRevoke(token.id)}>
                                                                {t('Revoke')}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Per-site connectors + audit */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Customer site connectors')}</CardTitle>
                            <CardDescription>
                                {t('Sites whose owner activated the AI Connector module. Each one exposes :count tools scoped to that site alone.', {
                                    count: projectToolCount,
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {projectConnectors.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">{t('No customer has activated it yet.')}</p>
                            ) : (
                                <div className="space-y-2">
                                    {projectConnectors.map((connector) => (
                                        <div key={connector.id} className="flex items-center justify-between rounded-md border p-2.5">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium">{connector.project_name}</div>
                                                <div className="truncate font-mono text-[11px] text-muted-foreground">{connector.endpoint}</div>
                                            </div>
                                            <Badge variant={connector.is_active ? 'default' : 'secondary'}>
                                                {connector.is_active ? t('active') : connector.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Separator className="my-4" />
                            <p className="text-xs text-muted-foreground">
                                {t('A customer connects their own site the same way: their project settings issue a token, and the URL is :template.', {
                                    template: endpoints.project_url_token_template,
                                })}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('Recent activity')}</CardTitle>
                            <CardDescription>{t('The last calls any connected assistant made.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentCalls.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">{t('Nothing yet — connect an assistant and try it.')}</p>
                            ) : (
                                <div className="max-h-80 space-y-1.5 overflow-y-auto">
                                    {recentCalls.map((call) => (
                                        <div key={call.id} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                                            {call.success ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                            ) : (
                                                <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                                            )}
                                            <span className="font-mono">{call.tool_name}</span>
                                            <span className="text-muted-foreground">{call.server}</span>
                                            <span className="ms-auto shrink-0 text-muted-foreground">
                                                {call.duration_ms !== null ? `${call.duration_ms} ms` : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
