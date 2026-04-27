import { useState, useCallback, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploadField } from './ImageUploadField';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { GradientBackground } from '@/components/Dashboard/GradientBackground';
import { LandingBuilderSkeleton } from '@/components/Skeleton';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PageProps } from '@/types';
import type { Section, SectionType, LandingBuilderProps, SectionItem } from './types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Home,
    GripVertical,
    Eye,
    Settings,
    Save,
    RefreshCw,
    ExternalLink,
    Sparkles,
    Users,
    LayoutGrid,
    Image,
    Target,
    CreditCard,
    Grid3X3,
    Building2,
    MessageSquare,
    HelpCircle,
    Megaphone,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Star,
    X,
    Globe,
    Bot,
    Info,
    Loader2,
} from 'lucide-react';
// Generate a UUID-like random string
function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

interface LandingBuilderPageProps extends PageProps, LandingBuilderProps {}

// Icon mapping for section types
const SECTION_ICONS: Record<string, React.ElementType> = {
    hero: Sparkles,
    social_proof: Users,
    features: LayoutGrid,
    product_showcase: Image,
    use_cases: Target,
    pricing: CreditCard,
    categories: Grid3X3,
    trusted_by: Building2,
    testimonials: MessageSquare,
    faq: HelpCircle,
    cta: Megaphone,
};

// Sortable Section Card Component
interface SortableSectionCardProps {
    section: Section;
    sectionType: SectionType;
    isSelected: boolean;
    onSelect: () => void;
    onToggle: (enabled: boolean) => void;
    t: (key: string) => string;
}

function SortableSectionCard({
    section,
    sectionType,
    isSelected,
    onSelect,
    onToggle,
    t,
}: SortableSectionCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: section.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const Icon = SECTION_ICONS[section.type] || LayoutGrid;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
            } ${!section.is_enabled ? 'opacity-60' : ''}`}
            onClick={onSelect}
        >
            <button
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t(sectionType.name)}</p>
                <p className="text-xs text-muted-foreground truncate">
                    {sectionType.has_items ? t('Has items') : t('Content only')}
                </p>
            </div>

            <Switch
                checked={section.is_enabled}
                onCheckedChange={onToggle}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

// Content Editor Component
interface ContentEditorProps {
    section: Section;
    sectionType: SectionType;
    locale: string;
    onUpdate: (fields: Record<string, unknown>) => void;
    t: (key: string) => string;
}

// Array Field Editor Component
interface ArrayFieldEditorProps {
    label: string;
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    t: (key: string) => string;
}

function ArrayFieldEditor({ label, values, onChange, placeholder, t }: ArrayFieldEditorProps) {
    const handleAdd = () => {
        onChange([...values, '']);
    };

    const handleRemove = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    const handleChange = (index: number, value: string) => {
        const newValues = [...values];
        newValues[index] = value;
        onChange(newValues);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="capitalize">{label}</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="h-7 text-xs">
                    <Plus className="h-3 w-3 me-1" />
                    {t('Add')}
                </Button>
            </div>
            <div className="space-y-2">
                {values.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">{t('No items. Click "Add" to create one.')}</p>
                ) : (
                    values.map((value, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs text-muted-foreground shrink-0">
                                {index + 1}
                            </div>
                            <Input
                                value={value}
                                onChange={(e) => handleChange(index, e.target.value)}
                                placeholder={placeholder}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemove(index)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function ContentEditor({ section, sectionType, locale, onUpdate, t }: ContentEditorProps) {
    const content = section.content[locale] || section.content['en'] || {};
    const isFallback = !section.content[locale] && section.content['en'];

    const handleFieldChange = (field: string, value: string | string[]) => {
        onUpdate({ ...content, [field]: value });
    };

    // Helper to get translated field label
    const getFieldLabel = (field: string): string => {
        // Try to get translation for the field key directly
        const translated = t(field);
        // If translation exists and is different from the key, use it
        if (translated !== field) {
            return translated;
        }
        // Fallback: capitalize and replace underscores
        return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const renderField = (field: string) => {
        const value = content[field];

        // Array fields (headlines, subtitles, typing_prompts, suggestions)
        if (
            Array.isArray(value) ||
            ['headlines', 'subtitles', 'typing_prompts', 'suggestions'].includes(field)
        ) {
            const arrayValue = Array.isArray(value) ? value : [];
            return (
                <ArrayFieldEditor
                    key={field}
                    label={getFieldLabel(field)}
                    values={arrayValue}
                    onChange={(newValues) => handleFieldChange(field, newValues)}
                    placeholder={t('Enter text...')}
                    t={t}
                />
            );
        }

        // Regular text field
        return (
            <div key={field} className="space-y-2">
                <Label>{getFieldLabel(field)}</Label>
                {field === 'subtitle' || field === 'description' ? (
                    <Textarea
                        value={(value as string) || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        rows={3}
                    />
                ) : (
                    <Input
                        value={(value as string) || ''}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {isFallback && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                    {t('Using English content as fallback. Edit to create locale-specific content.')}
                </div>
            )}
            {sectionType.content_fields.map(renderField)}
        </div>
    );
}

// Items Editor Component
interface ItemsEditorProps {
    section: Section;
    sectionType: SectionType;
    locale: string;
    onUpdate: (items: SectionItem[]) => void;
    t: (key: string) => string;
}

function ItemsEditor({ section, sectionType, locale, onUpdate, t }: ItemsEditorProps) {
    const items = section.items[locale] || section.items['en'] || [];
    const isFallback = !section.items[locale] && section.items['en'];
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    const handleAddItem = () => {
        const newItem: SectionItem = {
            key: generateId(),
            sort_order: items.length,
            is_enabled: true,
            data: getDefaultItemData(sectionType.item_type || 'default'),
        };
        onUpdate([...items, newItem]);
        setExpandedItem(newItem.key);
    };

    const handleRemoveItem = (key: string) => {
        onUpdate(items.filter((item) => item.key !== key));
    };

    const handleUpdateItem = (key: string, data: Record<string, unknown>) => {
        onUpdate(items.map((item) => (item.key === key ? { ...item, data } : item)));
    };

    const handleToggleItem = (key: string, enabled: boolean) => {
        onUpdate(items.map((item) => (item.key === key ? { ...item, is_enabled: enabled } : item)));
    };

    return (
        <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{t('Items')}</h4>
                <Button size="sm" variant="outline" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 me-1.5" />
                    {t('Add')}
                </Button>
            </div>

            {/* Don't show fallback message for logos - company names don't need localization */}
            {isFallback && sectionType.item_type !== 'logo' && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                    {t('Using English items as fallback. Edit to create locale-specific items.')}
                </div>
            )}

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div
                        key={item.key}
                        className={`border rounded-lg overflow-hidden ${!item.is_enabled ? 'opacity-60' : ''}`}
                    >
                        <div
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                                setExpandedItem(expandedItem === item.key ? null : item.key)
                            }
                        >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {getItemTitle(item, sectionType.item_type || 'default', t)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t('Item')} {index + 1}
                                </p>
                            </div>
                            <Switch
                                checked={item.is_enabled}
                                onCheckedChange={(checked) => handleToggleItem(item.key, checked)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveItem(item.key);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            {expandedItem === item.key ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>

                        {expandedItem === item.key && (
                            <div className="p-4 border-t bg-muted/30">
                                <ItemForm
                                    item={item}
                                    itemType={sectionType.item_type || 'default'}
                                    onUpdate={(data) => handleUpdateItem(item.key, data)}
                                    t={t}
                                />
                            </div>
                        )}
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        {t('No items yet. Click "Add" to create one.')}
                    </div>
                )}
            </div>
        </div>
    );
}

// Item Form Component
interface ItemFormProps {
    item: SectionItem;
    itemType: string;
    onUpdate: (data: Record<string, unknown>) => void;
    t: (key: string) => string;
}

function ItemForm({ item, itemType, onUpdate, t }: ItemFormProps) {
    const data = item.data;

    const handleChange = (field: string, value: unknown) => {
        onUpdate({ ...data, [field]: value });
    };

    switch (itemType) {
        case 'feature':
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Title')}</Label>
                        <Input
                            value={(data.title as string) || ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Description')}</Label>
                        <Textarea
                            value={(data.description as string) || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows={2}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Icon')}</Label>
                        <Input
                            value={(data.icon as string) || ''}
                            onChange={(e) => handleChange('icon', e.target.value)}
                            placeholder="Sparkles"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('Lucide icon name (e.g., Sparkles, Eye, Code)')}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Size')}</Label>
                        <select
                            value={(data.size as string) || 'small'}
                            onChange={(e) => handleChange('size', e.target.value)}
                            className="w-full h-9 px-3 border rounded-md bg-background"
                        >
                            <option value="small">{t('Small')}</option>
                            <option value="medium">{t('Medium')}</option>
                            <option value="large">{t('Large')}</option>
                        </select>
                    </div>
                    <ImageUploadField
                        label={t('Feature Image')}
                        description={t('Upload an image for this feature (optional)')}
                        value={(data.image_url as string) || null}
                        onChange={(url) => handleChange('image_url', url)}
                        type="image"
                        t={t}
                    />
                </div>
            );

        case 'persona':
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Title')}</Label>
                        <Input
                            value={(data.title as string) || ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Description')}</Label>
                        <Textarea
                            value={(data.description as string) || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows={2}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Icon')}</Label>
                        <Input
                            value={(data.icon as string) || ''}
                            onChange={(e) => handleChange('icon', e.target.value)}
                            placeholder="Terminal"
                        />
                    </div>
                </div>
            );

        case 'category':
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Name')}</Label>
                        <Input
                            value={(data.name as string) || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Icon')}</Label>
                        <Input
                            value={(data.icon as string) || ''}
                            onChange={(e) => handleChange('icon', e.target.value)}
                            placeholder="Layout"
                        />
                    </div>
                </div>
            );

        case 'logo':
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Company Name')}</Label>
                        <Input
                            value={(data.name as string) || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Initial')}</Label>
                        <Input
                            value={(data.initial as string) || ''}
                            onChange={(e) => handleChange('initial', e.target.value)}
                            maxLength={1}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Color')}</Label>
                        <Input
                            value={(data.color as string) || ''}
                            onChange={(e) => handleChange('color', e.target.value)}
                            placeholder="bg-blue-500"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('Fallback color when no logo image is uploaded')}
                        </p>
                    </div>
                    <ImageUploadField
                        label={t('Logo Image')}
                        description={t('Upload a custom logo image (optional). If provided, this will be shown instead of the initial.')}
                        value={(data.image_url as string) || null}
                        onChange={(url) => handleChange('image_url', url)}
                        type="logo"
                        t={t}
                    />
                </div>
            );

        case 'testimonial':
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Quote')}</Label>
                        <Textarea
                            value={(data.quote as string) || ''}
                            onChange={(e) => handleChange('quote', e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Author')}</Label>
                        <Input
                            value={(data.author as string) || ''}
                            onChange={(e) => handleChange('author', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Role')}</Label>
                        <Input
                            value={(data.role as string) || ''}
                            onChange={(e) => handleChange('role', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Rating')}</Label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => handleChange('rating', star)}
                                    className="p-1"
                                >
                                    <Star
                                        className={`h-5 w-5 ${
                                            star <= ((data.rating as number) || 0)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-muted-foreground'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                    <ImageUploadField
                        label={t('Avatar')}
                        description={t('Upload author photo')}
                        value={(data.avatar as string) || null}
                        onChange={(url) => handleChange('avatar', url)}
                        type="avatar"
                        t={t}
                    />
                    <div className="space-y-2">
                        <Label>{t('Company URL')}</Label>
                        <Input
                            value={(data.company_url as string) || ''}
                            onChange={(e) => handleChange('company_url', e.target.value)}
                            placeholder="https://example.com"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('Link to company website (optional)')}
                        </p>
                    </div>
                </div>
            );

        case 'faq':
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Question')}</Label>
                        <Input
                            value={(data.question as string) || ''}
                            onChange={(e) => handleChange('question', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Answer')}</Label>
                        <Textarea
                            value={(data.answer as string) || ''}
                            onChange={(e) => handleChange('answer', e.target.value)}
                            rows={4}
                            placeholder={t('Supports Markdown formatting')}
                        />
                    </div>
                </div>
            );

        case 'showcase_tab':
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Tab Label')}</Label>
                        <Input
                            value={(data.label as string) || ''}
                            onChange={(e) => handleChange('label', e.target.value)}
                            placeholder={t('e.g., Preview, Inspect, Code')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Tab Value')}</Label>
                        <Input
                            value={(data.value as string) || ''}
                            onChange={(e) => handleChange('value', e.target.value)}
                            placeholder={t('e.g., preview, inspect, code')}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('Unique identifier for the tab (lowercase, no spaces)')}
                        </p>
                    </div>
                    <ImageUploadField
                        label={t('Light Mode Screenshot')}
                        description={t('Screenshot for light theme (1280x800 recommended)')}
                        value={(data.screenshot_light as string) || null}
                        onChange={(url) => handleChange('screenshot_light', url)}
                        type="image"
                        t={t}
                    />
                    <ImageUploadField
                        label={t('Dark Mode Screenshot')}
                        description={t('Screenshot for dark theme (1280x800 recommended)')}
                        value={(data.screenshot_dark as string) || null}
                        onChange={(url) => handleChange('screenshot_dark', url)}
                        type="image"
                        t={t}
                    />
                </div>
            );

        default:
            return (
                <div className="text-sm text-muted-foreground">
                    {t('Unknown item type')}: {itemType}
                </div>
            );
    }
}

// Helper functions
function getDefaultItemData(itemType: string): Record<string, unknown> {
    switch (itemType) {
        case 'feature':
            return { title: '', description: '', icon: 'Sparkles', size: 'small', image_url: null };
        case 'persona':
            return { title: '', description: '', icon: 'Terminal' };
        case 'category':
            return { name: '', icon: 'Layout' };
        case 'logo':
            return { name: '', initial: '', color: 'bg-blue-500', image_url: null };
        case 'testimonial':
            return { quote: '', author: '', role: '', rating: 5, avatar: null, company_url: null };
        case 'faq':
            return { question: '', answer: '' };
        case 'showcase_tab':
            return { label: '', value: '', screenshot_light: null, screenshot_dark: null };
        default:
            return {};
    }
}

function getItemTitle(item: SectionItem, itemType: string, t: (key: string) => string): string {
    const data = item.data;
    const untitled = t('Untitled');
    switch (itemType) {
        case 'feature':
        case 'persona':
            return (data.title as string) || untitled;
        case 'category':
            return (data.name as string) || untitled;
        case 'logo':
            return (data.name as string) || untitled;
        case 'testimonial':
            return (data.author as string) || untitled;
        case 'faq':
            return (data.question as string) || untitled;
        case 'showcase_tab':
            return (data.label as string) || untitled;
        default:
            return untitled;
    }
}

// Main Component
export default function Index({
    sections: initialSections,
    sectionTypes,
    languages,
    defaultLanguage,
}: LandingBuilderPageProps) {
    const { t } = useTranslation();
    const [sections, setSections] = useState<Section[]>(initialSections);
    const [selectedSection, setSelectedSection] = useState<Section | null>(
        initialSections[0] || null
    );
    const [selectedLocale, setSelectedLocale] = useState(defaultLanguage);
    const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings');
    const [isSaving, setIsSaving] = useState(false);
    const [previewKey, setPreviewKey] = useState(Date.now());
    const [initialLoading, setInitialLoading] = useState(true);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Clear initial loading state after first render
    useEffect(() => {
        const timer = setTimeout(() => setInitialLoading(false), 100);
        return () => clearTimeout(timer);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;

            if (over && active.id !== over.id) {
                setSections((items) => {
                    const oldIndex = items.findIndex((item) => item.id === active.id);
                    const newIndex = items.findIndex((item) => item.id === over.id);
                    const newItems = arrayMove(items, oldIndex, newIndex);

                    // Save reorder to backend
                    router.post(
                        '/admin/landing-builder/reorder',
                        { ids: newItems.map((s) => s.id) },
                        {
                            preserveScroll: true,
                            onSuccess: () => toast.success(t('Sections reordered')),
                            onError: () => toast.error(t('Failed to reorder sections')),
                        }
                    );

                    return newItems;
                });
            }
        },
        [t]
    );

    const handleToggleSection = useCallback(
        (section: Section, enabled: boolean) => {
            router.put(
                `/admin/landing-builder/sections/${section.id}`,
                { is_enabled: enabled },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSections((items) =>
                            items.map((s) =>
                                s.id === section.id ? { ...s, is_enabled: enabled } : s
                            )
                        );
                        setSelectedSection((prev) =>
                            prev?.id === section.id ? { ...prev, is_enabled: enabled } : prev
                        );
                        toast.success(enabled ? t('Section enabled') : t('Section disabled'));
                    },
                    onError: () => toast.error(t('Failed to update section')),
                }
            );
        },
        [t]
    );

    const handleSave = useCallback(async () => {
        if (!selectedSection) return;

        setIsSaving(true);
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const hasItems = sectionTypes[selectedSection.type]?.has_items;

        try {
            // Save content
            const content = selectedSection.content[selectedLocale] || {};
            const contentResponse = await fetch(`/admin/landing-builder/sections/${selectedSection.id}/content`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    locale: selectedLocale,
                    fields: content,
                }),
            });

            if (!contentResponse.ok) {
                toast.error(t('Failed to save content'));
                return;
            }

            // Save items if section has items
            if (hasItems) {
                const items = selectedSection.items[selectedLocale] || [];
                const itemsResponse = await fetch(`/admin/landing-builder/sections/${selectedSection.id}/items`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        locale: selectedLocale,
                        items: items.map((item, index) => ({
                            key: item.key,
                            sort_order: index,
                            is_enabled: item.is_enabled,
                            data: item.data,
                        })),
                    }),
                });

                if (!itemsResponse.ok) {
                    toast.error(t('Failed to save items'));
                    return;
                }
            }

            // Show single success message
            toast.success(t('Section saved successfully'));
            setPreviewKey(Date.now());
        } catch {
            toast.error(t('Failed to save section'));
        } finally {
            setIsSaving(false);
        }
    }, [selectedSection, selectedLocale, sectionTypes, t]);

    const handleContentUpdate = useCallback(
        (fields: Record<string, unknown>) => {
            if (!selectedSection) return;

            setSections((items) =>
                items.map((s) =>
                    s.id === selectedSection.id
                        ? {
                              ...s,
                              content: {
                                  ...s.content,
                                  [selectedLocale]: fields as Record<string, string | string[] | null>,
                              },
                          }
                        : s
                )
            );

            setSelectedSection((prev) =>
                prev
                    ? {
                          ...prev,
                          content: {
                              ...prev.content,
                              [selectedLocale]: fields as Record<string, string | string[] | null>,
                          },
                      }
                    : null
            );
        },
        [selectedSection, selectedLocale]
    );

    const handleItemsUpdate = useCallback(
        (items: SectionItem[]) => {
            if (!selectedSection) return;

            setSections((allSections) =>
                allSections.map((s) =>
                    s.id === selectedSection.id
                        ? {
                              ...s,
                              items: {
                                  ...s.items,
                                  [selectedLocale]: items,
                              },
                          }
                        : s
                )
            );

            setSelectedSection((prev) =>
                prev
                    ? {
                          ...prev,
                          items: {
                              ...prev.items,
                              [selectedLocale]: items,
                          },
                      }
                    : null
            );
        },
        [selectedSection, selectedLocale]
    );

    const refreshPreview = useCallback(() => {
        setPreviewLoading(true);
        setPreviewKey(Date.now());
    }, []);

    const getTabButtonClass = (tab: 'settings' | 'preview') =>
        `flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
            activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
        }`;

    // Show skeleton while initial loading
    if (initialLoading) {
        return (
            <>
                <Head title={t('Landing Page Builder')} />
                <LandingBuilderSkeleton />
            </>
        );
    }

    return (
        <>
            <Head title={t('Landing Page Builder')} />
            <Toaster />

            <div className="h-screen flex bg-background text-foreground">
                {/* LEFT PANEL - Section List */}
                <div className="w-full md:w-[420px] shrink-0 md:border-e flex flex-col">
                    {/* Header */}
                    <div className="h-14 px-4 border-b flex items-center justify-between shrink-0">
                        <span className="font-semibold truncate">{t('Landing Page Builder')}</span>
                        <div className="flex items-center gap-1">
                            <LanguageSelector />
                            <ThemeToggle />
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="/admin/overview">
                                    <Home className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Section List */}
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-2">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={sections.map((s) => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {sections.map((section) => (
                                        <SortableSectionCard
                                            key={section.id}
                                            section={section}
                                            sectionType={sectionTypes[section.type]}
                                            isSelected={selectedSection?.id === section.id}
                                            onSelect={() => setSelectedSection(section)}
                                            onToggle={(enabled) => handleToggleSection(section, enabled)}
                                            t={t}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </ScrollArea>
                </div>

                {/* RIGHT PANEL - Editor/Preview/Settings */}
                <div className="hidden md:flex flex-1 flex-col overflow-hidden">
                    {/* Tab Header */}
                    <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-background relative z-10">
                        {/* Tab Toggle Buttons */}
                        <div className="flex items-center border rounded-lg overflow-hidden">
                            <button onClick={() => setActiveTab('settings')} className={getTabButtonClass('settings')}>
                                <Settings className="h-4 w-4" />
                                {t('Settings')}
                            </button>
                            <div className="w-px h-6 bg-border" />
                            <button onClick={() => {
                                if (activeTab !== 'preview') {
                                    setPreviewLoading(true);
                                }
                                setActiveTab('preview');
                            }} className={getTabButtonClass('preview')}>
                                <Eye className="h-4 w-4" />
                                {t('Preview')}
                            </button>
                        </div>

                        {/* Actions - Always Visible */}
                        <div className="flex items-center gap-2">
                            <Select
                                value={selectedLocale}
                                onValueChange={(value) => {
                                    setSelectedLocale(value);
                                    if (activeTab === 'preview') {
                                        setPreviewLoading(true);
                                        setPreviewKey(Date.now());
                                    }
                                }}
                            >
                                <SelectTrigger className="w-[140px] h-8">
                                    <Globe className="h-4 w-4 me-2 text-muted-foreground" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {languages.map((lang) => (
                                        <SelectItem key={lang.code} value={lang.code}>
                                            {lang.native_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
                                <Save className="h-4 w-4 me-1.5" />
                                {isSaving ? t('Saving...') : t('Save')}
                            </Button>
                            {activeTab === 'preview' && (
                                <>
                                    <Button variant="outline" size="sm" onClick={refreshPreview} className="h-8">
                                        <RefreshCw className="h-4 w-4 me-1.5" />
                                        {t('Refresh')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            window.open(
                                                `/admin/landing-builder/preview?locale=${selectedLocale}`,
                                                '_blank'
                                            )
                                        }
                                        className="h-8"
                                    >
                                        <ExternalLink className="h-4 w-4 me-1.5" />
                                        {t('Open')}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative bg-background">
                        <GradientBackground />

                        {/* Settings Tab */}
                        {activeTab === 'settings' && selectedSection && (
                            <ScrollArea className="h-full relative z-10 bg-background">
                                <div className="p-6 max-w-2xl">
                                    {/* Section Header with Enabled Toggle */}
                                    <div className="flex items-start justify-between gap-4 mb-6 p-4 border rounded-lg bg-muted/30">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold">
                                                {t(sectionTypes[selectedSection.type].name)}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {t(sectionTypes[selectedSection.type].description)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Label className="text-sm text-muted-foreground">
                                                {selectedSection.is_enabled ? t('Enabled') : t('Disabled')}
                                            </Label>
                                            <Switch
                                                checked={selectedSection.is_enabled}
                                                onCheckedChange={(checked) =>
                                                    handleToggleSection(selectedSection, checked)
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Product Showcase section - Type selector */}
                                    {selectedSection.type === 'product_showcase' ? (
                                        <div className="space-y-6">
                                            {/* Showcase Type Selector */}
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>{t('Showcase Type')}</Label>
                                                    <Select
                                                        value={selectedSection.settings?.showcase_type || 'screenshots'}
                                                        onValueChange={(value) => {
                                                            const newSettings = {
                                                                ...selectedSection.settings,
                                                                showcase_type: value as 'video' | 'screenshots',
                                                            };
                                                            router.put(
                                                                `/admin/landing-builder/sections/${selectedSection.id}`,
                                                                { settings: newSettings },
                                                                {
                                                                    preserveScroll: true,
                                                                    onSuccess: () => {
                                                                        setSections((items) =>
                                                                            items.map((s) =>
                                                                                s.id === selectedSection.id
                                                                                    ? { ...s, settings: newSettings }
                                                                                    : s
                                                                            )
                                                                        );
                                                                        setSelectedSection((prev) =>
                                                                            prev ? { ...prev, settings: newSettings } : prev
                                                                        );
                                                                        toast.success(t('Settings updated'));
                                                                        setPreviewKey(Date.now());
                                                                    },
                                                                    onError: () => toast.error(t('Failed to update settings')),
                                                                }
                                                            );
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="screenshots">{t('Tabbed Screenshots')}</SelectItem>
                                                            <SelectItem value="video">{t('YouTube Video')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('Choose between tabbed screenshots or an embedded YouTube video')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Content Fields - Title and Subtitle only */}
                                            <ContentEditor
                                                section={selectedSection}
                                                sectionType={{
                                                    ...sectionTypes[selectedSection.type],
                                                    content_fields: ['title', 'subtitle'],
                                                }}
                                                locale={selectedLocale}
                                                onUpdate={handleContentUpdate}
                                                t={t}
                                            />

                                            {/* Video URL Field - Only show for video type */}
                                            {selectedSection.settings?.showcase_type === 'video' && (
                                                <div className="space-y-2">
                                                    <Label>{t('Video URL')}</Label>
                                                    <Input
                                                        value={(selectedSection.content[selectedLocale]?.video_url as string) || ''}
                                                        onChange={(e) => handleContentUpdate({
                                                            ...selectedSection.content[selectedLocale],
                                                            video_url: e.target.value
                                                        })}
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('Enter a YouTube video URL (e.g., youtube.com/watch?v=xxx or youtu.be/xxx)')}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Items Editor - Only show for screenshots type */}
                                            {selectedSection.settings?.showcase_type !== 'video' && (
                                                <ItemsEditor
                                                    section={selectedSection}
                                                    sectionType={sectionTypes[selectedSection.type]}
                                                    locale={selectedLocale}
                                                    onUpdate={handleItemsUpdate}
                                                    t={t}
                                                />
                                            )}
                                        </div>
                                    ) : /* Hero section - AI-powered notice + Trusted By settings */
                                    selectedSection.type === 'hero' ? (
                                        <div className="space-y-6">
                                            {/* AI-Powered Content Notice */}
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-4 p-4 border rounded-lg bg-primary/5 border-primary/20">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                                                        <Bot className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-medium mb-1">{t('AI-Powered Content')}</h4>
                                                        <p className="text-sm text-muted-foreground mb-3">
                                                            {t('The hero section content (headlines, subtitles, suggestions, and typing prompts) is automatically generated by the Internal AI system. When AI is not configured, it falls back to translated static content.')}
                                                        </p>
                                                        <Link
                                                            href="/admin/settings?tab=integrations"
                                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                                                        >
                                                            <Settings className="h-4 w-4" />
                                                            {t('Configure Internal AI')}
                                                        </Link>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50">
                                                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                    <p className="text-sm text-muted-foreground">
                                                        {t('Fallback translations are managed in the language files (lang/*/internal_ai.json). These are used when AI generation is unavailable.')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Trusted By Section */}
                                            <div className="border-t pt-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-medium">{t('Trusted By Section')}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-sm text-muted-foreground">
                                                            {selectedSection.settings?.show_trusted_by !== false ? t('Enabled') : t('Disabled')}
                                                        </Label>
                                                        <Switch
                                                            checked={selectedSection.settings?.show_trusted_by !== false}
                                                            onCheckedChange={(checked) => {
                                                                const newSettings = {
                                                                    ...selectedSection.settings,
                                                                    show_trusted_by: checked,
                                                                };
                                                                router.put(
                                                                    `/admin/landing-builder/sections/${selectedSection.id}`,
                                                                    { settings: newSettings },
                                                                    {
                                                                        preserveScroll: true,
                                                                        onSuccess: () => {
                                                                            setSections((items) =>
                                                                                items.map((s) =>
                                                                                    s.id === selectedSection.id
                                                                                        ? { ...s, settings: newSettings }
                                                                                        : s
                                                                                )
                                                                            );
                                                                            setSelectedSection((prev) =>
                                                                                prev ? { ...prev, settings: newSettings } : prev
                                                                            );
                                                                            toast.success(t('Settings updated'));
                                                                            setPreviewKey(Date.now());
                                                                        },
                                                                        onError: () => toast.error(t('Failed to update settings')),
                                                                    }
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {selectedSection.settings?.show_trusted_by !== false && (
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label>{t('trusted_by_title')}</Label>
                                                            <Input
                                                                value={(selectedSection.content[selectedLocale]?.trusted_by_title as string) || ''}
                                                                onChange={(e) => handleContentUpdate({
                                                                    ...selectedSection.content[selectedLocale],
                                                                    trusted_by_title: e.target.value
                                                                })}
                                                                placeholder={t('Trusted by teams at')}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Logos Items Editor */}
                                            {selectedSection.settings?.show_trusted_by !== false && (
                                                <ItemsEditor
                                                    section={selectedSection}
                                                    sectionType={sectionTypes[selectedSection.type]}
                                                    locale={selectedLocale}
                                                    onUpdate={handleItemsUpdate}
                                                    t={t}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <ContentEditor
                                                section={selectedSection}
                                                sectionType={sectionTypes[selectedSection.type]}
                                                locale={selectedLocale}
                                                onUpdate={handleContentUpdate}
                                                t={t}
                                            />

                                            {sectionTypes[selectedSection.type].has_items && (
                                                <ItemsEditor
                                                    section={selectedSection}
                                                    sectionType={sectionTypes[selectedSection.type]}
                                                    locale={selectedLocale}
                                                    onUpdate={handleItemsUpdate}
                                                    t={t}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            </ScrollArea>
                        )}

                        {activeTab === 'settings' && !selectedSection && (
                            <div className="h-full flex items-center justify-center text-muted-foreground relative z-10 bg-background">
                                {t('Select a section to edit')}
                            </div>
                        )}

                        {/* Preview Tab */}
                        {activeTab === 'preview' && (
                            <div className="relative w-full h-full">
                                {previewLoading && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <span className="text-sm text-muted-foreground">{t('Loading preview...')}</span>
                                        </div>
                                    </div>
                                )}
                                <iframe
                                    key={previewKey}
                                    src={`/admin/landing-builder/preview?locale=${selectedLocale}`}
                                    className="w-full h-full border-0 relative z-10"
                                    title={t('Landing Page Preview')}
                                    onLoad={() => setPreviewLoading(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
