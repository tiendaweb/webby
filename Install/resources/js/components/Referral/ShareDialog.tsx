import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface ShareData {
    enabled: boolean;
    code?: string;
    shareUrl?: string;
    commissionPercent?: number;
}

interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [data, setData] = useState<ShareData | null>(null);

    useEffect(() => {
        if (open) {
            setLoading(true);
            fetch(route('referral.share-data'))
                .then(res => res.json())
                .then((shareData: ShareData) => {
                    setData(shareData);
                    setLoading(false);
                })
                .catch(() => {
                    toast.error(t('Failed to load referral data'));
                    setLoading(false);
                });
        }
    }, [open, t]);

    const copyToClipboard = async () => {
        if (!data?.shareUrl) return;

        try {
            // Try modern clipboard API first
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(data.shareUrl);
            } else {
                // Fallback for non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = data.shareUrl;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            toast.success(t('Link copied to clipboard!'));
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('Failed to copy link'));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('Share & Earn')}</DialogTitle>
                    <DialogDescription>
                        {data?.enabled
                            ? t('Share your referral link and earn :percent% commission on referral purchases.', { percent: data.commissionPercent ?? 0 })
                            : t('The referral program is currently disabled.')}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : data?.enabled ? (
                    <div className="space-y-2">
                        <Label>{t('Your Referral Link')}</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                value={data.shareUrl}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                                className="shrink-0"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-success" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-4 text-center text-muted-foreground">
                        {t('The referral program is currently not available.')}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
