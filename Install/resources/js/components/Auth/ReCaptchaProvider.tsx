import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { createContext, PropsWithChildren, useCallback, useContext, useMemo } from 'react';

interface ReCaptchaContextValue {
    getToken: (action: string) => Promise<string>;
    isEnabled: boolean;
}

const ReCaptchaContext = createContext<ReCaptchaContextValue>({
    getToken: async () => '',
    isEnabled: false,
});

export function useReCaptcha() {
    return useContext(ReCaptchaContext);
}

function ReCaptchaContextProvider({ children }: PropsWithChildren) {
    const { executeRecaptcha } = useGoogleReCaptcha();

    const getToken = useCallback(
        async (action: string): Promise<string> => {
            if (!executeRecaptcha) {
                console.warn('reCAPTCHA not ready');
                return '';
            }
            return executeRecaptcha(action);
        },
        [executeRecaptcha]
    );

    const value = useMemo(
        () => ({
            getToken,
            isEnabled: true,
        }),
        [getToken]
    );

    return (
        <ReCaptchaContext.Provider value={value}>
            {children}
        </ReCaptchaContext.Provider>
    );
}

function DisabledReCaptchaProvider({ children }: PropsWithChildren) {
    const value = useMemo(
        () => ({
            getToken: async () => '',
            isEnabled: false,
        }),
        []
    );

    return (
        <ReCaptchaContext.Provider value={value}>
            {children}
        </ReCaptchaContext.Provider>
    );
}

export function ReCaptchaProvider({ children }: PropsWithChildren) {
    const { appSettings } = usePage<PageProps>().props;

    if (!appSettings.recaptcha_enabled || !appSettings.recaptcha_site_key) {
        return <DisabledReCaptchaProvider>{children}</DisabledReCaptchaProvider>;
    }

    return (
        <GoogleReCaptchaProvider reCaptchaKey={appSettings.recaptcha_site_key}>
            <ReCaptchaContextProvider>{children}</ReCaptchaContextProvider>
        </GoogleReCaptchaProvider>
    );
}
