import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
    AlertTriangle,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    Globe,
    Loader2,
    Lock,
    X,
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '@/contexts/LanguageContext';
import type { AvailabilityStatus, CustomDomainSettings } from './ProjectSettingsPanel';

interface VerificationInstructions {
    method: string;
    record_type: string;
    host: string;
    value: string;
}

interface CustomDomainCardProps {
    project: {
        id: string;
        custom_domain?: string | null;
        custom_domain_verified?: boolean;
        custom_domain_ssl_status?: string | null;
    };
    customDomain: CustomDomainSettings;
}

export function CustomDomainCard({ project, customDomain }: CustomDomainCardProps) {
    const { t } = useTranslation();

    // Domain input state
    const [customDomainInput, setCustomDomainInput] = useState('');
    const [customDomainAvailability, setCustomDomainAvailability] = useState<AvailabilityStatus>('idle');
    const [customDomainErrors, setCustomDomainErrors] = useState<string[]>([]);
    const [isSavingCustomDomain, setIsSavingCustomDomain] = useState(false);
    const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
    const [isRemovingDomain, setIsRemovingDomain] = useState(false);
    const [verificationInstructions, setVerificationInstructions] = useState<VerificationInstructions | null>(null);
    const [showRemoveDomainDialog, setShowRemoveDomainDialog] = useState(false);

    // Auto-verify polling state
    const [isAutoVerifying, setIsAutoVerifying] = useState(false);
    const [autoVerifyExpired, setAutoVerifyExpired] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Availability check
    const checkCustomDomainAvailability = useCallback(async (value: string) => {
        if (value.length < 4) {
            setCustomDomainAvailability('invalid');
            setCustomDomainErrors([t('Domain must be at least 4 characters.')]);
            return;
        }

        setCustomDomainAvailability('checking');

        try {
            const response = await axios.post('/api/domain/check-availability', {
                domain: value,
                exclude_project_id: project.id,
            });

            if (response.data.available) {
                setCustomDomainAvailability('available');
                setCustomDomainErrors([]);
            } else {
                setCustomDomainAvailability('unavailable');
                setCustomDomainErrors([response.data.error || t('This domain is not available.')]);
            }
        } catch {
            setCustomDomainAvailability('idle');
        }
    }, [project.id, t]);

    // Debounced availability check
    useEffect(() => {
        if (!customDomainInput) {
            setCustomDomainAvailability('idle');
            setCustomDomainErrors([]);
            return;
        }

        const timeoutId = setTimeout(() => {
            if (customDomainInput.length >= 4) {
                checkCustomDomainAvailability(customDomainInput);
            } else if (customDomainInput.length > 0) {
                setCustomDomainAvailability('invalid');
                setCustomDomainErrors([t('Domain must be at least 4 characters.')]);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [customDomainInput, checkCustomDomainAvailability, t]);

    // Load verification instructions when domain is pending
    useEffect(() => {
        if (project.custom_domain && !project.custom_domain_verified) {
            axios.get(`/project/${project.id}/domain/instructions`)
                .then(response => {
                    if (response.data.success) {
                        setVerificationInstructions(response.data.instructions);
                    }
                })
                .catch(() => {
                    // Silently fail - instructions will be shown on manual refresh
                });
        }
    }, [project.id, project.custom_domain, project.custom_domain_verified]);

    // Auto-verify polling
    useEffect(() => {
        if (!project.custom_domain || project.custom_domain_verified) {
            return;
        }

        const startTime = Date.now();
        setAutoVerifyExpired(false);
        const jitter = Math.floor(Math.random() * 10000);

        pollingRef.current = setInterval(async () => {
            // Stop after 10 minutes
            if (Date.now() - startTime > 10 * 60 * 1000) {
                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = null;
                setAutoVerifyExpired(true);
                setIsAutoVerifying(false);
                return;
            }

            setIsAutoVerifying(true);
            try {
                const response = await axios.post(`/project/${project.id}/domain/verify`);
                if (response.data.success) {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    pollingRef.current = null;
                    if (!response.data.already_verified) {
                        toast.success(t('Domain verified successfully!'));
                    }
                    router.reload();
                    return;
                }
            } catch {
                // Silent - will retry on next interval
            } finally {
                setIsAutoVerifying(false);
            }
        }, 30000 + jitter);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            setIsAutoVerifying(false);
        };
    }, [project.id, project.custom_domain, project.custom_domain_verified, t]);

    const handleAddCustomDomain = async () => {
        if (!customDomainInput || customDomainAvailability !== 'available') return;

        setIsSavingCustomDomain(true);

        try {
            const response = await axios.post(`/project/${project.id}/domain`, {
                domain: customDomainInput,
            });

            if (response.data.success) {
                toast.success(t('Custom domain added. Please verify ownership.'));
                setCustomDomainInput('');
                setVerificationInstructions(response.data.verification);
                router.reload();
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || t('Failed to add custom domain'));
        } finally {
            setIsSavingCustomDomain(false);
        }
    };

    const handleVerifyDomain = async () => {
        setIsVerifyingDomain(true);

        try {
            const response = await axios.post(`/project/${project.id}/domain/verify`);

            if (response.data.success) {
                toast.success(t('Domain verified successfully!'));
                router.reload();
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || t('Domain verification failed'));
        } finally {
            setIsVerifyingDomain(false);
        }
    };

    const handleRemoveCustomDomain = async () => {
        setIsRemovingDomain(true);

        try {
            const response = await axios.delete(`/project/${project.id}/domain`);

            if (response.data.success) {
                toast.success(t('Custom domain removed'));
                setShowRemoveDomainDialog(false);
                setVerificationInstructions(null);
                router.reload();
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || t('Failed to remove custom domain'));
        } finally {
            setIsRemovingDomain(false);
        }
    };

    const getAvailabilityIcon = () => {
        switch (customDomainAvailability) {
            case 'checking':
                return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
            case 'available':
                return <Check className="h-4 w-4 text-success" />;
            case 'unavailable':
            case 'invalid':
                return <X className="h-4 w-4 text-destructive" />;
            default:
                return null;
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                toast.success(t('Copied to clipboard'));
            }
        } catch {
            // Silent fail — clipboard not available
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            {t('Custom Domain')}
                        </CardTitle>
                        <CardDescription>
                            {t('Connect your own domain to your project.')}
                        </CardDescription>
                    </div>
                    {project.custom_domain && (
                        <Badge
                            variant={
                                project.custom_domain_ssl_status === 'active'
                                    ? 'success'
                                    : project.custom_domain_ssl_status === 'failed'
                                    ? 'destructive'
                                    : project.custom_domain_verified
                                    ? 'info'
                                    : 'warning'
                            }
                        >
                            {project.custom_domain_ssl_status === 'active'
                                ? t('Active')
                                : project.custom_domain_ssl_status === 'failed'
                                ? t('SSL Failed')
                                : project.custom_domain_verified
                                ? t('SSL Provisioning')
                                : t('Pending Verification')}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!customDomain.enabled ? (
                    <div className="rounded-lg border p-4 text-center">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                            {t('Custom domain publishing is not available on your current plan.')}
                        </p>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/billing/plans">{t('View Plans')}</Link>
                        </Button>
                    </div>
                ) : project.custom_domain ? (
                    <>
                        {/* Pending verification — step-by-step instructions */}
                        {!project.custom_domain_verified && verificationInstructions && (
                            <div className="space-y-4">
                                <p className="text-sm font-medium">
                                    {t('Domain Verification Required')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t('Follow these steps to verify ownership of your domain:')}
                                </p>

                                <ol className="space-y-4 text-sm">
                                    {/* Step 1 */}
                                    <li className="flex gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                                            1
                                        </span>
                                        <span className="text-muted-foreground pt-0.5">
                                            {t('Log in to your DNS provider (the service where you purchased or manage your domain).')}
                                        </span>
                                    </li>

                                    {/* Step 2 */}
                                    <li className="flex gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                                            2
                                        </span>
                                        <span className="text-muted-foreground pt-0.5">
                                            {t('Navigate to the DNS settings or DNS management page for your domain.')}
                                        </span>
                                    </li>

                                    {/* Step 3 — A record table */}
                                    <li className="flex gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                                            3
                                        </span>
                                        <div className="flex-1 space-y-3 pt-0.5">
                                            <span className="text-muted-foreground">
                                                {t('Add an A record with these values:')}
                                            </span>
                                            <div className="rounded-lg border p-3 bg-muted/50">
                                                <div className="grid gap-2 text-sm">
                                                    <div className="grid grid-cols-3 gap-2 font-medium text-xs text-muted-foreground">
                                                        <span>{t('Type')}</span>
                                                        <span>{t('Host / Name')}</span>
                                                        <span>{t('Value')}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 items-center">
                                                        <code className="text-xs bg-background px-2 py-1 rounded border">
                                                            {verificationInstructions.record_type}
                                                        </code>
                                                        <div className="flex items-center gap-1">
                                                            <code className="text-xs bg-background px-2 py-1 rounded border truncate flex-1">
                                                                {verificationInstructions.host}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 shrink-0"
                                                                onClick={() => copyToClipboard(verificationInstructions.host)}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <code className="text-xs bg-background px-2 py-1 rounded border truncate flex-1">
                                                                {verificationInstructions.value}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 shrink-0"
                                                                onClick={() => copyToClipboard(verificationInstructions.value)}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>

                                    {/* Step 4 */}
                                    <li className="flex gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                                            4
                                        </span>
                                        <span className="text-muted-foreground pt-0.5">
                                            {t('Wait for DNS propagation. This can take up to 48 hours, but usually completes much faster.')}
                                        </span>
                                    </li>

                                    {/* Step 5 */}
                                    <li className="flex gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                                            5
                                        </span>
                                        <span className="text-muted-foreground pt-0.5">
                                            {t('Click "Verify Domain" below to check if the DNS record has been detected.')}
                                        </span>
                                    </li>
                                </ol>
                            </div>
                        )}

                        {/* Auto-verify status */}
                        {!project.custom_domain_verified && project.custom_domain && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {autoVerifyExpired ? (
                                    <>
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {t('Auto-check stopped. Click "Verify Domain" to check manually.')}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>{t('Automatically checking every 30 seconds...')}</span>
                                        {isAutoVerifying && (
                                            <span className="text-muted-foreground/60">{t('Checking now...')}</span>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* SSL status — verified domain */}
                        {project.custom_domain_verified && (
                            <div className="space-y-3">
                                {project.custom_domain_ssl_status === 'active' ? (
                                    <div className="rounded-lg border border-success/30 p-4 bg-success/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="h-5 w-5 text-success" />
                                            <p className="text-sm font-medium text-success">
                                                {t('Domain Active')}
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {t('Your domain is live at:')}{' '}
                                            <a
                                                href={`https://${project.custom_domain}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline inline-flex items-center gap-1"
                                            >
                                                {project.custom_domain}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </p>
                                    </div>
                                ) : project.custom_domain_ssl_status === 'failed' ? (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>{t('SSL Provisioning Failed')}</AlertTitle>
                                        <AlertDescription>
                                            <p>
                                                {t('SSL provisioning failed. This usually means the DNS is not properly configured.')}
                                            </p>
                                            <p className="mt-2">
                                                {t('Please verify your A record is correct. If the issue persists, try removing the domain and adding it again. Contact support if the problem continues.')}
                                            </p>
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <Lock className="h-5 w-5 text-muted-foreground" />
                                                <Loader2 className="h-3 w-3 animate-spin text-primary absolute -bottom-1 -right-1" />
                                            </div>
                                            <p className="text-sm font-medium">
                                                {t('SSL Certificate Provisioning')}
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {t('Your SSL certificate is being provisioned automatically. This usually completes within a few minutes after domain verification.')}
                                        </p>
                                        <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary/40 rounded-full animate-pulse w-2/3" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            {!project.custom_domain_verified && (
                                <Button
                                    onClick={handleVerifyDomain}
                                    disabled={isVerifyingDomain}
                                >
                                    {isVerifyingDomain && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                    {t('Verify Domain')}
                                </Button>
                            )}
                            <AlertDialog open={showRemoveDomainDialog} onOpenChange={setShowRemoveDomainDialog}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline">
                                        {t('Remove Domain')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('Remove Custom Domain?')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('This will disconnect the domain from your project. The domain will no longer point to your project.')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleRemoveCustomDomain}
                                            disabled={isRemovingDomain}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {isRemovingDomain && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                            {t('Remove Domain')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </>
                ) : (
                    <>
                        {/* No domain configured — input form */}
                        {!customDomain.canCreateMore ? (
                            <div className="rounded-lg border p-4 text-center">
                                <p className="text-sm text-muted-foreground">
                                    {t('You have reached your custom domain limit.')}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="custom_domain_input">{t('Enter your domain')}</Label>
                                    <div className="relative">
                                        <Input
                                            id="custom_domain_input"
                                            value={customDomainInput}
                                            onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().trim())}
                                            placeholder={t('example.com or www.example.com')}
                                            className="pe-8"
                                        />
                                        <div className="absolute end-2 top-1/2 -translate-y-1/2">
                                            {getAvailabilityIcon()}
                                        </div>
                                    </div>
                                    {customDomainErrors.length > 0 && customDomainAvailability !== 'available' && (
                                        <p className="text-xs text-destructive">{customDomainErrors[0]}</p>
                                    )}
                                    {customDomainAvailability === 'available' && (
                                        <p className="text-xs text-success">{t('This domain is available!')}</p>
                                    )}
                                </div>

                                {!customDomain.usage.unlimited && customDomain.usage.limit && (
                                    <p className="text-xs text-muted-foreground">
                                        {t('Custom domain usage: :used / :limit', { used: customDomain.usage.used, limit: customDomain.usage.limit })}
                                    </p>
                                )}

                                <Button
                                    onClick={handleAddCustomDomain}
                                    disabled={
                                        isSavingCustomDomain ||
                                        !customDomainInput ||
                                        customDomainAvailability !== 'available'
                                    }
                                >
                                    {isSavingCustomDomain && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                                    {t('Add Domain')}
                                </Button>
                            </>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
