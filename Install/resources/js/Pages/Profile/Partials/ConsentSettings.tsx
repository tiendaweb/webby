import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface ConsentSettingsProps {
    className?: string;
    consents: {
        marketing: boolean;
        analytics: boolean;
        third_party: boolean;
    };
}

export default function ConsentSettings({
    className = '',
    consents,
}: ConsentSettingsProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, recentlySuccessful } = useForm({
        marketing: consents.marketing,
        analytics: consents.analytics,
        third_party: consents.third_party,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('profile.consents'), {
            onSuccess: () => toast.success(t('Preferences saved')),
            onError: () => toast.error(t('Failed to save preferences')),
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-foreground">
                    {t('Privacy & Consent Settings')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('Manage how we use your data and communicate with you.')}
                </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="marketing" className="text-sm font-medium">
                                {t('Marketing Communications')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {t('Receive emails about new features, updates, and promotional offers.')}
                            </p>
                        </div>
                        <Switch
                            id="marketing"
                            checked={data.marketing}
                            onCheckedChange={(checked) => setData('marketing', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="analytics" className="text-sm font-medium">
                                {t('Analytics & Improvements')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {t('Allow us to collect usage data to improve our services.')}
                            </p>
                        </div>
                        <Switch
                            id="analytics"
                            checked={data.analytics}
                            onCheckedChange={(checked) => setData('analytics', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="third_party" className="text-sm font-medium">
                                {t('Third-Party Services')}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {t('Share data with trusted partners for enhanced functionality.')}
                            </p>
                        </div>
                        <Switch
                            id="third_party"
                            checked={data.third_party}
                            onCheckedChange={(checked) => setData('third_party', checked)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button type="submit" disabled={processing}>
                        {processing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        {t('Save Preferences')}
                    </Button>

                    {recentlySuccessful && (
                        <p className="text-sm text-muted-foreground">{t('Saved.')}</p>
                    )}
                </div>
            </form>
        </section>
    );
}
