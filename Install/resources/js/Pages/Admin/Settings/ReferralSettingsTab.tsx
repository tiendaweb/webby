import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import type { ReferralSettings } from './types';

interface Props {
    settings: ReferralSettings;
}

export default function ReferralSettingsTab({ settings }: Props) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        referral_enabled: settings.referral_enabled,
        referral_commission_percent: settings.referral_commission_percent,
        referral_signup_bonus: settings.referral_signup_bonus,
        referral_referee_signup_bonus: settings.referral_referee_signup_bonus,
        referral_min_redemption: settings.referral_min_redemption,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.settings.referral'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Referral settings updated')),
            onError: () => toast.error(t('Failed to update settings')),
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{t('Referral Settings')}</CardTitle>
                        <CardDescription>{t('Configure referral program and commission settings')}</CardDescription>
                    </div>
                    <Switch
                        checked={data.referral_enabled}
                        onCheckedChange={(checked) => setData('referral_enabled', checked)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-6">
                    {/* Commission Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Commission Settings')}</h3>

                        <div className="space-y-2">
                            <Label htmlFor="referral_commission_percent">{t('Commission Percentage')}</Label>
                            <div className="relative max-w-[200px]">
                                <Input
                                    id="referral_commission_percent"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={data.referral_commission_percent}
                                    onChange={(e) => setData('referral_commission_percent', parseInt(e.target.value) || 0)}
                                    className="pe-8"
                                />
                                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('Percentage of referred purchase amount credited to referrer')}
                            </p>
                            {errors.referral_commission_percent && (
                                <p className="text-sm text-destructive">{errors.referral_commission_percent}</p>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Signup Bonuses */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Signup Bonuses')}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="referral_signup_bonus">{t('Referrer Signup Bonus')}</Label>
                                <div className="relative max-w-[200px]">
                                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                        id="referral_signup_bonus"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.referral_signup_bonus}
                                        onChange={(e) => setData('referral_signup_bonus', parseFloat(e.target.value) || 0)}
                                        className="ps-7"
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t('Bonus credited when referred user signs up')}
                                </p>
                                {errors.referral_signup_bonus && (
                                    <p className="text-sm text-destructive">{errors.referral_signup_bonus}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="referral_referee_signup_bonus">{t('New User Build Credits')}</Label>
                                <Input
                                    id="referral_referee_signup_bonus"
                                    type="number"
                                    min="0"
                                    value={data.referral_referee_signup_bonus}
                                    onChange={(e) => setData('referral_referee_signup_bonus', parseInt(e.target.value) || 0)}
                                    className="max-w-[200px]"
                                />
                                <p className="text-sm text-muted-foreground">
                                    {t('Build credits given to referred new users')}
                                </p>
                                {errors.referral_referee_signup_bonus && (
                                    <p className="text-sm text-destructive">{errors.referral_referee_signup_bonus}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Redemption Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">{t('Credit Redemption')}</h3>

                        <div className="space-y-2">
                            <Label htmlFor="referral_min_redemption">{t('Minimum Redemption Amount')}</Label>
                            <div className="relative max-w-[200px]">
                                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                    id="referral_min_redemption"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.referral_min_redemption}
                                    onChange={(e) => setData('referral_min_redemption', parseFloat(e.target.value) || 0)}
                                    className="ps-7"
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('Minimum balance required to redeem referral credits')}
                            </p>
                            {errors.referral_min_redemption && (
                                <p className="text-sm text-destructive">{errors.referral_min_redemption}</p>
                            )}
                        </div>
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
