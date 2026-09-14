import { useState, useEffect, useRef, type DragEvent } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Code2, LayoutTemplate, Loader2, Palette, Save, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { THEME_PRESETS } from '@/lib/theme-presets';

interface Template {
    id: number;
    name: string;
    description: string | null;
    thumbnail: string | null;
    is_system: boolean;
    category?: string | null;
    metadata?: Record<string, string> | null;
}

interface TemplateRecommendation {
    category: string;
    category_label: string;
    theme_preset: string | null;
    templates: Template[];
}

interface PromptInputProps {
    onSubmit: (prompt: string, templateId: number | null, themePreset: string | null) => void;
    onCodeSubmit?: (html: string, name: string | null) => void;
    onTemplateSubmit?: (templateId: number) => void;
    recommendationEndpoint?: string;
    disabled?: boolean;
    creationDisabled?: boolean;
    codeCanvasAvailable?: boolean;
    isCodeSubmitting?: boolean;
    isTemplateSubmitting?: boolean;
    submittingTemplateId?: number | null;
    suggestions?: string[];
    typingPrompts?: string[];
    isLoadingSuggestions?: boolean;
    templates?: Template[];
}

const DEFAULT_SUGGESTIONS = [
    'Build a task management app',
    'Create a portfolio website',
    'Design a landing page',
    'Make an e-commerce store',
];

const DEFAULT_TYPING_PROMPTS = [
    'Build me a modern portfolio website with dark mode...',
    'Create a task management app with drag and drop...',
    'Design a landing page for my SaaS startup...',
    'Make an e-commerce store with cart functionality...',
    'Build a blog platform with markdown support...',
    'Create a dashboard for tracking analytics...',
    'Design a booking system for appointments...',
    'Build a social media feed with infinite scroll...',
];

function useTypingAnimation(texts: string[], typingSpeed = 50, pauseDuration = 2000, deletingSpeed = 30) {
    const [displayText, setDisplayText] = useState('');
    const [textIndex, setTextIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(true);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const currentText = texts[textIndex];

        if (isPaused) {
            const pauseTimer = setTimeout(() => {
                setIsPaused(false);
                setIsTyping(false);
            }, pauseDuration);
            return () => clearTimeout(pauseTimer);
        }

        if (isTyping) {
            if (displayText.length < currentText.length) {
                const typingTimer = setTimeout(() => {
                    setDisplayText(currentText.slice(0, displayText.length + 1));
                }, typingSpeed);
                return () => clearTimeout(typingTimer);
            }
            const pauseStartTimer = setTimeout(() => setIsPaused(true), 0);
            return () => clearTimeout(pauseStartTimer);
        } else if (displayText.length > 0) {
            const deletingTimer = setTimeout(() => {
                setDisplayText(displayText.slice(0, -1));
            }, deletingSpeed);
            return () => clearTimeout(deletingTimer);
        } else {
            const nextTextTimer = setTimeout(() => {
                setTextIndex((prev) => (prev + 1) % texts.length);
                setIsTyping(true);
            }, 0);
            return () => clearTimeout(nextTextTimer);
        }
    }, [displayText, isTyping, isPaused, textIndex, texts, typingSpeed, pauseDuration, deletingSpeed]);

    return displayText;
}

export function PromptInput({
    onSubmit,
    onCodeSubmit,
    onTemplateSubmit,
    recommendationEndpoint = '/create/template-recommendations',
    disabled = false,
    creationDisabled = false,
    codeCanvasAvailable = false,
    isCodeSubmitting = false,
    isTemplateSubmitting = false,
    submittingTemplateId = null,
    suggestions = DEFAULT_SUGGESTIONS,
    typingPrompts = DEFAULT_TYPING_PROMPTS,
    isLoadingSuggestions = false,
    templates = [],
}: PromptInputProps) {
    const { t, isRtl } = useTranslation();
    const [prompt, setPrompt] = useState('');
    const [htmlCode, setHtmlCode] = useState('');
    const [codeProjectName, setCodeProjectName] = useState('');
    const [mode, setMode] = useState<'prompt' | 'code' | 'templates'>('prompt');
    const [isFocused, setIsFocused] = useState(false);
    const [isCodeDragActive, setIsCodeDragActive] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [selectedThemePreset, setSelectedThemePreset] = useState<string>('automatic');
    const [recommendation, setRecommendation] = useState<TemplateRecommendation | null>(null);
    const [isRecommending, setIsRecommending] = useState(false);
    const [manualTemplateSelection, setManualTemplateSelection] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const selectedThemePresetRef = useRef(selectedThemePreset);

    const animatedPlaceholder = useTypingAnimation(typingPrompts);
    const orderedTemplates = recommendation?.templates?.length
        ? [
            ...recommendation.templates,
            ...templates.filter(
                (template) => !recommendation.templates.some((recommended) => recommended.id === template.id)
            ),
        ]
        : templates;

    const showTemplatesTab = codeCanvasAvailable && templates.length > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isCodeMode) {
            if (htmlCode.trim() && onCodeSubmit && !isCodeSubmitting && !creationDisabled) {
                onCodeSubmit(htmlCode.trim(), codeProjectName.trim() || null);
            }
            return;
        }

        if (prompt.trim() && !disabled && !creationDisabled) {
            const themeToSubmit = selectedThemePreset === 'automatic' ? null : selectedThemePreset;
            onSubmit(prompt.trim(), selectedTemplateId, themeToSubmit);
            setPrompt('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    const loadHtmlFile = async (file: File) => {
        const name = file.name.toLowerCase();
        const isHtml = name.endsWith('.html') || name.endsWith('.htm') || file.type === 'text/html';

        if (!isHtml) {
            return;
        }

        setHtmlCode(await file.text());
        setCodeProjectName(file.name.replace(/\.(html|htm)$/i, ''));
    };

    const handleCodeDrop = async (event: DragEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsCodeDragActive(false);

        const file = Array.from(event.dataTransfer.files).find((item) => {
            const name = item.name.toLowerCase();
            return name.endsWith('.html') || name.endsWith('.htm') || item.type === 'text/html';
        });

        if (file) {
            await loadHtmlFile(file);
        }
    };

    const showAnimatedPlaceholder = !prompt && !isFocused;
    // When AI is disabled, always default to templates (if available) or code
    const activeMode = codeCanvasAvailable
        ? (disabled ? (mode === 'prompt' ? (showTemplatesTab ? 'templates' : 'code') : mode) : mode)
        : 'prompt';
    const isCodeMode = activeMode === 'code';
    const isTemplatesMode = activeMode === 'templates';

    useEffect(() => {
        selectedThemePresetRef.current = selectedThemePreset;
    }, [selectedThemePreset]);

    useEffect(() => {
        if (disabled || isCodeMode) {
            setRecommendation(null);
            setIsRecommending(false);
            return;
        }

        const value = prompt.trim();
        if (value.length < 6) {
            setRecommendation(null);
            setIsRecommending(false);
            return;
        }

        const controller = new AbortController();
        setIsRecommending(true);

        const timer = window.setTimeout(async () => {
            try {
                const response = await axios.post<TemplateRecommendation>(
                    recommendationEndpoint,
                    { prompt: value },
                    { signal: controller.signal }
                );

                setRecommendation(response.data);
                if (!manualTemplateSelection) {
                    setSelectedTemplateId(response.data.templates[0]?.id ?? null);
                    if (response.data.theme_preset && selectedThemePresetRef.current === 'automatic') {
                        setSelectedThemePreset(response.data.theme_preset);
                    }
                }
            } catch {
                if (!controller.signal.aborted) {
                    setRecommendation(null);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsRecommending(false);
                }
            }
        }, 350);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [disabled, isCodeMode, manualTemplateSelection, prompt, recommendationEndpoint]);

    return (
        <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
                    {codeCanvasAvailable && (
                        <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-3 py-2">
                            {!disabled && (
                                <Button
                                    type="button"
                                    variant={!isCodeMode && !isTemplatesMode ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onClick={() => setMode('prompt')}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    {t('Assistant')}
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant={isCodeMode ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => setMode('code')}
                            >
                                <Code2 className="h-4 w-4" />
                                {t('Code')}
                            </Button>
                            {showTemplatesTab && (
                                <Button
                                    type="button"
                                    variant={isTemplatesMode ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onClick={() => setMode('templates')}
                                >
                                    <LayoutTemplate className="h-4 w-4" />
                                    {t('Templates')}
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="relative">
                        {isTemplatesMode ? (
                            <div className="p-4 max-h-[420px] overflow-y-auto">
                                {orderedTemplates.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8 text-sm">
                                        {t('No templates available.')}
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {orderedTemplates.map((template) => {
                                            const lang = template.metadata?.language ?? template.metadata?.framework ?? null;
                                            const isLoading = isTemplateSubmitting && submittingTemplateId === template.id;
                                            const isRecommended = recommendation?.templates.some((recommended) => recommended.id === template.id);
                                            return (
                                                <div
                                                    key={template.id}
                                                    className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 hover:bg-muted/60 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-medium text-sm leading-tight">{template.name}</p>
                                                        <div className="flex items-center gap-1.5">
                                                            {isRecommended && (
                                                                <span className="shrink-0 text-[10px] font-medium bg-primary/10 text-primary rounded px-1.5 py-0.5">
                                                                    {t('Recommended')}
                                                                </span>
                                                            )}
                                                            {lang && (
                                                                <span className="shrink-0 text-[10px] font-medium bg-primary/10 text-primary rounded px-1.5 py-0.5">
                                                                    {lang}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {template.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                            {template.description}
                                                        </p>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="mt-auto w-full"
                                                        disabled={isTemplateSubmitting || creationDisabled}
                                                        onClick={() => {
                                                            setManualTemplateSelection(true);
                                                            setSelectedTemplateId(template.id);
                                                            onTemplateSubmit?.(template.id);
                                                        }}
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
                                                        ) : (
                                                            <LayoutTemplate className="h-3.5 w-3.5 me-1.5" />
                                                        )}
                                                        {isLoading ? t('Creating...') : t('Use Template')}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : isCodeMode ? (
                            <div>
                                <input
                                    value={codeProjectName}
                                    onChange={(e) => setCodeProjectName(e.target.value)}
                                    placeholder={t('Project name')}
                                    className="w-full border-0 border-b border-border bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-0"
                                    maxLength={255}
                                />
                                <textarea
                                    value={htmlCode}
                                    onChange={(e) => setHtmlCode(e.target.value)}
                                    onDragEnter={() => setIsCodeDragActive(true)}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsCodeDragActive(true);
                                    }}
                                    onDragLeave={() => setIsCodeDragActive(false)}
                                    onDrop={handleCodeDrop}
                                    onKeyDown={handleKeyDown}
                                    placeholder="<!doctype html>"
                                    className={`w-full min-h-[280px] resize-y border-0 bg-transparent px-4 py-4 font-mono text-sm focus:outline-none focus:ring-0 ${
                                        isCodeDragActive ? 'bg-primary/5 ring-2 ring-inset ring-primary/40' : ''
                                    }`}
                                    spellCheck={false}
                                />
                            </div>
                        ) : (
                            <>
                                <textarea
                                    ref={textareaRef}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isFocused ? t('I want to build...') : ''}
                                    disabled={disabled}
                                    className="w-full px-4 py-4 text-base resize-none focus:outline-none focus:ring-0 border-0 min-h-[100px] bg-transparent relative z-10 disabled:cursor-not-allowed disabled:opacity-50"
                                    rows={3}
                                />
                                {showAnimatedPlaceholder && (
                                    <div
                                        className="absolute inset-0 px-4 py-4 pointer-events-none text-muted-foreground/60 text-base"
                                        onClick={() => textareaRef.current?.focus()}
                                    >
                                        {animatedPlaceholder}
                                        <span className="inline-block w-0.5 h-5 bg-primary/50 ms-0.5 animate-pulse align-middle" />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {!isCodeMode && recommendation && (
                        <div className="px-4 py-2 border-t bg-primary/5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm min-w-0">
                                {isRecommending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                                <span className="text-muted-foreground">{t('Recommended')}</span>
                                <span className="font-medium truncate">{recommendation.templates[0]?.name ?? t('Automatic')}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-background border text-muted-foreground">
                                    {recommendation.category_label}
                                </span>
                            </div>
                            {recommendation.templates[0] && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7"
                                    onClick={() => {
                                        const recommended = recommendation.templates[0];
                                        setManualTemplateSelection(true);
                                        setSelectedTemplateId(recommended.id);
                                        setSelectedThemePreset(recommendation.theme_preset ?? 'automatic');
                                    }}
                                >
                                    {t('Use recommendation')}
                                </Button>
                            )}
                        </div>
                    )}

                    {!isTemplatesMode && (
                    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/50 border-t border-border">
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{t('Press')}</span>
                            <kbd className="px-2 py-0.5 bg-card rounded border text-xs">
                                ⌘ Enter
                            </kbd>
                            <span>{isCodeMode ? t('to save') : t('to start')}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 ms-auto">
                            {!isCodeMode && (
                                <>
                                    <Select
                                        value={selectedTemplateId?.toString() ?? 'automatic'}
                                        onValueChange={(v) => {
                                            const nextTemplateId = v === 'automatic' ? null : parseInt(v);
                                            setManualTemplateSelection(nextTemplateId !== null);
                                            setSelectedTemplateId(nextTemplateId);
                                        }}
                                    >
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="automatic">
                                                <div className="flex items-center gap-2">
                                                    <LayoutTemplate className="h-4 w-4 shrink-0" />
                                                    <span>{t('Automatic')}</span>
                                                </div>
                                            </SelectItem>
                                            {orderedTemplates.map((template) => (
                                                <SelectItem key={template.id} value={template.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <LayoutTemplate className="h-4 w-4 shrink-0" />
                                                        <span>{template.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedThemePreset} onValueChange={setSelectedThemePreset}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="automatic">
                                                <div className="flex items-center gap-2">
                                                    <Palette className="h-4 w-4 shrink-0" />
                                                    <span>{t('Automatic')}</span>
                                                </div>
                                            </SelectItem>
                                            {THEME_PRESETS.map((preset) => (
                                                <SelectItem key={preset.id} value={preset.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-0.5">
                                                            {preset.previewColors.slice(0, 3).map((color, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="w-3 h-3 rounded-full border border-border/50"
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span>{t(preset.name)}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </>
                            )}
                            <Button
                                type="submit"
                                disabled={isCodeMode ? !htmlCode.trim() || !onCodeSubmit || isCodeSubmitting || creationDisabled : !prompt.trim() || disabled || creationDisabled}
                                className="shrink-0"
                            >
                                {isCodeMode ? (
                                    <>
                                        {isCodeSubmitting ? (
                                            <Loader2 className="h-4 w-4 sm:me-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 sm:me-2" />
                                        )}
                                        <span className="hidden sm:inline">{t('Save & Publish')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="hidden sm:inline">{t('Start with Assistant')}</span>
                                        {isRtl ? (
                                            <ArrowLeft className="h-4 w-4 sm:ms-2" />
                                        ) : (
                                            <ArrowRight className="h-4 w-4 sm:ms-2" />
                                        )}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                    )}
                </div>
            </form>

            {!disabled && !isCodeMode && (
                <div className="mt-4 overflow-hidden relative">
                    <div className="absolute start-0 top-0 bottom-0 w-12 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
                    <div className="absolute end-0 top-0 bottom-0 w-12 ltr:bg-gradient-to-l rtl:bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                    {isLoadingSuggestions ? (
                        <div className="flex items-center justify-center gap-3">
                            <Skeleton className="h-8 w-40 rounded-full" />
                            <Skeleton className="h-8 w-36 rounded-full" />
                            <Skeleton className="h-8 w-32 rounded-full" />
                            <Skeleton className="h-8 w-44 rounded-full" />
                        </div>
                    ) : (
                        <div className={`flex gap-3 hover:[animation-play-state:paused] ${isRtl ? 'animate-marquee-rtl' : 'animate-marquee'}`}>
                            {[...suggestions, ...suggestions].map((suggestion, index) => (
                                <button
                                    key={`${suggestion}-${index}`}
                                    type="button"
                                    onClick={() => setPrompt(suggestion)}
                                    className="text-sm px-4 py-2 rounded-full bg-card hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors shadow-sm whitespace-nowrap shrink-0"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
