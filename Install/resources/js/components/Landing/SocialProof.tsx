import { useTranslation } from '@/contexts/LanguageContext';

interface SocialProofProps {
    statistics: {
        usersCount: number;
        projectsCount: number;
    };
    content?: Record<string, unknown>;
}

function formatCount(count: number): string {
    if (count < 100) {
        return '100+';
    }
    if (count >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
    }
    if (count >= 1_000) {
        return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
    }
    return `${count.toLocaleString()}+`;
}

export function SocialProof({ statistics, content }: SocialProofProps) {
    const { t } = useTranslation();

    // Extract content with defaults - DB content takes priority
    const usersLabel = (content?.users_label as string) || t('Happy Users');
    const projectsLabel = (content?.projects_label as string) || t('Projects Created');
    const uptimeLabel = (content?.uptime_label as string) || t('Availability');
    const uptimeValue = (content?.uptime_value as string) || t('High');

    const stats = [
        { value: formatCount(statistics.projectsCount), label: projectsLabel },
        { value: formatCount(statistics.usersCount), label: usersLabel },
        { value: uptimeValue, label: uptimeLabel },
    ];

    return (
        <section className="py-16 lg:py-20 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                                {stat.value}
                            </div>
                            <div className="text-sm md:text-base text-muted-foreground mt-1">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
