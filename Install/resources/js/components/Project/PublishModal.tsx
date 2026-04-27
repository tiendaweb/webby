import { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Check, X, Lock, Globe, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '@/contexts/LanguageContext';

interface Project {
    id: string;
    name: string;
    subdomain: string | null;
    published_title: string | null;
    published_description: string | null;
    published_visibility: string;
    published_at: string | null;
}

interface PublishModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project;
    baseDomain: string;
    canUseSubdomains: boolean;
    canCreateMoreSubdomains: boolean;
    canUsePrivateVisibility: boolean;
    suggestedSubdomain: string;
    onPublished?: (url: string) => void;
}

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid';

export default function PublishModal({
    open,
    onOpenChange,
    project,
    baseDomain,
    canUseSubdomains,
    canCreateMoreSubdomains,
    canUsePrivateVisibility,
    suggestedSubdomain,
    onPublished,
}: PublishModalProps) {
    const { t } = useTranslation();
    const [subdomain, setSubdomain] = useState(project.subdomain || suggestedSubdomain);
    const [visibility, setVisibility] = useState<'public' | 'private'>(
        (project.published_visibility as 'public' | 'private') || 'public'
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('idle');
    const [availabilityErrors, setAvailabilityErrors] = useState<string[]>([]);

    const isAlreadyPublished = project.subdomain !== null;
    const canPublish = canUseSubdomains && (isAlreadyPublished || canCreateMoreSubdomains);

    // Debounced availability check
    const checkAvailability = useCallback(async (value: string) => {
        if (value.length < 3) {
            setAvailabilityStatus('invalid');
            setAvailabilityErrors([t('Subdomain must be at least 3 characters.')]);
            return;
        }

        setAvailabilityStatus('checking');

        try {
            const response = await axios.post('/api/subdomain/check-availability', {
                subdomain: value,
                project_id: project.id,
            });

            if (response.data.available) {
                setAvailabilityStatus('available');
                setAvailabilityErrors([]);
            } else {
                setAvailabilityStatus('unavailable');
                setAvailabilityErrors(response.data.errors || [t('Subdomain is not available.')]);
            }
        } catch {
            setAvailabilityStatus('idle');
        }
    }, [project.id, t]);

    useEffect(() => {
        // Don't check availability if subdomains aren't enabled
        if (!canUseSubdomains) {
            return;
        }

        const timeoutId = setTimeout(() => {
            if (subdomain && subdomain.length >= 3) {
                checkAvailability(subdomain);
            } else if (subdomain.length > 0) {
                setAvailabilityStatus('invalid');
                setAvailabilityErrors([t('Subdomain must be at least 3 characters.')]);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [subdomain, checkAvailability, t, canUseSubdomains]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await axios.post(`/project/${project.id}/publish`, {
                subdomain,
                visibility,
            });

            if (response.data.success) {
                onOpenChange(false);
                if (response.data.url && onPublished) {
                    onPublished(response.data.url);
                }
                router.reload({ only: ['project'] });
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            setError(error.response?.data?.error || 'Failed to publish project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getAvailabilityIcon = () => {
        switch (availabilityStatus) {
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

    if (!canUseSubdomains) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            {t('Upgrade to Publish')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Subdomain publishing is not available on your current plan.')}{' '}
                            {t('Upgrade to a plan with subdomain publishing to share your projects with the world.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t('Close')}
                        </Button>
                        <Button onClick={() => router.visit('/billing/plans')}>
                            {t('View Plans')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        {isAlreadyPublished ? t('Update Published Project') : t('Publish Project')}
                    </DialogTitle>
                    <DialogDescription>
                        {isAlreadyPublished
                            ? t('Update your published project settings.')
                            : t('Make your project accessible via a custom subdomain.')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="subdomain">{t('Subdomain')}</Label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="subdomain"
                                    value={subdomain}
                                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="my-project"
                                    className="pe-8"
                                />
                                <div className="absolute end-2 top-1/2 -translate-y-1/2">
                                    {getAvailabilityIcon()}
                                </div>
                            </div>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                .{baseDomain}
                            </span>
                        </div>
                        {availabilityErrors.length > 0 && availabilityStatus !== 'available' && (
                            <p className="text-xs text-destructive">{availabilityErrors[0]}</p>
                        )}
                        {availabilityStatus === 'available' && (
                            <p className="text-xs text-success">{t('This subdomain is available!')}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="visibility">{t('Visibility')}</Label>
                        <Select
                            value={visibility}
                            onValueChange={(value: 'public' | 'private') => setVisibility(value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4" />
                                        <span>{t('Public')}</span>
                                    </div>
                                </SelectItem>
                                {canUsePrivateVisibility ? (
                                    <SelectItem value="private">
                                        <div className="flex items-center gap-2">
                                            <EyeOff className="h-4 w-4" />
                                            <span>{t('Private')}</span>
                                        </div>
                                    </SelectItem>
                                ) : (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative flex cursor-not-allowed select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                                                <div className="flex items-center gap-2">
                                                    <EyeOff className="h-4 w-4" />
                                                    <span>{t('Private')}</span>
                                                    <Lock className="h-3 w-3 ms-1" />
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t('Upgrade to unlock private visibility')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {visibility === 'public'
                                ? t('Anyone with the link can view your project.')
                                : t('Only you can view your project.')}
                        </p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                !canPublish ||
                                availabilityStatus === 'checking' ||
                                availabilityStatus === 'unavailable' ||
                                availabilityStatus === 'invalid'
                            }
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                            {isAlreadyPublished ? t('Update') : t('Publish')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
