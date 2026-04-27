import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { GradientBackground } from '@/components/Dashboard/GradientBackground';
import { ElementContextMenu } from './ElementContextMenu';
import { PendingEditsPanel } from './PendingEditsPanel';
import { usePreviewInspector } from '@/hooks/usePreviewInspector';
import { usePreviewThemeSync } from '@/hooks/usePreviewThemeSync';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { MousePointerClick, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InspectorElement, ElementMention, PendingEdit, InspectorMode } from '@/types/inspector';
import confetti from 'canvas-confetti';
import { Bot, Cog, Wrench } from 'lucide-react';
import { usePreviewThemeInjection } from '@/hooks/usePreviewThemeInjection';
import { useThumbnailCapture } from '@/hooks/useThumbnailCapture';

type PreviewMode = 'preview' | 'inspect' | 'design';

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

    // Use the preview inspector hook - only enabled in inspect mode
    const {
        inspectorMode,
        setInspectorMode,
        contextMenu,
        closeContextMenu,
        isReady,
        startEditingElement,
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

    // Handle edit from context menu
    const handleEdit = useCallback((element: InspectorElement) => {
        closeContextMenu();
        // Switch to edit mode and start editing the element
        setInspectorMode('edit');
        startEditingElement(element.cssSelector);
    }, [closeContextMenu, setInspectorMode, startEditingElement]);

    // Handle copy selector
    const handleCopySelector = useCallback((_selector: string) => {
        closeContextMenu();
        toast.success(t('Selector copied to clipboard'));
    }, [closeContextMenu, t]);

    // Handle save all edits
    const handleSaveAll = useCallback(async () => {
        if (!onSaveAllEdits) return;
        setIsSaving(true);
        try {
            await onSaveAllEdits();
            toast.success(t('Changes sent to AI for processing'));
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

                {/* Mode toggle bar - only in inspect mode */}
                {mode === 'inspect' && (
                    <div className="h-10 px-3 border-b flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-sm z-20">
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

                        <div className="flex items-center gap-2">
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
                    </div>
                )}

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
                    <div className="flex-1 min-h-0 relative">
                        <iframe
                            ref={iframeRef}
                            key={refreshTrigger}
                            src={`${previewUrl}?t=${refreshTrigger}`}
                            className="absolute inset-0 w-full h-full border-0"
                            title="Preview"
                            sandbox="allow-scripts allow-same-origin"
                        />

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
                        onClose={closeContextMenu}
                    />,
                    document.body
                )}
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
