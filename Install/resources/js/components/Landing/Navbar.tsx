import { useState, useEffect, useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import ApplicationLogo from '@/components/ApplicationLogo';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface NavbarProps {
    auth: {
        user: { id: number; name: string; email: string } | null;
    };
    canLogin: boolean;
    canRegister: boolean;
    enabledSectionTypes?: string[];
}

const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

export function Navbar({ auth, canLogin, canRegister, enabledSectionTypes = [] }: NavbarProps) {
    const { t } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Map section types to their nav links
    const allNavLinks = useMemo(() => [
        { label: t('Features'), href: '#features', isAnchor: true, sectionType: 'features' },
        { label: t('Pricing'), href: '#pricing', isAnchor: true, sectionType: 'pricing' },
        { label: t('Use Cases'), href: '#use-cases', isAnchor: true, sectionType: 'use_cases' },
    ], [t]);

    // Filter nav links based on enabled sections
    const navLinks = useMemo(() => {
        // If no sections provided (backwards compatibility), show all links
        if (enabledSectionTypes.length === 0) {
            return allNavLinks;
        }
        return allNavLinks.filter(link => enabledSectionTypes.includes(link.sectionType));
    }, [allNavLinks, enabledSectionTypes]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
                scrolled
                    ? 'bg-background/80 backdrop-blur-md border-b border-border shadow-sm'
                    : 'bg-transparent'
            )}
        >
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex-shrink-0">
                        <ApplicationLogo showText size="lg" />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) =>
                            link.isAnchor ? (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={(e) => handleSmoothScroll(e, link.href)}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {link.label}
                                </Link>
                            )
                        )}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <LanguageSelector />
                        <ThemeToggle />
                        {auth.user ? (
                            <Button asChild>
                                <Link href="/create">{t('Dashboard')}</Link>
                            </Button>
                        ) : (
                            <>
                                {canLogin && (
                                    <Button variant="ghost" asChild>
                                        <Link href="/login">{t('Sign in')}</Link>
                                    </Button>
                                )}
                                {canRegister && (
                                    <Button asChild>
                                        <Link href="/register">{t('Get started')}</Link>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Mobile Menu */}
                    <div className="flex md:hidden items-center gap-2">
                        <LanguageSelector />
                        <ThemeToggle />
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    {mobileMenuOpen ? (
                                        <X className="h-5 w-5" />
                                    ) : (
                                        <Menu className="h-5 w-5" />
                                    )}
                                    <span className="sr-only">{t('Toggle menu')}</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[min(85vw,280px)] sm:w-[350px] p-6">
                                <div className="flex flex-col gap-6 mt-6">
                                    {/* Mobile Nav Links */}
                                    <div className="flex flex-col gap-4">
                                        {navLinks.map((link) =>
                                            link.isAnchor ? (
                                                <a
                                                    key={link.label}
                                                    href={link.href}
                                                    onClick={(e) => {
                                                        handleSmoothScroll(e, link.href);
                                                        setMobileMenuOpen(false);
                                                    }}
                                                    className="text-lg font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                                                >
                                                    {link.label}
                                                </a>
                                            ) : (
                                                <Link
                                                    key={link.label}
                                                    href={link.href}
                                                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    {link.label}
                                                </Link>
                                            )
                                        )}
                                    </div>

                                    {/* Mobile Actions */}
                                    <div className="flex flex-col gap-3 pt-4 border-t">
                                        {auth.user ? (
                                            <Button asChild className="w-full">
                                                <Link href="/create">{t('Dashboard')}</Link>
                                            </Button>
                                        ) : (
                                            <>
                                                {canLogin && (
                                                    <Button variant="outline" asChild className="w-full">
                                                        <Link href="/login">{t('Sign in')}</Link>
                                                    </Button>
                                                )}
                                                {canRegister && (
                                                    <Button asChild className="w-full">
                                                        <Link href="/register">{t('Get started')}</Link>
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </nav>
        </header>
    );
}
