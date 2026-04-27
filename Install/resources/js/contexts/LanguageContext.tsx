import {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useMemo,
    ReactNode,
} from 'react';
import { usePage, router } from '@inertiajs/react';

interface Language {
    code: string;
    country_code: string;
    name: string;
    native_name: string;
    is_rtl: boolean;
}

interface LocaleData {
    current: string;
    isRtl: boolean;
    available: Language[];
}

interface LanguageContextType {
    locale: string;
    isRtl: boolean;
    availableLanguages: Language[];
    setLocale: (locale: string) => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
    undefined
);

const STORAGE_KEY = 'app-locale';
const RTL_STORAGE_KEY = 'app-locale-rtl';

interface LanguageProviderProps {
    children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
    const props = usePage().props as {
        locale?: LocaleData;
        translations?: Record<string, string>;
    };

    const locale = props.locale?.current ?? 'en';
    const isRtl = props.locale?.isRtl ?? false;
    const availableLanguages = useMemo(
        () => props.locale?.available ?? [],
        [props.locale?.available]
    );
    const translations = useMemo(
        () => props.translations ?? {},
        [props.translations]
    );

    // Apply RTL and lang to document
    useEffect(() => {
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = locale;
        localStorage.setItem(STORAGE_KEY, locale);
        localStorage.setItem(RTL_STORAGE_KEY, String(isRtl));
    }, [isRtl, locale]);

    const setLocale = useCallback((newLocale: string) => {
        // Store locale and RTL status in localStorage
        localStorage.setItem(STORAGE_KEY, newLocale);
        const newLanguage = availableLanguages.find(
            (lang) => lang.code === newLocale
        );
        localStorage.setItem(RTL_STORAGE_KEY, String(newLanguage?.is_rtl ?? false));

        router.post(
            '/locale',
            { locale: newLocale },
            {
                preserveState: false,
                preserveScroll: true,
            }
        );
    }, [availableLanguages]);

    const t = useMemo(() => {
        return (
            key: string,
            replacements?: Record<string, string | number>
        ): string => {
            let translation = translations?.[key] ?? key;

            if (replacements) {
                Object.entries(replacements).forEach(([k, v]) => {
                    translation = translation.replace(`:${k}`, String(v));
                });
            }

            return translation;
        };
    }, [translations]);

    const value = useMemo(
        () => ({
            locale,
            isRtl,
            availableLanguages,
            setLocale,
            t,
        }),
        [locale, isRtl, availableLanguages, setLocale, t]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Convenience hook for translations only
export function useTranslation() {
    const { t, locale, isRtl } = useLanguage();
    return { t, locale, isRtl };
}
