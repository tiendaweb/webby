import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslatedPersonas, getIconComponent } from './data';
import { useTranslation } from '@/contexts/LanguageContext';

interface PersonaItem {
    title: string;
    description: string;
    icon: string;
}

interface UseCasesProps {
    content?: Record<string, unknown>;
    items?: PersonaItem[];
    settings?: Record<string, unknown>;
}

export function UseCases({ content, items, settings: _settings }: UseCasesProps = {}) {
    const { t } = useTranslation();

    // Use database items if provided, otherwise fall back to translated defaults
    const personas = items?.length
        ? items.map((item, index) => ({
              id: `persona-${index}`,
              title: item.title,
              description: item.description,
              icon: getIconComponent(item.icon),
          }))
        : getTranslatedPersonas(t);

    // Get content with defaults - DB content takes priority
    const title = (content?.title as string) || t('Built for everyone');
    const subtitle = (content?.subtitle as string) || t("Whether you're a developer, designer, or entrepreneur, our platform helps you build faster and smarter.");

    return (
        <section id="use-cases" className="py-16 lg:py-24 bg-muted/30">
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

                {/* Persona Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {personas.map((persona) => {
                        const Icon = persona.icon;
                        return (
                            <Card
                                key={persona.id}
                                className="group shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center"
                            >
                                <CardHeader className="pb-2">
                                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                                        <Icon className="w-7 h-7 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl">
                                        {persona.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-sm">
                                        {persona.description}
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
