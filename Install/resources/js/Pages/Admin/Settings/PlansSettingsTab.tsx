import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Save, Info, Loader2, Bot, Server } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PlansSettings, Plan, AiProvider, Builder } from './types';

interface Props {
    settings: PlansSettings;
    plans: Plan[];
    aiProviders: AiProvider[];
    builders: Builder[];
}

export default function PlansSettingsTab({ settings, plans, aiProviders, builders }: Props) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors, transform } = useForm({
        default_plan_id: settings.default_plan_id?.toString() || 'none',
        default_ai_provider_id: settings.default_ai_provider_id?.toString() || 'none',
        default_builder_id: settings.default_builder_id?.toString() || 'none',
    });

    // Transform 'none' back to null for the backend
    transform((data) => ({
        ...data,
        default_plan_id: data.default_plan_id === 'none' ? null : data.default_plan_id,
        default_ai_provider_id: data.default_ai_provider_id === 'none' ? null : data.default_ai_provider_id,
        default_builder_id: data.default_builder_id === 'none' ? null : data.default_builder_id,
    }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.settings.plans'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Plans settings updated')),
            onError: () => toast.error(t('Failed to update settings')),
        });
    };

    const formatPrice = (price: number, period: string) => {
        const formattedPrice = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
        return `${formattedPrice}/${period}`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Plans Settings')}</CardTitle>
                <CardDescription>{t('Configure default plan and system-wide AI settings')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-6">
                    {/* Default Plan */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Default Plan')}</h3>
                        <div className="space-y-2">
                            <Label htmlFor="default_plan_id">{t('Default Plan for New Users')}</Label>
                            <Select
                                value={data.default_plan_id}
                                onValueChange={(value) => setData('default_plan_id', value)}
                            >
                                <SelectTrigger className="max-w-md">
                                    <SelectValue placeholder={t('Select a plan')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('No default plan')}</SelectItem>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id.toString()}>
                                            {plan.name} - {formatPrice(plan.price, plan.billing_period)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                {t('New users will be assigned this plan automatically')}
                            </p>
                            {errors.default_plan_id && <p className="text-sm text-destructive">{errors.default_plan_id}</p>}
                        </div>

                        {plans.length === 0 && (
                            <Alert variant="destructive">
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    {t('No plans available. Create a plan first.')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <Separator />

                    {/* System Defaults */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('System Defaults')}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t('Fallback settings when plans do not specify a provider or builder')}
                        </p>

                        <div className="space-y-2">
                            <Label htmlFor="default_ai_provider_id" className="flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                {t('Default AI Provider')}
                            </Label>
                            <Select
                                value={data.default_ai_provider_id}
                                onValueChange={(value) => setData('default_ai_provider_id', value)}
                            >
                                <SelectTrigger className="max-w-md">
                                    <SelectValue placeholder={t('Select an AI provider')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('No default provider')}</SelectItem>
                                    {aiProviders.map((provider) => (
                                        <SelectItem key={provider.id} value={provider.id.toString()}>
                                            {provider.name} ({provider.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                {t('Used when a plan does not have a specific provider assigned')}
                            </p>
                            {errors.default_ai_provider_id && (
                                <p className="text-sm text-destructive">{errors.default_ai_provider_id}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="default_builder_id" className="flex items-center gap-2">
                                <Server className="h-4 w-4" />
                                {t('Default Builder')}
                            </Label>
                            <Select
                                value={data.default_builder_id}
                                onValueChange={(value) => setData('default_builder_id', value)}
                            >
                                <SelectTrigger className="max-w-md">
                                    <SelectValue placeholder={t('Select a builder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('No default builder')}</SelectItem>
                                    {builders.map((builder) => (
                                        <SelectItem key={builder.id} value={builder.id.toString()}>
                                            {builder.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                {t('Used when a plan does not have a specific builder assigned')}
                            </p>
                            {errors.default_builder_id && (
                                <p className="text-sm text-destructive">{errors.default_builder_id}</p>
                            )}
                        </div>

                        {aiProviders.length === 0 && builders.length === 0 && (
                            <Alert variant="destructive">
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    {t('No AI providers or builders configured. Please add them first.')}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            {processing ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
                            {t('Save Changes')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
