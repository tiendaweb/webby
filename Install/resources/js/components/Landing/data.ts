import {
    Sparkles,
    Eye,
    Code,
    Download,
    LayoutTemplate,
    MessageSquare,
    Globe,
    Terminal,
    Rocket,
    Palette,
    Building,
    Layout,
    LayoutDashboard,
    ShoppingCart,
    Briefcase,
    Settings,
    Zap,
    Star,
    Users,
    HelpCircle,
    type LucideIcon,
} from 'lucide-react';

// Icon name to component mapping
const ICON_MAP: Record<string, LucideIcon> = {
    Sparkles,
    Eye,
    Code,
    Download,
    LayoutTemplate,
    MessageSquare,
    Globe,
    Terminal,
    Rocket,
    Palette,
    Building,
    Layout,
    LayoutDashboard,
    ShoppingCart,
    Briefcase,
    Settings,
    Zap,
    Star,
    Users,
    HelpCircle,
};

/**
 * Get a Lucide icon component by name.
 * Falls back to Sparkles if the icon is not found.
 */
export function getIconComponent(iconName: string): LucideIcon {
    return ICON_MAP[iconName] || Sparkles;
}

// Feature cards for bento grid
export interface Feature {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    size: 'large' | 'medium' | 'small';
    image_url?: string | null;
}

export const features: Feature[] = [
    {
        id: 'ai-powered',
        title: 'Desarrollo impulsado por IA',
        description: 'Describe lo que quieres y mira cómo cobra vida. Nuestra IA entiende el contexto y construye aplicaciones completas.',
        icon: Sparkles,
        size: 'large',
    },
    {
        id: 'real-time',
        title: 'Vista previa en tiempo real',
        description: 'Ve tus cambios al instante mientras la IA construye tu proyecto. Sin esperar, sin recargar.',
        icon: Eye,
        size: 'medium',
    },
    {
        id: 'code-editor',
        title: 'Editor de código integrado',
        description: 'Editor Monaco completo con resaltado de sintaxis, árbol de archivos y autocompletado.',
        icon: Code,
        size: 'medium',
    },
    {
        id: 'export',
        title: 'Exportar y desplegar',
        description: 'Aloja en nuestra plataforma o exporta tu código para desplegarlo donde quieras.',
        icon: Download,
        size: 'small',
    },
    {
        id: 'templates',
        title: 'Plantillas inteligentes',
        description: 'Empieza con plantillas seleccionadas por IA que se ajustan perfectamente a las necesidades de tu proyecto.',
        icon: LayoutTemplate,
        size: 'small',
    },
    {
        id: 'iterations',
        title: 'Refinamiento iterativo',
        description: 'Sigue chateando para refinar y mejorar tu creación hasta que sea perfecta.',
        icon: MessageSquare,
        size: 'small',
    },
    {
        id: 'custom-subdomains',
        title: 'Subdominios personalizados',
        description: 'Publica tu proyecto en un subdominio personalizado y compártelo con el mundo.',
        icon: Globe,
        size: 'small',
    },
];

// User personas
export interface Persona {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
}

export const personas: Persona[] = [
    {
        id: 'developers',
        title: 'Desarrolladores',
        description: 'Acelera tu flujo de trabajo con desarrollo asistido por IA. Concéntrate en la lógica mientras la IA se ocupa del código repetitivo.',
        icon: Terminal,
    },
    {
        id: 'entrepreneurs',
        title: 'Emprendedores',
        description: 'Lanza tu MVP más rápido. Pasa de la idea al prototipo funcional en minutos, no en semanas.',
        icon: Rocket,
    },
    {
        id: 'designers',
        title: 'Diseñadores',
        description: 'Da vida a tus diseños sin escribir código. Describe tu visión y mírala construirse.',
        icon: Palette,
    },
    {
        id: 'agencies',
        title: 'Agencias',
        description: 'Entrega más proyectos en menos tiempo. Escala tu producción sin escalar tu equipo.',
        icon: Building,
    },
];

// Project categories
export interface Category {
    name: string;
    icon: LucideIcon;
}

export const categories: Category[] = [
    { name: 'Páginas de aterrizaje', icon: Layout },
    { name: 'Paneles de control', icon: LayoutDashboard },
    { name: 'Comercio electrónico', icon: ShoppingCart },
    { name: 'Portafolios', icon: Briefcase },
    { name: 'Aplicaciones web', icon: Globe },
    { name: 'Paneles de administración', icon: Settings },
];

// Translation function type
type TranslationFn = (key: string, replacements?: Record<string, string | number>) => string;

/**
 * Get translated features array.
 * Falls back to English if translation key returns the key itself.
 */
export function getTranslatedFeatures(t: TranslationFn): Feature[] {
    return [
        {
            id: 'ai-powered',
            title: t('AI-Powered Development'),
            description: t('Describe what you want, and watch it come to life. Our AI understands context and builds complete applications.'),
            icon: Sparkles,
            size: 'large',
        },
        {
            id: 'real-time',
            title: t('Real-time Preview'),
            description: t('See your changes instantly as the AI builds your project. No waiting, no refreshing.'),
            icon: Eye,
            size: 'medium',
        },
        {
            id: 'code-editor',
            title: t('Built-in Code Editor'),
            description: t('Full Monaco editor with syntax highlighting, file tree, and code completion.'),
            icon: Code,
            size: 'medium',
        },
        {
            id: 'export',
            title: t('Export & Deploy'),
            description: t('Host on our platform or export your code to deploy anywhere.'),
            icon: Download,
            size: 'small',
        },
        {
            id: 'templates',
            title: t('Smart Templates'),
            description: t('Start with AI-selected templates that match your project needs perfectly.'),
            icon: LayoutTemplate,
            size: 'small',
        },
        {
            id: 'iterations',
            title: t('Iterative Refinement'),
            description: t("Keep chatting to refine and improve your creation until it's perfect."),
            icon: MessageSquare,
            size: 'small',
        },
        {
            id: 'custom-subdomains',
            title: t('Custom Subdomains'),
            description: t('Publish your project to a custom subdomain and share it with the world.'),
            icon: Globe,
            size: 'small',
        },
    ];
}

/**
 * Get translated personas array.
 */
export function getTranslatedPersonas(t: TranslationFn): Persona[] {
    return [
        {
            id: 'developers',
            title: t('Developers'),
            description: t('Accelerate your workflow with AI-assisted development. Focus on logic while AI handles boilerplate.'),
            icon: Terminal,
        },
        {
            id: 'entrepreneurs',
            title: t('Entrepreneurs'),
            description: t('Launch your MVP faster. Go from idea to working prototype in minutes, not weeks.'),
            icon: Rocket,
        },
        {
            id: 'designers',
            title: t('Designers'),
            description: t('Bring your designs to life without writing code. Describe your vision and see it built.'),
            icon: Palette,
        },
        {
            id: 'agencies',
            title: t('Agencies'),
            description: t('Deliver more projects in less time. Scale your output without scaling your team.'),
            icon: Building,
        },
    ];
}

/**
 * Get translated categories array.
 */
export function getTranslatedCategories(t: TranslationFn): Category[] {
    return [
        { name: t('Landing Pages'), icon: Layout },
        { name: t('Dashboards'), icon: LayoutDashboard },
        { name: t('E-commerce'), icon: ShoppingCart },
        { name: t('Portfolios'), icon: Briefcase },
        { name: t('Web Apps'), icon: Globe },
        { name: t('Admin Panels'), icon: Settings },
    ];
}

// FAQ item interface
export interface FAQItem {
    question: string;
    answer: string;
}

/**
 * Get translated FAQs array.
 */
export function getTranslatedFAQs(t: TranslationFn): FAQItem[] {
    return [
        {
            question: t('¿Cómo entiende la IA lo que quiero construir?'),
            answer: t('Nuestra IA está entrenada con millones de proyectos de desarrollo web y entiende descripciones en lenguaje natural. Solo describe tu proyecto en español sencillo y generará la estructura de código, los componentes y los estilos adecuados.'),
        },
        {
            question: t('¿Puedo exportar mi código y usarlo en otro lugar?'),
            answer: t('Sí. Eres dueño de todo el código que generas. Puedes exportar tu proyecto completo como un archivo zip y desplegarlo donde quieras: en tus propios servidores, Vercel, Netlify o cualquier otra plataforma de hosting.'),
        },
        {
            question: t('¿Qué tecnologías usa el código generado?'),
            answer: t('Nuestra IA genera código moderno y listo para producción usando React, TypeScript y Tailwind CSS. El código sigue las mejores prácticas y es totalmente personalizable según tus necesidades.'),
        },
        {
            question: t('¿Hay un límite de cuántos proyectos puedo crear?'),
            answer: t('Depende de tu plan. Los usuarios gratuitos pueden crear una cantidad limitada de proyectos, mientras que los planes de pago ofrecen más proyectos o proyectos ilimitados. Consulta la sección de precios para más detalles.'),
        },
        {
            question: t('¿Puedo usar mis propias claves de API?'),
            answer: t('Sí, los planes premium te permiten usar tus propias claves de API de IA. Esto te da más control sobre tu uso y puede ayudar a reducir costes para usuarios de alto volumen.'),
        },
    ];
}

// Testimonial item interface
export interface TestimonialItem {
    quote: string;
    author: string;
    role: string;
    rating: number;
    avatar?: string | null;
    company_url?: string | null;
}

/**
 * Get translated testimonials array.
 */
export function getTranslatedTestimonials(t: TranslationFn): TestimonialItem[] {
    return [
        {
            quote: t('Esta herramienta ha transformado la forma en que construimos sitios web. Lo que antes tardaba semanas ahora tarda horas.'),
            author: t('Sarah Chen'),
            role: t('Lead Developer at TechFlow'),
            rating: 5,
        },
        {
            quote: t('La IA entiende exactamente lo que necesito. Es como tener un desarrollador senior a demanda.'),
            author: t('Marcus Rodriguez'),
            role: t('Founder at LaunchPad'),
            rating: 5,
        },
        {
            quote: t('Hemos reducido nuestro tiempo de desarrollo en un 80%. El retorno ha sido increíble.'),
            author: t('Emily Thompson'),
            role: t('CTO at BuildCorp'),
            rating: 5,
        },
    ];
}
