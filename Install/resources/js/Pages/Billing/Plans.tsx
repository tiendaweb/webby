import { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { usePageLoading } from '@/hooks/usePageLoading';
import { PlansSkeleton } from './PlansSkeleton';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Star, ArrowLeft, Loader2, CreditCard, Gift, Copy, Building2, Clock } from 'lucide-react';
import type { Plan, PaymentGateway } from '@/types/billing';
import type { PageProps } from '@/types';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface BankTransferData {
    type: string;
    subscription_id: number;
    reference: string;
    amount: number;
    plan_name: string;
    instructions: string;
}

interface PlansPageProps extends PageProps {
    plans: Plan[];
    paymentGateways: PaymentGateway[];
    currentPlanId: number | null;
    referralCreditBalance: number;
}

export default function Plans({
    plans,
    paymentGateways,
    currentPlanId,
    referralCreditBalance,
}: PlansPageProps) {
    const { auth, flash } = usePage<PlansPageProps & { flash: { bankTransfer?: BankTransferData } }>().props;
    const { t, locale } = useTranslation();
    const { isLoading } = usePageLoading();
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [useReferralCredits, setUseReferralCredits] = useState(false);
    const [bankTransferData, setBankTransferData] = useState<BankTransferData | null>(null);
    const [isBankTransferModalOpen, setIsBankTransferModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Check for bank transfer flash data
    useEffect(() => {
        if (flash?.bankTransfer) {
            setBankTransferData(flash.bankTransfer);
            setIsBankTransferModalOpen(true);
            setIsGatewayModalOpen(false);
            setIsProcessing(false);
        }
    }, [flash?.bankTransfer]);

    const copyInstructions = async () => {
        if (!bankTransferData?.instructions) return;

        try {
            // Try modern clipboard API first (requires secure context)
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(bankTransferData.instructions);
            } else {
                // Fallback for non-secure contexts (HTTP remote access)
                const textArea = document.createElement('textarea');
                textArea.value = bankTransferData.instructions;
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
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        }).format(amount);
    };

    const billingPeriodLabels: Record<string, string> = {
        monthly: t('/month'),
        yearly: t('/year'),
        lifetime: t(' one-time'),
    };

    const handlePlanSelect = (plan: Plan) => {
        if (plan.id === currentPlanId) return;

        // If plan is free (price = 0), subscribe directly
        if (plan.price === 0) {
            handleFreeSubscription(plan);
            return;
        }

        // Otherwise, show gateway selection
        setSelectedPlan(plan);
        setUseReferralCredits(false); // Reset checkbox
        setIsGatewayModalOpen(true);
    };

    const canUseReferralCredits = (plan: Plan) => {
        return referralCreditBalance >= plan.price && plan.price > 0;
    };

    const handleReferralCreditsPayment = () => {
        if (!selectedPlan) return;

        setIsProcessing(true);
        router.post(
            route('payment.initiate'),
            {
                plan_id: selectedPlan.id,
                gateway: 'referral_credits',
                apply_referral_credits: true,
            },
            {
                onError: (errors) => {
                    setIsProcessing(false);
                    const message = Object.values(errors)[0] as string;
                    if (message) toast.error(message);
                },
            }
        );
    };

    const handleFreeSubscription = (plan: Plan) => {
        setIsProcessing(true);
        router.post(
            route('payment.initiate'),
            {
                plan_id: plan.id,
                gateway: 'free',
            },
            {
                onError: (errors) => {
                    const message = Object.values(errors)[0] as string;
                    if (message) toast.error(message);
                },
                onFinish: () => setIsProcessing(false),
            }
        );
    };

    const handleGatewaySelect = (gateway: PaymentGateway) => {
        if (!selectedPlan) return;

        setIsProcessing(true);
        router.post(
            route('payment.initiate'),
            {
                plan_id: selectedPlan.id,
                gateway: gateway.slug,
            },
            {
                onError: (errors) => {
                    setIsProcessing(false);
                    const message = Object.values(errors)[0] as string;
                    if (message) toast.error(message);
                },
            }
        );
    };

    const renderFeatures = (plan: Plan) => {
        const features = [];

        // Project limit
        features.push(
            <li key="projects" className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <span>
                    {plan.max_projects === null
                        ? t('Unlimited projects')
                        : t(':count projects', { count: plan.max_projects })}
                </span>
            </li>
        );

        // Build credits
        const formatCredits = (credits: number): string => {
            if (credits === -1) return t('Unlimited');
            if (credits >= 1_000_000) return `${(credits / 1_000_000).toFixed(0)}M`;
            if (credits >= 1_000) return `${(credits / 1_000).toFixed(0)}K`;
            return credits.toString();
        };
        features.push(
            <li key="credits" className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <span>{t(':count AI credits/month', { count: formatCredits(plan.monthly_build_credits ?? 0) })}</span>
            </li>
        );

        // API key allowance
        if (plan.allow_user_ai_api_key) {
            features.push(
                <li key="apikey" className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{t('Use your own API key')}</span>
                </li>
            );
        }

        // Custom subdomains
        if (plan.enable_subdomains) {
            const subdomainText = plan.max_subdomains_per_user === null
                ? t('Unlimited custom subdomains')
                : t(':count custom subdomains', { count: plan.max_subdomains_per_user });
            features.push(
                <li key="subdomains" className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{subdomainText}</span>
                </li>
            );
        } else {
            features.push(
                <li key="subdomains" className="flex items-start gap-3">
                    <X className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t('Custom subdomains')}</span>
                </li>
            );
        }

        // Private visibility
        if (plan.allow_private_visibility) {
            features.push(
                <li key="private-visibility" className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{t('Private project visibility')}</span>
                </li>
            );
        } else {
            features.push(
                <li key="private-visibility" className="flex items-start gap-3">
                    <X className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t('Private project visibility')}</span>
                </li>
            );
        }

        // Custom features from JSON
        if (Array.isArray(plan.features)) {
            plan.features.forEach((feature, index) => {
                const featureName = typeof feature === 'object' && feature !== null
                    ? (feature as { name: string }).name
                    : feature;
                const isIncluded = typeof feature === 'object' && feature !== null
                    ? (feature as { included: boolean }).included
                    : true;
                // Skip features with empty names
                if (!featureName?.trim()) return;
                features.push(
                    <li key={`custom-${index}`} className="flex items-start gap-3">
                        {isIncluded ? (
                            <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        ) : (
                            <X className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <span className={!isIncluded ? 'text-muted-foreground' : ''}>
                            {featureName}
                        </span>
                    </li>
                );
            });
        }

        return features;
    };

    return (
        <AdminLayout user={auth.user!} title={t('Choose a Plan')}>
            {isLoading ? (
                <PlansSkeleton />
            ) : (
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div className="prose prose-sm dark:prose-invert">
                        <h1 className="text-2xl font-bold text-foreground">
                            {t('Choose a Plan')}
                        </h1>
                        <p className="text-muted-foreground">
                            {t('Select the plan that best fits your needs')}
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/billing">
                            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                            {t('Back')}
                        </Link>
                    </Button>
                </div>

                {/* Plans Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => {
                        const isCurrentPlan = plan.id === currentPlanId;
                        return (
                            <Card
                                key={plan.id}
                                className={`relative flex flex-col ${
                                    isCurrentPlan
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                                        : plan.is_popular
                                        ? 'border-primary shadow-lg'
                                        : ''
                                }`}
                            >
                                {plan.is_popular && !isCurrentPlan && (
                                    <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                                        <Badge className="gap-1 px-3 py-1">
                                            <Star className="h-3 w-3" />
                                            {t('Most Popular')}
                                        </Badge>
                                    </div>
                                )}
                                {isCurrentPlan && (
                                    <div className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                                        <Badge variant="secondary" className="px-3 py-1">
                                            {t('Current Plan')}
                                        </Badge>
                                    </div>
                                )}
                                <CardHeader className="pt-8 pb-4">
                                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                                    <CardDescription className="min-h-[40px]">
                                        {plan.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold">
                                            {formatCurrency(plan.price)}
                                        </span>
                                        <span className="text-muted-foreground text-lg">
                                            {billingPeriodLabels[plan.billing_period]}
                                        </span>
                                    </div>
                                    <ul className="space-y-3 text-sm">
                                        {renderFeatures(plan)}
                                    </ul>
                                </CardContent>
                                <CardFooter className="pt-4">
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        variant={isCurrentPlan ? 'secondary' : plan.is_popular ? 'default' : 'outline'}
                                        disabled={isCurrentPlan || isProcessing}
                                        onClick={() => handlePlanSelect(plan)}
                                    >
                                        {isProcessing && selectedPlan?.id === plan.id ? (
                                            <>
                                                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                                {t('Processing...')}
                                            </>
                                        ) : isCurrentPlan ? (
                                            t('Current Plan')
                                        ) : plan.price === 0 ? (
                                            t('Get Started Free')
                                        ) : (
                                            t('Select Plan')
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

            </div>
            )}

            {/* Payment Gateway Selection Modal */}
            <Dialog open={isGatewayModalOpen} onOpenChange={setIsGatewayModalOpen}>
                <DialogContent className="sm:max-w-md overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            {t('Select Payment Method')}
                        </DialogTitle>
                        <DialogDescription>
                            {t("Choose how you'd like to pay for :plan", { plan: selectedPlan?.name ?? '' })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPlan && (
                        <div className="space-y-4 w-full overflow-hidden">
                            {/* Selected Plan Summary */}
                            <div className="p-4 bg-muted rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold">{selectedPlan.name}</h4>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {selectedPlan.description}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xl font-bold whitespace-nowrap">
                                            {useReferralCredits ? '$0.00' : formatCurrency(selectedPlan.price)}
                                        </p>
                                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                                            {billingPeriodLabels[selectedPlan.billing_period]}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Referral Credits Option */}
                            {canUseReferralCredits(selectedPlan) && (
                                <div className="p-4 bg-success/5 border border-success/20 rounded-lg overflow-hidden">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="use-referral-credits"
                                            checked={useReferralCredits}
                                            onCheckedChange={(checked) => setUseReferralCredits(!!checked)}
                                        />
                                        <label htmlFor="use-referral-credits" className="flex-1 cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <Gift className="h-4 w-4 text-success" />
                                                <span className="font-medium">{t('Pay with Referral Credits')}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {t('Use :amount of your :balance balance', { amount: formatCurrency(selectedPlan.price), balance: formatCurrency(referralCreditBalance) })}
                                            </p>
                                        </label>
                                    </div>
                                    {useReferralCredits && (
                                        <div className="mt-3 p-2 bg-success/10 rounded text-sm font-medium text-success">
                                            {t('Total: :amount — No payment required!', { amount: '$0.00' })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Show balance info if they have some credits but not enough */}
                            {referralCreditBalance > 0 && !canUseReferralCredits(selectedPlan) && (
                                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                                    {t('You have :balance in referral credits. You need :amount to use credits for this plan.', { balance: formatCurrency(referralCreditBalance), amount: formatCurrency(selectedPlan.price) })}
                                </p>
                            )}

                            {/* Payment Options */}
                            {useReferralCredits ? (
                                <Button
                                    className="w-full"
                                    size="lg"
                                    disabled={isProcessing}
                                    onClick={handleReferralCreditsPayment}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                            {t('Processing...')}
                                        </>
                                    ) : (
                                        <>
                                            <Gift className="h-4 w-4 me-2" />
                                            {t('Activate with Referral Credits')}
                                        </>
                                    )}
                                </Button>
                            ) : paymentGateways.length > 0 ? (
                                <div className="space-y-2 w-full overflow-hidden">
                                    {paymentGateways.map((gateway) => (
                                        <Button
                                            key={gateway.slug}
                                            variant="outline"
                                            className="w-full max-w-full justify-between h-auto py-4 gap-3 overflow-hidden"
                                            disabled={isProcessing}
                                            onClick={() => handleGatewaySelect(gateway)}
                                        >
                                            <div className="text-start min-w-0 flex-1">
                                                <div className="font-semibold">{gateway.name}</div>
                                                {gateway.description && (
                                                    <div className="text-xs text-muted-foreground line-clamp-1">
                                                        {gateway.description}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0">
                                                {isProcessing ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <ArrowLeft className="h-4 w-4 rotate-180 rtl:rotate-0" />
                                                )}
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-muted-foreground">
                                        {t('No payment methods available.')}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t('Please contact support.')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Bank Transfer Instructions Dialog */}
            <Dialog open={isBankTransferModalOpen} onOpenChange={setIsBankTransferModalOpen}>
                <DialogContent className="sm:max-w-lg overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {t('Bank Transfer Instructions')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Complete your payment using the details below')}
                        </DialogDescription>
                    </DialogHeader>

                    {bankTransferData && (
                        <div className="space-y-4 w-full overflow-hidden">
                            {/* Payment Summary */}
                            <div className="p-4 bg-muted rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-muted-foreground">{t('Plan')}</p>
                                        <p className="font-semibold">{bankTransferData.plan_name}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm text-muted-foreground">{t('Amount')}</p>
                                        <p className="text-xl font-bold">{formatCurrency(bankTransferData.amount)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Reference Number */}
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm text-muted-foreground">{t('Payment Reference')}</p>
                                        <p className="font-mono font-bold text-primary truncate">{bankTransferData.reference}</p>
                                    </div>
                                    <Badge variant="outline" className="flex-shrink-0 border-warning text-warning gap-1">
                                        <Clock className="h-3 w-3" />
                                        {t('Pending')}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {t('Include this reference in your transfer')}
                                </p>
                            </div>

                            {/* Bank Instructions */}
                            <div className="space-y-2 overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium">{t('Transfer Details')}</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyInstructions}
                                        className="gap-2 h-8"
                                    >
                                        {copied ? (
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
                                <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {bankTransferData.instructions}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button asChild className="flex-1">
                                    <Link href={route('billing.index')}>
                                        {t('View Billing Status')}
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setIsBankTransferModalOpen(false)}
                                >
                                    {t('Close')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
