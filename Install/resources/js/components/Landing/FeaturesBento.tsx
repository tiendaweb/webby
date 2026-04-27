import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslatedFeatures, getIconComponent } from './data';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface FeatureItem {
    title: string;
    description: string;
    icon: string;
    size?: 'large' | 'medium' | 'small';
    image_url?: string | null;
}

interface FeaturesBentoProps {
    content?: Record<string, unknown>;
    items?: FeatureItem[];
    settings?: Record<string, unknown>;
}

export function FeaturesBento({ content, items, settings: _settings }: FeaturesBentoProps = {}) {
    const { t } = useTranslation();

    // Use database items if provided, otherwise fall back to translated defaults
    const features = items?.length
        ? items.map((item, index) => ({
              id: index + 1,
              title: item.title,
              description: item.description,
              icon: getIconComponent(item.icon),
              size: item.size || 'small',
              image_url: item.image_url || null,
          }))
        : getTranslatedFeatures(t);

    // Get content with defaults - DB content takes priority
    const title = (content?.title as string) || t('Everything you need to build');
    const subtitle = (content?.subtitle as string) || t("From idea to deployment, we've got you covered with powerful features designed for modern development.");
    return (
        <section id="features" className="py-16 lg:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                        {title}
                    </h2>
                    <p className="text-lg text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <Card
                                key={feature.id}
                                className={cn(
                                    'group shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1',
                                    feature.size === 'large' && 'md:col-span-2 lg:row-span-2',
                                    feature.size === 'medium' && 'lg:col-span-2'
                                )}
                            >
                                <CardHeader
                                    className={cn(
                                        feature.size === 'large' && 'pb-0'
                                    )}
                                >
                                    {feature.image_url ? (
                                        <div className="mb-4 rounded-lg overflow-hidden">
                                            <img
                                                src={feature.image_url}
                                                alt={feature.title}
                                                className={cn(
                                                    'w-full h-auto object-cover',
                                                    feature.size === 'large' && 'max-h-48',
                                                    feature.size === 'medium' && 'max-h-32',
                                                    feature.size === 'small' && 'max-h-24'
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className={cn(
                                                'w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors',
                                                feature.size === 'large' && 'w-16 h-16'
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    'w-6 h-6 text-primary',
                                                    feature.size === 'large' && 'w-8 h-8'
                                                )}
                                            />
                                        </div>
                                    )}
                                    <CardTitle
                                        className={cn(
                                            'text-lg',
                                            feature.size === 'large' && 'text-2xl'
                                        )}
                                    >
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription
                                        className={cn(
                                            'text-sm',
                                            feature.size === 'large' && 'text-base'
                                        )}
                                    >
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
