import { useState, useRef, useEffect, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import * as Flags from 'country-flag-icons/react/3x2';

type FlagCode = keyof typeof Flags;

function FlagIcon({ code, className }: { code: string; className?: string }) {
    const FlagComponent = Flags[code as FlagCode];
    if (!FlagComponent) {
        return <Globe className={cn('h-4 w-4', className)} />;
    }
    return <FlagComponent className={cn('h-4 w-5 rounded-sm', className)} />;
}

export function LanguageSelector() {
    const { locale, availableLanguages, setLocale } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLanguage = availableLanguages.find((l) => l.code === locale);

    // Calculate dropdown position based on available space
    const calculatePosition = useCallback(() => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const dropdownHeight = Math.min(availableLanguages.length * 36 + 8, 300); // Estimate height
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Prefer bottom, but use top if not enough space below
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            setPosition('top');
        } else {
            setPosition('bottom');
        }
    }, [availableLanguages.length]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    if (availableLanguages.length <= 1) {
        return null;
    }

    const handleSelect = (code: string) => {
        setLocale(code);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <Button
                variant="ghost"
                size="icon"
                aria-label="Select language"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                onClick={() => {
                    if (!isOpen) calculatePosition();
                    setIsOpen(!isOpen);
                }}
            >
                {currentLanguage?.country_code ? (
                    <FlagIcon code={currentLanguage.country_code} />
                ) : (
                    <Globe className="h-4 w-4" />
                )}
            </Button>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    role="menu"
                    className={cn(
                        'absolute end-0 z-50 min-w-[8rem] max-h-[300px] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
                        position === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
                    )}
                >
                    {availableLanguages.map((language) => (
                        <button
                            key={language.code}
                            role="menuitem"
                            onClick={() => handleSelect(language.code)}
                            className={cn(
                                'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                                'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                                locale === language.code && 'bg-accent'
                            )}
                        >
                            <FlagIcon code={language.country_code} className="me-2" />
                            <span>{language.native_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
