import { useState, useEffect, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PageProps } from '@/types';
import { X } from 'lucide-react';

interface ConsentPreferences {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
}

const CONSENT_STORAGE_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0';

function getStoredConsent(): { preferences: ConsentPreferences; hasValidConsent: boolean } {
    const defaultPreferences: ConsentPreferences = {
        essential: true,
        analytics: false,
        marketing: false,
        functional: false,
    };

    if (typeof window === 'undefined') {
        return { preferences: defaultPreferences, hasValidConsent: false };
    }

    try {
        const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (storedConsent) {
            const parsed = JSON.parse(storedConsent);
            if (parsed.version === CONSENT_VERSION) {
                return { preferences: parsed.preferences, hasValidConsent: true };
            }
        }
    } catch {
        // Invalid stored consent
    }

    return { preferences: defaultPreferences, hasValidConsent: false };
}

export default function CookieConsentBanner() {
    const { appSettings, auth } = usePage<PageProps>().props;

    const initialState = useMemo(() => getStoredConsent(), []);
    const [showBanner, setShowBanner] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [preferences, setPreferences] = useState<ConsentPreferences>(initialState.preferences);

    useEffect(() => {
        // Only show if cookie consent is enabled and no valid consent exists
        if (!appSettings.cookie_consent_enabled || initialState.hasValidConsent) {
            return;
        }

        // Show banner after a short delay for better UX
        const timer = setTimeout(() => setShowBanner(true), 1000);
        return () => clearTimeout(timer);
    }, [appSettings.cookie_consent_enabled, initialState.hasValidConsent]);

    const saveConsent = (prefs: ConsentPreferences) => {
        const consentData = {
            version: CONSENT_VERSION,
            preferences: prefs,
            timestamp: new Date().toISOString(),
        };

        // Save to localStorage
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));

        // If user is logged in, also save to database
        if (auth.user) {
            router.post(
                route('cookie-consent.store'),
                {
                    analytics: prefs.analytics,
                    marketing: prefs.marketing,
                    functional: prefs.functional,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                }
            );
        }

        setShowBanner(false);
        setShowPreferences(false);
    };

    const handleAcceptAll = () => {
        const allAccepted: ConsentPreferences = {
            essential: true,
            analytics: true,
            marketing: true,
            functional: true,
        };
        setPreferences(allAccepted);
        saveConsent(allAccepted);
    };

    const handleAcceptEssential = () => {
        const essentialOnly: ConsentPreferences = {
            essential: true,
            analytics: false,
            marketing: false,
            functional: false,
        };
        setPreferences(essentialOnly);
        saveConsent(essentialOnly);
    };

    const handleSavePreferences = () => {
        saveConsent(preferences);
    };

    if (!showBanner) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50">
            {showPreferences ? (
                <Card className="mx-4 sm:mx-auto max-w-2xl mb-4">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Cookie Preferences</CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPreferences(false)}
                                className="h-8 w-8 -mr-2"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 -mt-2">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Essential Cookies</Label>
                                <p className="text-xs text-muted-foreground">
                                    Required for the website to function properly.
                                </p>
                            </div>
                            <Switch checked disabled />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Analytics Cookies</Label>
                                <p className="text-xs text-muted-foreground">
                                    Help us understand how visitors interact with our website.
                                </p>
                            </div>
                            <Switch
                                checked={preferences.analytics}
                                onCheckedChange={(checked) =>
                                    setPreferences((prev) => ({ ...prev, analytics: checked }))
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Marketing Cookies</Label>
                                <p className="text-xs text-muted-foreground">
                                    Used to deliver personalized advertisements.
                                </p>
                            </div>
                            <Switch
                                checked={preferences.marketing}
                                onCheckedChange={(checked) =>
                                    setPreferences((prev) => ({ ...prev, marketing: checked }))
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Functional Cookies</Label>
                                <p className="text-xs text-muted-foreground">
                                    Enable enhanced functionality and personalization.
                                </p>
                            </div>
                            <Switch
                                checked={preferences.functional}
                                onCheckedChange={(checked) =>
                                    setPreferences((prev) => ({ ...prev, functional: checked }))
                                }
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={handleAcceptEssential}>
                                Essential Only
                            </Button>
                            <Button onClick={handleSavePreferences}>Save Preferences</Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="bg-card text-card-foreground border-t shadow-sm">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-7xl mx-auto">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold leading-none tracking-tight mb-1.5">
                                    We value your privacy
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    We use cookies to enhance your browsing experience, serve
                                    personalized content, and analyze our traffic. By clicking
                                    "Accept All", you consent to our use of cookies.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPreferences(true)}
                                >
                                    Manage
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleAcceptEssential}>
                                    Essential Only
                                </Button>
                                <Button size="sm" onClick={handleAcceptAll}>
                                    Accept All
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
