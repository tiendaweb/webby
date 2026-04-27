import { Card, CardContent } from '@/components/ui/card';
import { getTranslatedCategories, getIconComponent } from './data';
import { useTranslation } from '@/contexts/LanguageContext';

interface CategoryItem {
    name: string;
    icon: string;
}

interface CategoryGalleryProps {
    content?: Record<string, unknown>;
    items?: CategoryItem[];
    settings?: Record<string, unknown>;
}

export function CategoryGallery({ content, items, settings: _settings }: CategoryGalleryProps = {}) {
    const { t } = useTranslation();

    // Use database items if provided, otherwise fall back to translated defaults
    const categories = items?.length
        ? items.map((item) => ({
              name: item.name,
              icon: getIconComponent(item.icon),
          }))
        : getTranslatedCategories(t);

    // Get content with defaults - DB content takes priority
    const title = (content?.title as string) || t('What will you build?');
    const subtitle = (content?.subtitle as string) || t('From landing pages to complex web applications, explore what you can create.');

    return (
        <section className="py-16 lg:py-24">
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

                {/* Category Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {categories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <Card
                                key={category.name}
                                className="group cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
                            >
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                                        <Icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <h3 className="font-medium text-sm">
                                        {category.name}
                                    </h3>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
