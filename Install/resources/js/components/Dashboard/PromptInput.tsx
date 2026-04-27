import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowRight, ArrowLeft, LayoutTemplate, Palette } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { THEME_PRESETS } from '@/lib/theme-presets';

interface Template {
    id: number;
    name: string;
    description: string | null;
    thumbnail: string | null;
    is_system: boolean;
}

interface PromptInputProps {
    onSubmit: (prompt: string, templateId: number | null, themePreset: string | null) => void;
    disabled?: boolean;
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
            } else {
                setIsPaused(true);
            }
        } else {
            if (displayText.length > 0) {
                const deletingTimer = setTimeout(() => {
                    setDisplayText(displayText.slice(0, -1));
                }, deletingSpeed);
                return () => clearTimeout(deletingTimer);
            } else {
                setTextIndex((prev) => (prev + 1) % texts.length);
                setIsTyping(true);
            }
        }
    }, [displayText, isTyping, isPaused, textIndex, texts, typingSpeed, pauseDuration, deletingSpeed]);

    return displayText;
}

export function PromptInput({
    onSubmit,
    disabled = false,
    suggestions = DEFAULT_SUGGESTIONS,
    typingPrompts = DEFAULT_TYPING_PROMPTS,
    isLoadingSuggestions = false,
    templates = [],
}: PromptInputProps) {
    const { t, isRtl } = useTranslation();
    const [prompt, setPrompt] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const [selectedThemePreset, setSelectedThemePreset] = useState<string>('automatic');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const animatedPlaceholder = useTypingAnimation(typingPrompts);

    // Filter out system templates (only for AI to decide)
    const userSelectableTemplates = templates.filter(t => !t.is_system);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() && !disabled) {
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

    const showAnimatedPlaceholder = !prompt && !isFocused;

    return (
        <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onKeyDown={handleKeyDown}
                            placeholder={isFocused ? t("I want to build...") : ""}
                            disabled={disabled}
                            className="w-full px-4 py-4 text-base resize-none focus:outline-none focus:ring-0 border-0 min-h-[100px] bg-transparent relative z-10 disabled:cursor-not-allowed disabled:opacity-50"
                            rows={3}
                        />
                        {/* Animated placeholder overlay */}
                        {showAnimatedPlaceholder && (
                            <div
                                className="absolute inset-0 px-4 py-4 pointer-events-none text-muted-foreground/60 text-base"
                                onClick={() => textareaRef.current?.focus()}
                            >
                                {animatedPlaceholder}
                                <span className="inline-block w-0.5 h-5 bg-primary/50 ms-0.5 animate-pulse align-middle" />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/50 border-t border-border">
                        {/* Hide keyboard hint on mobile */}
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{t('Press')}</span>
                            <kbd className="px-2 py-0.5 bg-card rounded border text-xs">
                                ⌘ Enter
                            </kbd>
                            <span>{t('to start')}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 ms-auto">
                            {/* Template Selector - always shows "Automatic" */}
                            <Select value={selectedTemplateId?.toString() ?? 'automatic'} onValueChange={(v) => setSelectedTemplateId(v === 'automatic' ? null : parseInt(v))}>
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
                                    {userSelectableTemplates.map((template) => (
                                        <SelectItem key={template.id} value={template.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <LayoutTemplate className="h-4 w-4 shrink-0" />
                                                <span>{template.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Theme Preset Selector */}
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
                            <Button
                                type="submit"
                                disabled={!prompt.trim() || disabled}
                                className="shrink-0"
                            >
                                <span className="hidden sm:inline">{t('Start')}</span>
                                {isRtl ? (
                                    <ArrowLeft className="h-4 w-4 sm:ms-2" />
                                ) : (
                                    <ArrowRight className="h-4 w-4 sm:ms-2" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Suggestions - Marquee */}
            {!disabled && (
                <div className="mt-4 overflow-hidden relative">
                    {/* Gradient fade on edges - RTL aware */}
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
                            {/* Duplicate suggestions for seamless loop */}
                            {[...suggestions, ...suggestions].map((suggestion, index) => (
                                <button
                                    key={`${suggestion}-${index}`}
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
