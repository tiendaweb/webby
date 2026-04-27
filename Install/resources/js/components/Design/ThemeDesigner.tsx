import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { THEME_PRESETS } from '@/lib/theme-presets';
import { ThemePresetCard } from './ThemePresetCard';

interface ThemeDesignerProps {
    currentTheme: string | null;
    onThemeSelect: (presetId: string) => void;
    onApply: (presetId: string) => Promise<void>;
    isSaving: boolean;
}

export function ThemeDesigner({
    currentTheme,
    onThemeSelect,
    onApply,
    isSaving,
}: ThemeDesignerProps) {
    const { t } = useTranslation();
    const [selectedTheme, setSelectedTheme] = useState(currentTheme || 'default');

    const handleThemeSelect = (presetId: string) => {
        setSelectedTheme(presetId);
        onThemeSelect(presetId);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            <div className="p-4 border-b shrink-0">
                <h2 className="text-lg font-semibold">{t('Choose a Theme')}</h2>
                <p className="text-sm text-muted-foreground">
                    {t('Select a color theme. Changes are previewed in real-time.')}
                </p>
            </div>

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-2">
                    {THEME_PRESETS.map((preset) => (
                        <ThemePresetCard
                            key={preset.id}
                            preset={preset}
                            selected={selectedTheme === preset.id}
                            onClick={() => handleThemeSelect(preset.id)}
                        />
                    ))}
                </div>
            </ScrollArea>

            <div className="p-4 border-t flex items-center justify-between shrink-0">
                <p className="text-sm text-muted-foreground">
                    {selectedTheme !== currentTheme && t('Unsaved changes')}
                </p>
                <Button
                    onClick={() => onApply(selectedTheme)}
                    disabled={isSaving || selectedTheme === currentTheme}
                >
                    {isSaving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                    {t('Apply')}
                </Button>
            </div>
        </div>
    );
}
