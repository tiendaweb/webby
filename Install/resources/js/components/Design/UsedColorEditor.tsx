import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Loader2, Paintbrush, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/contexts/LanguageContext';

interface UsedColorFile {
    path: string;
    count: number;
}

interface UsedColor {
    id: string;
    type: string;
    token: string;
    value: string;
    label: string;
    files: UsedColorFile[];
    count: number;
}

interface UsedColorEditorProps {
    projectId: string;
    onChanged?: () => void;
}

function canRenderSwatch(value: string): boolean {
    return /^#[0-9a-fA-F]{3,8}$/.test(value)
        || /^(?:rgba?|hsla?|oklch)\(/i.test(value);
}

function colorInputValue(value: string): string {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
        return `#${value.slice(1).split('').map((char) => `${char}${char}`).join('')}`;
    }

    return '#000000';
}

export function UsedColorEditor({ projectId, onChanged }: UsedColorEditorProps) {
    const { t } = useTranslation();
    const [colors, setColors] = useState<UsedColor[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [paths, setPaths] = useState<Record<string, string>>({});

    const sortedColors = useMemo(() => [...colors].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.token.localeCompare(b.token);
    }), [colors]);

    const loadColors = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get<{ colors: UsedColor[] }>(`/project/${projectId}/used-colors`);
            setColors(response.data.colors);
            setValues((current) => {
                const next = { ...current };
                response.data.colors.forEach((color) => {
                    next[color.id] ??= color.value;
                });
                return next;
            });
            setPaths((current) => {
                const next = { ...current };
                response.data.colors.forEach((color) => {
                    next[color.id] ??= color.files[0]?.path || '';
                });
                return next;
            });
        } catch {
            toast.error(t('Failed to scan colors'));
        } finally {
            setLoading(false);
        }
    }, [projectId, t]);

    useEffect(() => {
        loadColors();
    }, [loadColors]);

    const replaceColor = async (color: UsedColor) => {
        const newValue = values[color.id]?.trim();
        const sourcePath = paths[color.id];

        if (!newValue || !sourcePath) return;

        setSavingId(color.id);
        try {
            const response = await axios.post<{ success: boolean; warning?: string; error?: string }>(`/project/${projectId}/used-colors/replace`, {
                sourcePath,
                type: color.type,
                token: color.token,
                newValue,
            });

            if (!response.data.success) {
                throw new Error(response.data.error || t('Failed to replace color'));
            }

            if (response.data.warning) {
                toast.warning(response.data.warning);
            } else {
                toast.success(t('Color updated'));
            }
            onChanged?.();
            await loadColors();
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? error.response?.data?.error || error.response?.data?.message
                : error instanceof Error ? error.message : null;
            toast.error(message || t('Failed to replace color'));
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="border-t">
            <div className="flex h-12 items-center justify-between px-4">
                <div className="flex min-w-0 items-center gap-2">
                    <Paintbrush className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{t('Used colors')}</h3>
                        <p className="truncate text-xs text-muted-foreground">{t('CSS, Tailwind and generic color tokens found in project files.')}</p>
                    </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={loadColors} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <ScrollArea className="h-80 border-t">
                {loading ? (
                    <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        {t('Scanning colors...')}
                    </div>
                ) : sortedColors.length === 0 ? (
                    <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
                        {t('No editable colors found')}
                    </div>
                ) : (
                    <div className="divide-y">
                        {sortedColors.map((color) => (
                            <div key={color.id} className="space-y-2 px-4 py-3">
                                <div className="flex items-start gap-3">
                                    <span
                                        className="mt-1 h-6 w-6 shrink-0 rounded border"
                                        style={{ background: canRenderSwatch(color.value) ? color.value : undefined }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="truncate font-mono text-xs">{color.token}</span>
                                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                {color.type}
                                            </span>
                                        </div>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {t(':count uses', { count: color.count })} · {color.label}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                                    <Select
                                        value={paths[color.id] || color.files[0]?.path || ''}
                                        onValueChange={(path) => setPaths((current) => ({ ...current, [color.id]: path }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Source file')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {color.files.map((file) => (
                                                <SelectItem key={file.path} value={file.path}>
                                                    {file.path} ({file.count})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex gap-2">
                                        {color.type !== 'tailwind' && (
                                            <Input
                                                type="color"
                                                value={colorInputValue(values[color.id] || color.value)}
                                                onChange={(event) => setValues((current) => ({ ...current, [color.id]: event.target.value }))}
                                                className="h-9 w-12 shrink-0 p-1"
                                            />
                                        )}
                                        <Input
                                            value={values[color.id] ?? color.value}
                                            onChange={(event) => setValues((current) => ({ ...current, [color.id]: event.target.value }))}
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => replaceColor(color)}
                                        disabled={savingId === color.id || !(values[color.id] ?? '').trim() || !(paths[color.id] ?? color.files[0]?.path)}
                                        title={t('Save')}
                                    >
                                        {savingId === color.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
