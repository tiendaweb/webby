import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export default function NoSubscriptionAlert() {
    const { t } = useTranslation();

    return (
        <Card>
            <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-primary/10 rounded-full mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{t('No Active Subscription')}</h3>
                    <p className="text-muted-foreground max-w-md">
                        {t('Choose a plan to get started with building your projects.')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
