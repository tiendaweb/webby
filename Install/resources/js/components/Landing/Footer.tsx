import { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import ApplicationLogo from '@/components/ApplicationLogo';
import { useTranslation } from '@/contexts/LanguageContext';

export function Footer() {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    const footerLinks = useMemo(() => [
        { label: t('Privacy Policy'), href: '/privacy' },
        { label: t('Terms of Service'), href: '/terms' },
        { label: t('Cookie Policy'), href: '/cookies' },
    ], [t]);

    return (
        <footer className="bg-muted/30">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
                <div className="flex flex-col items-center text-center space-y-8">
                    {/* Logo */}
                    <Link href="/" className="flex-shrink-0 text-start">
                        <ApplicationLogo showText size="lg" />
                    </Link>

                    {/* Tagline */}
                    <p className="text-muted-foreground">
                        {t('Build websites from your ideas in minutes. Professional website builder with no coding required.')}
                    </p>

                    {/* Links */}
                    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                        {footerLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Copyright */}
                    <p className="text-sm text-muted-foreground">
                        &copy; {currentYear}. {t('All Rights Reserved.')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
