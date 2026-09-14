import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { GradientBackground } from '@/components/Dashboard/GradientBackground';
import { ElementContextMenu } from './ElementContextMenu';
import { PendingEditsPanel } from './PendingEditsPanel';
import { VisualEditModal } from './VisualEditModal';
import { SectionCodeEditModal } from './SectionCodeEditModal';
import { usePreviewInspector } from '@/hooks/usePreviewInspector';
import { usePreviewThemeSync } from '@/hooks/usePreviewThemeSync';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { MousePointerClick, Edit2, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react';
import { toast } from 'sonner';
import type {
    InspectorElement,
    ElementMention,
    PendingEdit,
    InspectorMode,
    VisualEditField,
    VisualEditPayload,
    VisualEditResponse,
    SectionCodeSaveResponse,
    SectionCodeEditScope,
} from '@/types/inspector';
import confetti from 'canvas-confetti';
import { Bot, Cog, Wrench } from 'lucide-react';
import { usePreviewThemeInjection } from '@/hooks/usePreviewThemeInjection';
import { useThumbnailCapture } from '@/hooks/useThumbnailCapture';

type PreviewMode = 'preview' | 'inspect' | 'design';
type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_MODES: Array<{ id: DeviceMode; label: string; width: number | null; icon: typeof Monitor }> = [
    { id: 'desktop', label: 'Desktop', width: null, icon: Monitor },
    { id: 'tablet', label: 'Tablet', width: 768, icon: Tablet },
    { id: 'mobile', label: 'Mobile', width: 390, icon: Smartphone },
];

interface InspectPreviewProps {
    previewUrl?: string | null;
    refreshTrigger?: number;
    isBuilding?: boolean;
    mode?: PreviewMode;
    projectId?: string;  // For thumbnail capture
    captureThumbnailTrigger?: number;  // Change this value to trigger thumbnail capture
    // Inspect mode callbacks (optional when mode !== 'inspect')
    onElementSelect?: (element: ElementMention) => void;
    onElementEdit?: (edit: PendingEdit) => void;
    pendingEdits?: PendingEdit[];
    onSaveAllEdits?: () => Promise<void>;
    onDiscardAllEdits?: () => void;
    onRemoveEdit?: (id: string) => void;
    onVisualEditSaved?: (response: VisualEditResponse) => void;
    onProjectFileUploaded?: (file: {
        id: number;
        filename: string;
        mime_type: string;
        size: number;
        human_size: string;
        is_image: boolean;
        url: string;
    }) => void;
    // Design mode props
    themeDesignerSlot?: React.ReactNode;
    onThemeSelect?: (presetId: string) => void;
    isSavingTheme?: boolean;
    currentTheme?: string | null;  // The saved/applied theme preset
}

function BuildingAnimation({ t }: { t: (key: string) => string }) {
    return (
        <div className="flex flex-col items-center gap-5 bg-card px-10 py-8 rounded-xl shadow-xl">
            <div className="flex items-center gap-4">
                <div className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}>
                    <Bot className="h-8 w-8 text-primary" />
                </div>
                <div className="animate-spin" style={{ animationDuration: '3s' }}>
                    <Cog className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}>
                    <Wrench className="h-8 w-8 text-primary" />
                </div>
            </div>
            <div className="text-center">
                <h3 className="font-medium text-lg">{t('Building your site...')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('This may take a moment')}</p>
            </div>
        </div>
    );
}

const VISUAL_TEXT_TAGS = ['div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'li', 'a', 'button', 'td', 'th'];

const VISUAL_ATTRIBUTE_FIELDS: Record<string, VisualEditField[]> = {
    a: ['href', 'title'],
    img: ['src', 'alt', 'title'],
    input: ['placeholder', 'title'],
    textarea: ['placeholder', 'title'],
    button: ['title'],
};

const SECTION_CODE_SELECTOR = 'section, [data-section], [data-block], [data-component], article, main, header, footer';
const CONTAINER_CODE_SELECTOR = 'div, section, article, main, header, footer, nav, aside';

function canEditText(element: InspectorElement): boolean {
    return VISUAL_TEXT_TAGS.includes(element.tagName);
}

function isPreviewHTMLElement(element: Element | null): element is HTMLElement {
    if (!element || element.nodeType !== 1) return false;

    const view = element.ownerDocument.defaultView;
    if (view?.HTMLElement) {
        return element instanceof view.HTMLElement;
    }

    return typeof (element as HTMLElement).tagName === 'string'
        && typeof (element as HTMLElement).matches === 'function';
}

function isCodeEditableTarget(element: Element | null): element is HTMLElement {
    if (!isPreviewHTMLElement(element)) return false;

    return !['html', 'head', 'body'].includes(element.tagName.toLowerCase());
}

function findClosestCodeTarget(element: HTMLElement, selector: string): HTMLElement | null {
    let current: Element | null = element;

    while (current && current !== element.ownerDocument.body) {
        if (isPreviewHTMLElement(current) && current.matches(selector)) {
            return current;
        }

        current = current.parentElement;
    }

    return null;
}

function findCodeEditTarget(element: HTMLElement, scope: SectionCodeEditScope): HTMLElement | null {
    if (scope === 'element') {
        return isCodeEditableTarget(element) ? element : null;
    }

    if (scope === 'container') {
        const container = findClosestCodeTarget(element, CONTAINER_CODE_SELECTOR);
        return isCodeEditableTarget(container) ? container : null;
    }

    const section = findClosestCodeTarget(element, SECTION_CODE_SELECTOR)
        || findClosestCodeTarget(element, CONTAINER_CODE_SELECTOR);

    return isCodeEditableTarget(section) ? section : null;
}

function cssEscape(value: string, doc: Document): string {
    const css = doc.defaultView?.CSS ?? window.CSS;

    if (css && typeof css.escape === 'function') {
        return css.escape(value);
    }

    return value.replace(/[^a-zA-Z0-9_-]/g, char => `\\${char}`);
}

function getPreviewXPath(element: HTMLElement): string {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }

    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = current.previousElementSibling;

        while (sibling) {
            if (sibling.nodeName === current.nodeName) {
                index += 1;
            }
            sibling = sibling.previousElementSibling;
        }

        const tagName = current.nodeName.toLowerCase();
        parts.unshift(index > 1 ? `${tagName}[${index}]` : tagName);
        current = current.parentElement;
    }

    return `/${parts.join('/')}`;
}

function getPreviewCssSelector(element: HTMLElement): string {
    const doc = element.ownerDocument;

    if (element.id) {
        return `#${cssEscape(element.id, doc)}`;
    }

    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== doc.body) {
        let selector = current.tagName.toLowerCase();
        const classes = Array.from((current as HTMLElement).classList)
            .filter(className => !className.startsWith('preview-inspector-') && className.length < 30);

        if (classes.length > 0) {
            selector += `.${cssEscape(classes[0], doc)}`;
        }

        let siblings: Element[] = [];
        try {
            siblings = current.parentElement
                ? Array.from(current.parentElement.querySelectorAll(`:scope > ${selector}`))
                : [];
        } catch {
            siblings = [];
        }

        if (siblings.length > 1) {
            selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }

        parts.unshift(selector);

        const fullSelector = parts.join(' > ');
        try {
            if (doc.querySelectorAll(fullSelector).length === 1) {
                return fullSelector;
            }
        } catch {
            // Keep walking up when an intermediate selector cannot be queried safely.
        }

        current = current.parentElement;
    }

    return parts.join(' > ');
}

function getPreviewTextPreview(element: HTMLElement): string {
    const text = (element.textContent || '').trim();
    return text.length > 50 ? `${text.substring(0, 50)}...` : text;
}

function getPreviewEditableAttributes(element: HTMLElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    const editableAttrs = VISUAL_ATTRIBUTE_FIELDS[element.tagName.toLowerCase()] ?? [];

    for (const attr of editableAttrs) {
        const value = element.getAttribute(attr);
        if (value !== null) {
            attrs[attr] = value;
        }
    }

    return attrs;
}

function getPreviewContainedImages(element: HTMLElement): InspectorElement['images'] {
    const images = element.tagName.toLowerCase() === 'img'
        ? [element as HTMLImageElement]
        : Array.from(element.querySelectorAll('img'));

    return images
        .map((image, index) => {
            const selector = getPreviewCssSelector(image);

            return {
                id: `${selector}-${index}`,
                cssSelector: selector,
                src: image.getAttribute('src') || '',
                currentSrc: image.currentSrc || image.src || '',
                alt: image.getAttribute('alt') || '',
                title: image.getAttribute('title') || '',
            };
        })
        .filter(image => image.src !== '' || image.currentSrc !== '')
        .slice(0, 20);
}

function serializePreviewElement(element: HTMLElement): InspectorElement {
    const rect = element.getBoundingClientRect();

    return {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        tagName: element.tagName.toLowerCase(),
        elementId: element.id || null,
        classNames: Array.from(element.classList),
        textPreview: getPreviewTextPreview(element),
        xpath: getPreviewXPath(element),
        cssSelector: getPreviewCssSelector(element),
        boundingRect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        },
        attributes: getPreviewEditableAttributes(element),
        parentTagName: element.parentElement ? element.parentElement.tagName.toLowerCase() : null,
        images: getPreviewContainedImages(element),
    };
}

/**
 * Preview component with element inspection capabilities.
 * Allows users to click elements and mention them in chat or edit inline.
 */
export function InspectPreview({
    previewUrl,
    refreshTrigger = 0,
    isBuilding = false,
    mode = 'inspect',
    projectId,
    captureThumbnailTrigger,
    onElementSelect,
    onElementEdit,
    pendingEdits = [],
    onSaveAllEdits,
    onDiscardAllEdits,
    onRemoveEdit,
    onVisualEditSaved,
    onProjectFileUploaded,
    themeDesignerSlot,
    onThemeSelect,
    isSavingTheme = false,
    currentTheme,
}: InspectPreviewProps) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const wasBuilding = useRef(false);
    const previousMode = useRef<PreviewMode>(mode);
    const [isSaving, setIsSaving] = useState(false);
    const [iframeReady, setIframeReady] = useState(false);
    const [sectionCodeElement, setSectionCodeElement] = useState<InspectorElement | null>(null);
    const [sectionCodeOuterHtml, setSectionCodeOuterHtml] = useState('');
    const [visualEditElement, setVisualEditElement] = useState<InspectorElement | null>(null);
    const [visualEditValues, setVisualEditValues] = useState<Partial<Record<VisualEditField, string>>>({});
    const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => {
        if (typeof window === 'undefined') return 'desktop';
        const saved = window.localStorage.getItem('webby-preview-device');
        return saved === 'tablet' || saved === 'mobile' ? saved : 'desktop';
    });

    const activeDevice = DEVICE_MODES.find(device => device.id === deviceMode) ?? DEVICE_MODES[0];

    const changeDeviceMode = useCallback((nextMode: DeviceMode) => {
        setDeviceMode(nextMode);
        window.localStorage.setItem('webby-preview-device', nextMode);
    }, []);

    // Use the preview inspector hook - only enabled in inspect mode
    const {
        inspectorMode,
        setInspectorMode,
        contextMenu,
        closeContextMenu,
        isReady,
        revertEdits,
    } = usePreviewInspector({
        iframeRef,
        enabled: mode === 'inspect' && !isBuilding,
        onElementSelect: mode === 'inspect' && onElementSelect ? (element) => {
            const mention: ElementMention = {
                id: element.id,
                tagName: element.tagName,
                selector: element.cssSelector,
                textPreview: element.textPreview,
            };
            onElementSelect(mention);
        } : undefined,
        onElementEdit: mode === 'inspect' ? onElementEdit : undefined,
    });

    // Track iframe load state independently of inspector mode
    useEffect(() => {
        setIframeReady(false);
        const iframe = iframeRef.current;
        if (!iframe) return;

        const handleLoad = () => setIframeReady(true);
        iframe.addEventListener('load', handleLoad);
        return () => iframe.removeEventListener('load', handleLoad);
    }, [refreshTrigger]);

    // Sync light/dark theme with iframe (works in all modes)
    usePreviewThemeSync({ iframeRef, isReady: iframeReady || isReady });

    // Theme injection for design mode
    const { applyThemeToPreview: internalApplyTheme } = usePreviewThemeInjection(iframeRef);

    // Thumbnail capture hook
    const { captureAndUpload } = useThumbnailCapture(iframeRef, projectId);

    // Wrap parent's onThemeSelect to also apply theme to our iframe
    const wrappedOnThemeSelect = useCallback((presetId: string) => {
        internalApplyTheme(presetId);
        onThemeSelect?.(presetId);
    }, [internalApplyTheme, onThemeSelect]);

    // Revert theme preview when leaving design mode without applying
    useEffect(() => {
        if (previousMode.current === 'design' && mode !== 'design') {
            // Left design mode - revert to saved theme
            internalApplyTheme(currentTheme || 'default');
        }
        previousMode.current = mode;
    }, [mode, currentTheme, internalApplyTheme]);

    // Resize canvas to match container
    useEffect(() => {
        const updateCanvasSize = () => {
            if (canvasRef.current && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                canvasRef.current.width = rect.width;
                canvasRef.current.height = rect.height;
            }
        };

        updateCanvasSize();

        const resizeObserver = new ResizeObserver(updateCanvasSize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Confetti effect and thumbnail capture when build completes
    useEffect(() => {
        if (wasBuilding.current && !isBuilding && canvasRef.current) {
            const myConfetti = confetti.create(canvasRef.current, {
                resize: true,
                useWorker: true,
            });

            const duration = 2500;
            const end = Date.now() + duration;

            const frame = () => {
                myConfetti({
                    particleCount: 4,
                    angle: 60,
                    spread: 70,
                    origin: { x: 0, y: 0.6 },
                    colors: ['#a855f7', '#3b82f6', '#22c55e', '#eab308', '#ef4444'],
                });
                myConfetti({
                    particleCount: 4,
                    angle: 120,
                    spread: 70,
                    origin: { x: 1, y: 0.6 },
                    colors: ['#a855f7', '#3b82f6', '#22c55e', '#eab308', '#ef4444'],
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();

            // Capture thumbnail after iframe has fully rendered (fire-and-forget)
            // 2s delay to allow external resources (fonts, images) to load
            setTimeout(() => {
                captureAndUpload();
            }, 2000);
        }
        wasBuilding.current = isBuilding;
    }, [isBuilding, captureAndUpload]);

    // Capture thumbnail when trigger prop changes (e.g., after theme apply)
    const lastCaptureTrigger = useRef(0);
    useEffect(() => {
        if (captureThumbnailTrigger && captureThumbnailTrigger > 0 && captureThumbnailTrigger !== lastCaptureTrigger.current) {
            lastCaptureTrigger.current = captureThumbnailTrigger;
            // 2s delay to allow preview to update with new theme
            setTimeout(() => {
                captureAndUpload();
            }, 2000);
        }
    }, [captureThumbnailTrigger, captureAndUpload]);

    // Handle mention from context menu
    const handleMention = useCallback((element: ElementMention) => {
        onElementSelect?.(element);
        closeContextMenu();
        toast.success(t('Element added to chat input'));
    }, [onElementSelect, closeContextMenu, t]);

    const getIframeElement = useCallback((selector: string): HTMLElement | null => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return null;

        try {
            const target = doc.querySelector(selector);
            return isPreviewHTMLElement(target) ? target : null;
        } catch {
            return null;
        }
    }, []);

    const readVisualEditValues = useCallback((element: InspectorElement) => {
        const target = getIframeElement(element.cssSelector);
        const values: Partial<Record<VisualEditField, string>> = {};

        if (canEditText(element)) {
            values.text = target?.textContent ?? element.textPreview ?? '';
        }

        for (const field of VISUAL_ATTRIBUTE_FIELDS[element.tagName] ?? []) {
            values[field] = target?.getAttribute(field) ?? element.attributes[field] ?? '';
        }

        return values;
    }, [getIframeElement]);

    const setPreviewValue = useCallback((payload: VisualEditPayload, value: string) => {
        const target = getIframeElement(payload.selector);
        if (!target) return;

        if (payload.field === 'text') {
            target.textContent = value;
            return;
        }

        target.setAttribute(payload.field, value);
    }, [getIframeElement]);

    const applyVisualPreviewEdit = useCallback((payload: VisualEditPayload) => {
        setPreviewValue(payload, payload.newValue);
    }, [setPreviewValue]);

    const revertVisualPreviewEdit = useCallback((payload: VisualEditPayload) => {
        setPreviewValue(payload, payload.originalValue);
    }, [setPreviewValue]);

    const getCurrentPreviewPath = useCallback(() => {
        if (!projectId) return undefined;

        try {
            const href = iframeRef.current?.contentWindow?.location.href || iframeRef.current?.src;
            if (!href) return undefined;

            const url = new URL(href, window.location.origin);
            const marker = `/preview/${projectId}/`;

            if (!url.pathname.startsWith(marker)) {
                return undefined;
            }

            const path = decodeURIComponent(url.pathname.slice(marker.length));
            return path || 'index.html';
        } catch {
            return undefined;
        }
    }, [projectId]);

    const handleVisualEditSaved = useCallback((response: VisualEditResponse) => {
        if (response.warning) {
            toast.warning(response.warning);
        }

        onVisualEditSaved?.(response);
    }, [onVisualEditSaved]);

    // Handle edit from context menu
    const handleEdit = useCallback((element: InspectorElement) => {
        closeContextMenu();
        setVisualEditValues(readVisualEditValues(element));
        setVisualEditElement(element);
    }, [closeContextMenu, readVisualEditValues]);

    // Handle copy selector
    const handleCopySelector = useCallback((_selector: string) => {
        closeContextMenu();
        toast.success(t('Selector copied to clipboard'));
    }, [closeContextMenu, t]);

    // Handle code edit from context menu
    const handleViewCode = useCallback((element: InspectorElement, scope: SectionCodeEditScope) => {
        closeContextMenu();

        const selected = getIframeElement(element.cssSelector);
        const target = selected ? findCodeEditTarget(selected, scope) : null;

        if (!target) {
            toast.error(t('Unable to read selected element code'));
            return;
        }

        setSectionCodeElement(serializePreviewElement(target));
        setSectionCodeOuterHtml(target.outerHTML);
    }, [closeContextMenu, getIframeElement, t]);

    const handleSectionCodeSaved = useCallback((response: SectionCodeSaveResponse) => {
        if (response.warning) {
            toast.warning(response.warning);
        }

        onVisualEditSaved?.(response);
    }, [onVisualEditSaved]);

    // Handle save all edits
    const handleSaveAll = useCallback(async () => {
        if (!onSaveAllEdits) return;
        setIsSaving(true);
        try {
            await onSaveAllEdits();
            toast.success(t('Visual changes saved'));
        } catch {
            toast.error(t('Failed to save changes'));
        } finally {
            setIsSaving(false);
        }
    }, [onSaveAllEdits, t]);

    // Handle discard all edits - revert values in iframe first
    const handleDiscardAll = useCallback(() => {
        if (!onDiscardAllEdits) return;
        revertEdits(pendingEdits);
        onDiscardAllEdits();
    }, [revertEdits, pendingEdits, onDiscardAllEdits]);

    // Handle remove single edit - revert value in iframe first
    const handleRemoveEdit = useCallback((id: string) => {
        const edit = pendingEdits.find(e => e.id === id);
        if (edit) {
            revertEdits([edit]);
        }
        onRemoveEdit?.(id);
    }, [pendingEdits, revertEdits, onRemoveEdit]);

    // Toggle between inspect and edit modes (within inspect tab)
    const toggleInspectorMode = useCallback((newMode: InspectorMode) => {
        setInspectorMode(newMode);
    }, [setInspectorMode]);

    if (previewUrl) {
        return (
            <div ref={containerRef} className="h-full w-full flex flex-col bg-background relative overflow-hidden">
                <GradientBackground />

                {/* Preview toolbar */}
                <div className="h-10 px-3 border-b flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-sm z-20">
                    {mode === 'inspect' ? (
                        <>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant={inspectorMode === 'inspect' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleInspectorMode('inspect')}
                                    className="h-7 px-3 text-xs"
                                    disabled={isBuilding || !isReady}
                                >
                                    <MousePointerClick className="h-3.5 w-3.5 me-1.5" />
                                    {t('Select')}
                                </Button>
                                <Button
                                    variant={inspectorMode === 'edit' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleInspectorMode('edit')}
                                    className="h-7 px-3 text-xs"
                                    disabled={isBuilding || !isReady}
                                >
                                    <Edit2 className="h-3.5 w-3.5 me-1.5" />
                                    {t('Edit')}
                                </Button>
                            </div>

                            <div className="hidden md:flex items-center gap-2">
                                {!isReady && !isBuilding && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        {t('Initializing...')}
                                    </span>
                                )}
                                {isReady && !isBuilding && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        {inspectorMode === 'inspect'
                                            ? t('Click any element to see options')
                                            : t('Double-click text to edit inline')}
                                    </span>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-xs text-muted-foreground">
                            {activeDevice.label}
                        </div>
                    )}

                    <div className="flex items-center gap-1 rounded-md border bg-background p-0.5">
                        {DEVICE_MODES.map((device) => (
                            <Button
                                key={device.id}
                                variant={deviceMode === device.id ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => changeDeviceMode(device.id)}
                                title={t(device.label)}
                            >
                                <device.icon className="h-3.5 w-3.5" />
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Main content area */}
                <div className="flex-1 min-h-0 flex relative z-10">
                    {/* Theme designer panel - only in design mode */}
                    {mode === 'design' && themeDesignerSlot && (
                        <div className="w-80 shrink-0 border-e bg-background h-full overflow-hidden relative z-10">
                            {React.isValidElement(themeDesignerSlot)
                                ? React.cloneElement(themeDesignerSlot as React.ReactElement<{ onThemeSelect?: (presetId: string) => void }>, {
                                    onThemeSelect: wrappedOnThemeSelect,
                                })
                                : themeDesignerSlot}
                        </div>
                    )}

                    {/* iframe container */}
                    <div className="flex-1 min-h-0 relative bg-muted/30 overflow-auto">
                        <div
                            className={`h-full min-h-full bg-background transition-[width] duration-200 ${
                                activeDevice.width ? 'mx-auto shadow-2xl ring-1 ring-border' : 'w-full'
                            }`}
                            style={activeDevice.width ? { width: activeDevice.width } : undefined}
                        >
                            <iframe
                                ref={iframeRef}
                                key={refreshTrigger}
                                src={`${previewUrl}?t=${refreshTrigger}`}
                                className="w-full h-full border-0 bg-background"
                                title="Preview"
                                sandbox="allow-scripts allow-same-origin"
                            />
                        </div>

                        {/* Confetti canvas */}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 z-30 pointer-events-none w-full h-full"
                        />

                        {/* Building overlay */}
                        {isBuilding && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-md">
                                <BuildingAnimation t={t} />
                            </div>
                        )}

                        {/* Theme saving overlay - only in design mode */}
                        {mode === 'design' && isSavingTheme && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-md">
                                <div className="flex flex-col items-center gap-5 bg-card px-10 py-8 rounded-xl shadow-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}>
                                            <Bot className="h-8 w-8 text-primary" />
                                        </div>
                                        <div className="animate-spin" style={{ animationDuration: '3s' }}>
                                            <Cog className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                        <div className="animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}>
                                            <Wrench className="h-8 w-8 text-primary" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-medium text-lg">{t('Applying theme...')}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">{t('This may take a moment')}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending edits panel - only in inspect mode */}
                {mode === 'inspect' && (
                    <PendingEditsPanel
                        edits={pendingEdits}
                        onSaveAll={handleSaveAll}
                        onDiscardAll={handleDiscardAll}
                        onRemoveEdit={handleRemoveEdit}
                        isSaving={isSaving}
                    />
                )}

                {/* Context menu - only in inspect mode */}
                {mode === 'inspect' && contextMenu && createPortal(
                    <ElementContextMenu
                        element={contextMenu.element}
                        position={contextMenu.position}
                        onMention={handleMention}
                        onEdit={handleEdit}
                        onCopySelector={handleCopySelector}
                        onViewCode={handleViewCode}
                        onClose={closeContextMenu}
                    />,
                    document.body
                )}

                <VisualEditModal
                    open={!!visualEditElement}
                    projectId={projectId}
                    element={visualEditElement}
                    initialValues={visualEditValues}
                    previewPath={getCurrentPreviewPath()}
                    onOpenChange={(open) => {
                        if (!open) {
                            setVisualEditElement(null);
                            setVisualEditValues({});
                        }
                    }}
                    onApplyPreview={applyVisualPreviewEdit}
                    onRevertPreview={revertVisualPreviewEdit}
                    onSaved={handleVisualEditSaved}
                    onFileUploaded={onProjectFileUploaded}
                />

                <SectionCodeEditModal
                    open={!!sectionCodeElement}
                    projectId={projectId}
                    element={sectionCodeElement}
                    outerHTML={sectionCodeOuterHtml}
                    previewPath={getCurrentPreviewPath()}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSectionCodeElement(null);
                            setSectionCodeOuterHtml('');
                        }
                    }}
                    onSaved={handleSectionCodeSaved}
                />
            </div>
        );
    }

    // Empty state
    return (
        <div ref={containerRef} className="h-full w-full flex items-center justify-center bg-background relative overflow-hidden">
            <GradientBackground />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-30 pointer-events-none w-full h-full"
            />
            <div className="relative z-10 flex flex-col items-center text-center max-w-sm px-6">
                {isBuilding ? (
                    <BuildingAnimation t={t} />
                ) : (
                    <div className="prose prose-sm dark:prose-invert">
                        <h3 className="text-2xl font-semibold bg-gradient-to-r from-primary to-primary/80 dark:from-primary dark:to-primary/70 bg-clip-text text-transparent mb-3">
                            {t('Nothing built yet')}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                            {t('Start a conversation with the AI to build your website. Your project will appear here.')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InspectPreview;
