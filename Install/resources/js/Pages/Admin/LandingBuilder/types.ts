export interface Language {
    code: string;
    name: string;
    native_name: string;
    is_rtl: boolean;
    country_code: string;
}

export interface SectionType {
    name: string;
    icon: string;
    description: string;
    has_items: boolean;
    item_type?: string;
    content_fields: string[];
}

export interface SectionItem {
    id?: number;
    key: string;
    sort_order: number;
    is_enabled: boolean;
    data: Record<string, unknown>;
}

export interface SectionContent {
    [field: string]: string | string[] | null;
}

export interface SectionSettings {
    video_url?: string;
    layout?: 'bento' | 'grid' | 'list';
    show_icons?: boolean;
    auto_rotate?: boolean;
    show_trusted_by?: boolean;
    showcase_type?: 'video' | 'screenshots';
}

export interface Section {
    id: number;
    type: string;
    sort_order: number;
    is_enabled: boolean;
    settings: SectionSettings;
    content: Record<string, SectionContent>;
    items: Record<string, SectionItem[]>;
}

export interface LandingBuilderProps {
    sections: Section[];
    sectionTypes: Record<string, SectionType>;
    languages: Language[];
    defaultLanguage: string;
}

export interface LandingBuilderState {
    selectedSection: Section | null;
    selectedLocale: string;
    isDirty: boolean;
    isSaving: boolean;
}

// Feature item data structure
export interface FeatureItemData {
    title: string;
    description: string;
    icon: string;
    size: 'large' | 'medium' | 'small';
    image_url?: string | null;
}

// Persona/Use case item data structure
export interface PersonaItemData {
    title: string;
    description: string;
    icon: string;
}

// Category item data structure
export interface CategoryItemData {
    name: string;
    icon: string;
}

// Logo/TrustedBy item data structure
export interface LogoItemData {
    name: string;
    initial: string;
    color: string;
    image_url?: string | null;
}

// Testimonial item data structure
export interface TestimonialItemData {
    quote: string;
    author: string;
    role: string;
    avatar: string | null;
    rating: 1 | 2 | 3 | 4 | 5;
    company_url?: string | null;
}

// FAQ item data structure
export interface FaqItemData {
    question: string;
    answer: string;
}

// Showcase tab item data structure
export interface ShowcaseTabItemData {
    label: string;
    value: string;
    screenshot_light?: string | null;
    screenshot_dark?: string | null;
}

// Lucide icon names (partial list for commonly used icons)
export type LucideIconName =
    | 'Sparkles'
    | 'Eye'
    | 'Code'
    | 'Download'
    | 'LayoutTemplate'
    | 'MessageSquare'
    | 'Globe'
    | 'Terminal'
    | 'Rocket'
    | 'Palette'
    | 'Building'
    | 'Layout'
    | 'LayoutDashboard'
    | 'ShoppingCart'
    | 'Briefcase'
    | 'Settings'
    | 'Users'
    | 'Star'
    | 'Quote'
    | 'HelpCircle'
    | 'Zap'
    | 'Check'
    | 'GripVertical'
    | 'Plus'
    | 'Trash2'
    | 'Pencil'
    | 'ChevronDown'
    | 'ChevronUp'
    | 'X'
    | 'Search'
    | 'Image'
    | 'Upload';
