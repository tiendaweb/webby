import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { ReCaptchaProvider } from '@/components/Auth/ReCaptchaProvider';
import { ReactNode } from 'react';
import ImpersonationBanner from '@/components/ImpersonationBanner';

const appName = (window as Window & { __APP_NAME__?: string }).__APP_NAME__ || import.meta.env.VITE_APP_NAME || 'Webby';

// Wrapper component that includes providers needing Inertia context
function AppWrapper({ children }: { children: ReactNode }) {
    return (
        <LanguageProvider>
            <ReCaptchaProvider>
                <ImpersonationBanner />
                {children}
                <CookieConsentBanner />
            </ReCaptchaProvider>
        </LanguageProvider>
    );
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob(['./Pages/**/*.tsx', '!./Pages/**/__tests__/**', '!./Pages/**/*.test.tsx']),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <App {...props}>
                    {({ Component, props: pageProps }) => (
                        <AppWrapper>
                            <Component {...pageProps} />
                        </AppWrapper>
                    )}
                </App>
            </ThemeProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
