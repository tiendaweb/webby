import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useChatSounds, SoundSettings, SoundStyle } from '@/hooks/useChatSounds';
import { useTranslation } from '@/contexts/LanguageContext';

interface SoundSettingsCardProps {
    settings: SoundSettings;
    soundStyles: SoundStyle[];
    className?: string;
}

export default function SoundSettingsCard({
    settings,
    soundStyles,
    className = '',
}: SoundSettingsCardProps) {
    const { t } = useTranslation();
    const { data, setData, put, processing, recentlySuccessful } = useForm({
        sounds_enabled: settings.enabled,
        sound_style: settings.style,
        sound_volume: settings.volume,
    });

    const styleDescriptions: Record<SoundStyle, string> = {
        minimal: t('Soft, professional notification sounds'),
        playful: t('Bouncy, cheerful sounds with arpeggios'),
        retro: t('8-bit style beeps and chiptune effects'),
        'sci-fi': t('Futuristic FM synthesis and laser sounds'),
    };

    const styleLabels: Record<SoundStyle, string> = {
        minimal: t('Minimal'),
        playful: t('Playful'),
        retro: t('Retro'),
        'sci-fi': t('Sci-Fi'),
    };

    const { previewAllSounds, isSupported } = useChatSounds({
        settings: {
            enabled: true, // Always enabled for preview
            style: data.sound_style as SoundStyle,
            volume: data.sound_volume,
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/profile/sound-settings', {
            onSuccess: () => {
                toast.success(t('Sound settings updated'));
            },
            onError: () => {
                toast.error(t('Failed to update sound settings'));
            },
        });
    };

    const handlePreview = () => {
        previewAllSounds(data.sound_style as SoundStyle);
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-foreground">
                    {t('Chat Sounds')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('Play notification sounds during AI chat interactions.')}
                </p>
            </header>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="sounds-enabled">{t('Enable chat sounds')}</Label>
                        <p className="text-sm text-muted-foreground">
                            {t('Receive audio feedback for messages and actions.')}
                        </p>
                    </div>
                    <Switch
                        id="sounds-enabled"
                        checked={data.sounds_enabled}
                        onCheckedChange={(checked) => setData('sounds_enabled', checked)}
                    />
                </div>

                {/* Options (shown when enabled) */}
                {data.sounds_enabled && (
                    <div className="space-y-4 pt-4 border-t">
                        {/* Sound Style */}
                        <div className="space-y-2">
                            <Label htmlFor="sound-style">{t('Sound Style')}</Label>
                            <Select
                                value={data.sound_style}
                                onValueChange={(value) => setData('sound_style', value as SoundStyle)}
                            >
                                <SelectTrigger id="sound-style">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {soundStyles.map((style) => (
                                        <SelectItem key={style} value={style}>
                                            {styleLabels[style]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                {styleDescriptions[data.sound_style as SoundStyle]}
                            </p>
                        </div>

                        {/* Volume */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="sound-volume">{t('Volume')}</Label>
                                <span className="text-sm text-muted-foreground">
                                    {data.sound_volume}%
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Slider
                                    id="sound-volume"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={[data.sound_volume]}
                                    onValueChange={([value]) => setData('sound_volume', value)}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreview}
                                    disabled={!isSupported}
                                >
                                    <Play className="h-4 w-4 me-1" />
                                    {t('Preview')}
                                </Button>
                            </div>
                        </div>

                        {!isSupported && (
                            <p className="text-sm text-warning">
                                {t('Your browser does not support Web Audio API. Sound effects will not be available.')}
                            </p>
                        )}
                    </div>
                )}

                {/* Save Button */}
                <div className="flex items-center gap-4">
                    <Button type="submit" disabled={processing}>
                        {processing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                        {t('Save Settings')}
                    </Button>

                    {recentlySuccessful && (
                        <p className="text-sm text-muted-foreground animate-in fade-in">
                            {t('Saved.')}
                        </p>
                    )}
                </div>
            </form>
        </section>
    );
}
