import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/Admin/StatusBadge';
import { Clock, Copy, Check, Building2, Banknote, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { Subscription } from '@/types/billing';
import { useTranslation } from '@/contexts/LanguageContext';

interface BankTransferPendingProps {
    subscription: Subscription;
}

const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(amount);
};

export default function BankTransferPending({ subscription }: BankTransferPendingProps) {
    const { t, locale, isRtl } = useTranslation();
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = async (text: string, field: string) => {
        try {
            // Try modern clipboard API first (requires secure context)
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure contexts (HTTP remote access)
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(field);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Get instructions from subscription metadata
    const instructions = subscription.metadata?.instructions as string | undefined;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {t('Payment Pending')}
                        </CardTitle>
                        <CardDescription>
                            {t('Complete your bank transfer to activate your subscription')}
                        </CardDescription>
                    </div>
                    <StatusBadge status="pending" />
                </div>
            </CardHeader>
            <CardContent>
                {/* Info Banner */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted mb-6">
                    <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium">{t('Action Required')}</p>
                        <p className="text-muted-foreground">
                            {t('Your subscription is pending until we receive and verify your bank transfer.')}
                        </p>
                    </div>
                </div>

                {/* Payment Details Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Plan */}
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t('Plan')}</p>
                        <p className="text-lg font-semibold">{subscription.plan?.name || t('Unknown Plan')}</p>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t('Amount to Pay')}</p>
                        <p className="text-xl font-bold text-primary">
                            {formatCurrency(subscription.amount, 'USD', isRtl ? 'ar-SA' : locale)}
                        </p>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t('Payment Method')}</p>
                        <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{t('Bank Transfer')}</span>
                        </div>
                    </div>

                    {/* Reference */}
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t('Payment Reference')}</p>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-primary">
                                {subscription.external_subscription_id}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(subscription.external_subscription_id || '', 'reference')}
                            >
                                {copied === 'reference' ? (
                                    <Check className="h-3 w-3 text-success" />
                                ) : (
                                    <Copy className="h-3 w-3" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bank Transfer Instructions */}
                {instructions && (
                    <div className="mt-6 pt-6 border-t border-border">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">{t('Transfer Details')}</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => copyToClipboard(instructions, 'instructions')}
                            >
                                {copied === 'instructions' ? (
                                    <>
                                        <Check className="h-3 w-3 text-success" />
                                        {t('Copied!')}
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        {t('Copy')}
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="p-4 rounded-lg bg-muted font-mono text-sm whitespace-pre-wrap">
                            {instructions}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                            {t('Include the payment reference in your transfer for faster processing.')}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
