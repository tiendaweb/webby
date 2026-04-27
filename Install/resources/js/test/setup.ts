import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock LanguageContext globally for all tests
// This mock handles interpolation (e.g., :count) and pluralization
const mockTranslate = (key: string, params?: Record<string, unknown>) => {
    let result = key;
    if (params) {
        // Handle pluralization for :count pattern
        if ('count' in params && typeof params.count === 'number') {
            const count = params.count;
            // Simple pluralization: replace ':count X changes' with proper singular/plural
            if (count === 1 && result.includes(':count') && result.includes('changes')) {
                result = result.replace('changes', 'change');
            }
        }
        // Replace interpolation placeholders like :key with their values
        Object.entries(params).forEach(([paramKey, paramValue]) => {
            result = result.replace(`:${paramKey}`, String(paramValue));
        });
    }
    return result;
};

vi.mock('@/contexts/LanguageContext', () => ({
    useTranslation: () => ({
        t: mockTranslate,
        locale: 'en',
        isRtl: false,
    }),
    useLanguage: () => ({
        t: mockTranslate,
        locale: 'en',
        isRtl: false,
        availableLanguages: [],
        setLocale: vi.fn(),
    }),
    LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock ResizeObserver (used by Radix UI components)
class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

// Mock matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
