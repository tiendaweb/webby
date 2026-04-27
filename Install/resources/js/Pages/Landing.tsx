import { useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { DemoIframeBlocker } from '@/components/DemoIframeBlocker';
import { PageProps } from '@/types';
import {
    Navbar,
    HeroSection,
    SocialProof,
    FeaturesBento,
    ProductShowcase,
    PricingSection,
    UseCases,
    CategoryGallery,
    TestimonialsSection,
    FAQSection,
    FinalCTA,
    Footer,
    AnimatedSection,
    ScrollToTop,
} from '@/components/Landing';

// Section data structure from the backend
interface SectionData {
    type: string;
    is_enabled: boolean;
    settings: Record<string, unknown>;
    content: Record<string, string | string[] | null>;
    items: Array<Record<string, unknown>>;
}

interface LandingProps extends PageProps {
    // Core props
    canLogin: boolean;
    canRegister: boolean;
    isPusherConfigured: boolean;
    canCreateProject?: boolean;
    cannotCreateReason?: string | null;
    isPreview?: boolean;

    // Plans
    plans?: Array<{
        id: number;
        name: string;
        slug: string;
        description: string | null;
        price: string;
        billing_period: 'monthly' | 'yearly' | 'lifetime';
        features: Array<{ name: string; included: boolean }>;
        is_popular: boolean;
        max_projects: number | null;
        monthly_build_credits: number;
        allow_user_ai_api_key: boolean;
        enable_subdomains?: boolean;
        max_subdomains_per_user?: number | null;
        allow_private_visibility?: boolean;
    }>;

    // Statistics
    statistics?: {
        usersCount?: number;
        projectsCount?: number;
        users?: number;
        projects?: number;
    };

    // Dynamic sections from database
    sections?: SectionData[];

    // Legacy props for backward compatibility
    suggestions?: string[];
    typingPrompts?: string[];
    headline?: string;
    subtitle?: string;
}

// Common props interface for section components
interface SectionComponentProps {
    content?: Record<string, unknown>;
    items?: Array<Record<string, unknown>>;
    settings?: Record<string, unknown>;
}

// Map section types to components
// Note: trusted_by is rendered inside HeroSection, not as a standalone section
const SECTION_COMPONENTS: Record<string, React.ComponentType<SectionComponentProps>> = {
    features: FeaturesBento as React.ComponentType<SectionComponentProps>,
    product_showcase: ProductShowcase as React.ComponentType<SectionComponentProps>,
    use_cases: UseCases as React.ComponentType<SectionComponentProps>,
    categories: CategoryGallery as React.ComponentType<SectionComponentProps>,
    testimonials: TestimonialsSection as React.ComponentType<SectionComponentProps>,
    faq: FAQSection as React.ComponentType<SectionComponentProps>,
};

export default function Landing({
    auth,
    canLogin,
    canRegister,
    isPusherConfigured,
    canCreateProject = true,
    cannotCreateReason = null,
    isPreview = false,
    plans = [],
    statistics,
    sections = [],
    // Legacy props
    suggestions,
    typingPrompts,
    headline,
    subtitle,
}: LandingProps) {
    const { t } = useTranslation();
    const pageProps = usePage<PageProps>().props;
    const { errors } = pageProps as { errors?: { prompt?: string } };
    const { appSettings } = pageProps;

    // Show toast when there are errors
    useEffect(() => {
        if (errors?.prompt) {
            toast.error(errors.prompt);
        }
    }, [errors]);

    // Extract content from specific sections
    const heroSection = useMemo(
        () => sections.find((s) => s.type === 'hero'),
        [sections]
    );
    const socialProofSection = useMemo(
        () => sections.find((s) => s.type === 'social_proof'),
        [sections]
    );
    const pricingSection = useMemo(
        () => sections.find((s) => s.type === 'pricing'),
        [sections]
    );
    const ctaSection = useMemo(
        () => sections.find((s) => s.type === 'cta'),
        [sections]
    );

    // Get hero content with legacy fallback
    const heroContent = heroSection?.content || {};
    const heroHeadlines = (heroContent.headlines as string[]) || (headline ? [headline] : []);
    const heroSubtitles = (heroContent.subtitles as string[]) || (subtitle ? [subtitle] : []);
    const heroTypingPrompts = (heroContent.typing_prompts as string[]) || typingPrompts || [];
    const heroSuggestions = (heroContent.suggestions as string[]) || suggestions || [];
    const heroCtaButton = (heroContent.cta_button as string) || t('Start Building');

    // Get social proof content
    const socialProofContent = socialProofSection?.content || {};

    // Get CTA content
    const ctaContent = ctaSection?.content || {};

    // Get enabled sections in their database order
    // Note: trusted_by is rendered inside HeroSection, so we filter it out here
    const enabledSections = useMemo(
        () => sections.filter((s) => s.is_enabled && s.type !== 'trusted_by'),
        [sections]
    );

    // Get enabled section types for navbar navigation
    const enabledSectionTypes = useMemo(
        () => enabledSections.map((s) => s.type),
        [enabledSections]
    );

    // Normalize statistics
    const normalizedStats = {
        usersCount: statistics?.usersCount ?? statistics?.users ?? 0,
        projectsCount: statistics?.projectsCount ?? statistics?.projects ?? 0,
    };

    // Render a section based on its type
    const renderSection = (section: SectionData, index: number) => {
        switch (section.type) {
            case 'hero':
                return (
                    <HeroSection
                        key={section.type}
                        auth={auth}
                        initialSuggestions={heroSuggestions}
                        initialTypingPrompts={heroTypingPrompts}
                        initialHeadline={heroHeadlines[0] || t('What will you build today?')}
                        initialSubtitle={heroSubtitles[0] || t('Create stunning websites by chatting with AI.')}
                        isPusherConfigured={isPusherConfigured}
                        canCreateProject={canCreateProject}
                        cannotCreateReason={cannotCreateReason}
                        content={{
                            headlines: heroHeadlines,
                            subtitles: heroSubtitles,
                            cta_button: heroCtaButton,
                        }}
                        trustedBy={{
                            enabled: heroSection?.settings?.show_trusted_by !== false,
                            content: { title: heroContent.trusted_by_title as string },
                            items: heroSection?.items || [],
                        }}
                    />
                );
            case 'social_proof':
                return (
                    <SocialProof
                        key={section.type}
                        statistics={normalizedStats}
                        content={socialProofContent}
                    />
                );
            case 'pricing':
                // Only render if plans exist
                if (plans.length === 0) return null;
                return (
                    <AnimatedSection key={section.type} delay={index * 50}>
                        <PricingSection
                            plans={plans}
                            content={pricingSection?.content}
                        />
                    </AnimatedSection>
                );
            case 'cta':
                return (
                    <AnimatedSection key={section.type} delay={index * 50}>
                        <FinalCTA
                            auth={auth}
                            isPusherConfigured={isPusherConfigured}
                            canCreateProject={canCreateProject}
                            cannotCreateReason={cannotCreateReason}
                            content={ctaContent}
                        />
                    </AnimatedSection>
                );
            default: {
                const Component = SECTION_COMPONENTS[section.type];
                if (!Component) return null;
                return (
                    <AnimatedSection key={section.type} delay={index * 50}>
                        <Component
                            content={section.content}
                            items={section.items}
                            settings={section.settings}
                        />
                    </AnimatedSection>
                );
            }
        }
    };

    return (
        <>
            <Head title={appSettings?.site_tagline || t("Build Websites with AI")} />
            <Toaster />
            {!isPreview && <DemoIframeBlocker />}
            <Navbar auth={auth} canLogin={canLogin} canRegister={canRegister} enabledSectionTypes={enabledSectionTypes} />
            <main>
                {/* Render all sections in their database order */}
                {enabledSections.map((section, index) => renderSection(section, index))}
            </main>
            <Footer />
            <ScrollToTop />
        </>
    );
}
