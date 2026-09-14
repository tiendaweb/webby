import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ApplicationLogo from '@/components/ApplicationLogo';
import { Check, Loader2, Plug, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface AuthorizePageProps {
    csrfToken: string;
    client: {
        id: string;
        name: string;
        uri: string | null;
        redirect_uri: string;
        redirect_host: string | null;
        is_new: boolean;
    };
    abilities: string[];
    riskyAbilities: string[];
    grantsEverything: boolean;
    toolCount: number;
    account: { name: string; email: string };
    accessTokenHours: number;
    query: {
        client_id: string;
        redirect_uri: string;
        state: string;
        scope: string;
        code_challenge: string;
        code_challenge_method: string;
        resource: string;
    };
}

/**
 * The consent screen. Rendered standalone rather than inside the app shell:
 * the person arrives here mid-flow from Claude/ChatGPT/Grok and is going
 * straight back out, so a sidebar and a notification bell would only be
 * things to click by mistake.
 */
export default function OauthAuthorize({
    csrfToken,
    client,
    abilities,
    riskyAbilities,
    grantsEverything,
    toolCount,
    account,
    accessTokenHours,
    query,
}: AuthorizePageProps) {
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState<'approve' | 'deny' | null>(null);

    // A rejected POST redirects straight back here. Without this the page
    // just appeared to reload and the reason stayed invisible — which is
    // exactly how a missing field went unnoticed once already.
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const errorMessages = Object.values(errors ?? {});

    const risky = abilities.filter((a) => riskyAbilities.includes(a));

    return (
        <>
            <Head title={t('Authorize connection')} />
            <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
                <div className="w-full max-w-lg space-y-5 rounded-xl border bg-background p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <ApplicationLogo showText size="lg" />
                        <Badge variant="outline" className="gap-1">
                            <Plug className="h-3 w-3" />
                            {t('MCP')}
                        </Badge>
                    </div>

                    {errorMessages.length > 0 && (
                        <Alert variant="destructive">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>{t('The authorization could not be completed')}</AlertTitle>
                            <AlertDescription>
                                <ul className="ms-4 list-disc">
                                    {errorMessages.map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">
                            {t('Connect :client?', { client: client.name })}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t(':client is asking to control this platform on your behalf, as :email.', {
                                client: client.name,
                                email: account.email,
                            })}
                        </p>
                    </div>

                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">{t('Returns to')}</span>
                            <span className="truncate font-mono text-xs">{client.redirect_host ?? client.redirect_uri}</span>
                        </div>
                        <div className="mt-1.5 flex justify-between gap-3">
                            <span className="text-muted-foreground">{t('Access expires in')}</span>
                            <span className="text-xs">{t(':hours hours, then renews automatically', { hours: accessTokenHours })}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">
                            {grantsEverything
                                ? t('It will be able to use all :count tools:', { count: toolCount })
                                : t('It will be able to:')}
                        </p>
                        <ul className="ms-1 space-y-1.5 text-sm text-muted-foreground">
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                {t('Create, edit, upload and publish sites — yours and your customers’.')}
                            </li>
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                {t('Read and write every file of every project.')}
                            </li>
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                {t('Read and change the platform database and its settings.')}
                            </li>
                            <li className="flex gap-2">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                {t('Manage customer accounts, plans, transactions and subscriptions.')}
                            </li>
                        </ul>
                    </div>

                    {risky.length > 0 && (
                        <Alert variant="destructive">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>{t('This includes destructive permissions')}</AlertTitle>
                            <AlertDescription>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {risky.map((ability) => (
                                        <Badge key={ability} variant="destructive" className="font-mono text-[10px]">
                                            {ability}
                                        </Badge>
                                    ))}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {client.is_new && (
                        <p className="flex items-start gap-2 text-xs text-muted-foreground">
                            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                            {t('This application registered itself moments ago. Only approve it if you are the one who just started this from :client.', {
                                client: client.name,
                            })}
                        </p>
                    )}

                    <Separator />

                    {/*
                        Two native forms, one per outcome.

                        Native, not an Inertia router.post(): approving answers
                        with a 302 to the client's own redirect_uri
                        (claude.ai, chatgpt.com, …). An XHR follows that
                        redirect itself, so the browser treats it as a
                        cross-origin fetch and CORS kills it — the user never
                        leaves this page.

                        Two forms with a hidden "approve", rather than one form
                        with two named submit buttons: the submitter's
                        name/value is only included if the button is still
                        enabled when the browser builds the form data, which
                        happens *after* the submit handler runs. Setting the
                        "submitting" state there disables the button first, so
                        "approve" silently went missing, validation failed, and
                        Laravel redirected straight back to this page — which
                        looked exactly like the page reloading on click. A
                        hidden input cannot be disabled out from under the
                        submission.
                    */}
                    <div className="flex flex-col gap-2 sm:flex-row-reverse">
                        {([
                            { key: 'approve' as const, value: '1', label: t('Authorize'), variant: undefined },
                            { key: 'deny' as const, value: '0', label: t('Cancel'), variant: 'outline' as const },
                        ]).map((action) => (
                            <form
                                key={action.key}
                                method="POST"
                                action="/oauth/authorize"
                                onSubmit={() => setSubmitting(action.key)}
                                className="sm:flex-1"
                            >
                                <input type="hidden" name="_token" value={csrfToken} />
                                <input type="hidden" name="approve" value={action.value} />
                                <input type="hidden" name="client_id" value={query.client_id} />
                                <input type="hidden" name="redirect_uri" value={query.redirect_uri} />
                                <input type="hidden" name="state" value={query.state} />
                                <input type="hidden" name="scope" value={query.scope} />
                                <input type="hidden" name="code_challenge" value={query.code_challenge} />
                                <input type="hidden" name="code_challenge_method" value={query.code_challenge_method} />

                                <Button type="submit" variant={action.variant} className="w-full">
                                    {submitting === action.key ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : action.key === 'approve' ? (
                                        <Check className="h-4 w-4" />
                                    ) : null}
                                    <span className={action.key === 'approve' || submitting === action.key ? 'ms-2' : ''}>
                                        {action.label}
                                    </span>
                                </Button>
                            </form>
                        ))}
                    </div>

                    <p className="text-center text-xs text-muted-foreground">
                        {t('You can revoke this at any time from the Connect screen.')}
                    </p>
                </div>
            </div>
        </>
    );
}
