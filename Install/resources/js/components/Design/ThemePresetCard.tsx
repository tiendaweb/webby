import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import type { ThemePreset } from '@/lib/theme-presets';

interface ThemePresetCardProps {
    preset: ThemePreset;
    selected: boolean;
    onClick: () => void;
}

export function ThemePresetCard({ preset, selected, onClick }: ThemePresetCardProps) {
    const { t } = useTranslation();

    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full p-4 rounded-lg border-2 text-start transition-all',
                selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
            )}
        >
            <div className="flex items-center gap-3">
                {/* Color preview circles */}
                <div className="flex gap-1">
                    {preset.previewColors.map((color, i) => (
                        <div
                            key={i}
                            className="w-6 h-6 rounded-full border border-border/50"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
                <div>
                    <p className="font-medium">{t(preset.name)}</p>
                    <p className="text-xs text-muted-foreground">{t(preset.description)}</p>
                </div>
            </div>
        </button>
    );
}
