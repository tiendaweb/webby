import { useState, useRef, useEffect, useCallback } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { NotificationBell } from '@/components/Notifications/NotificationBell';
import { MessageBubble } from '@/components/Chat/MessageBubble';
import { FileTree } from '@/components/Code/FileTree';
import { CodeEditor } from '@/components/Code/CodeEditor';
import { MessageListSkeleton } from '@/components/Skeleton';
import { useBuilderChat, BroadcastConfig, CompleteEvent } from '@/hooks/useBuilderChat';
import { sanitizeBuilderError } from '@/lib/builderErrors';
import { useChatSounds, SoundSettings } from '@/hooks/useChatSounds';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserChannel } from '@/hooks/useUserChannel';
import { useTranslation } from '@/contexts/LanguageContext';
import { PageProps, User } from '@/types';
import type { UserNotification } from '@/types/notifications';
import { Home, Eye, Code, Loader2, Hammer, ExternalLink, Brain, Settings, Globe, MousePointerClick, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import axios from 'axios';
import PublishModal from '@/components/Project/PublishModal';
import { ProjectSettingsPanel } from '@/components/Project/ProjectSettingsPanel';
import { InspectPreview } from '@/components/Preview/InspectPreview';
import { ChatInputWithMentions } from '@/components/Chat/ChatInputWithMentions';
import { BuildCreditsIndicator } from '@/components/Chat/BuildCreditsIndicator';
import { ThemeDesigner } from '@/components/Design/ThemeDesigner';
import { useBuildCredits, BuildCreditsInfo } from '@/hooks/useBuildCredits';
import type { ElementMention, PendingEdit } from '@/types/inspector';
import type { AttachedFile } from '@/types/chat';

interface Project {
    id: string;
    name: string;
    initial_prompt: string | null;
    has_history: boolean;
    conversation_history: Array<{
        role: 'user' | 'assistant' | 'action';
        content: string;
        timestamp: string;
        category?: string;
        thinking_duration?: number;
        files?: Array<{ id: number; filename: string; mime_type: string }>;
    }>;
    preview_url: string | null;
    has_active_session: boolean;
    build_session_id: string | null;
    // Reconnection-related fields
    build_status?: string;
    can_reconnect?: boolean;
    build_started_at?: string | null;
    // Publishing fields
    subdomain: string | null;
    published_title: string | null;
    published_description: string | null;
    published_visibility: string;
    published_at: string | null;
    // Settings fields
    custom_instructions: string | null;
    theme_preset: string | null;
    share_image: string | null;
    api_token?: string | null;
}

interface FirebaseSettings {
    enabled: boolean;
    canUseOwnConfig: boolean;
    usesSystemFirebase: boolean;
    customConfig: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
    } | null;
    systemConfigured: boolean;
    collectionPrefix: string;
    adminSdkConfigured: boolean;
    adminSdkStatus: {
        configured: boolean;
        is_system: boolean;
        project_id: string | null;
        client_email: string | null;
    };
}

interface StorageSettings {
    enabled: boolean;
    usedBytes: number;
    limitMb: number | null;
    unlimited: boolean;
    maxFileSizeMb?: number;
    allowedTypes?: string[] | null;
}

interface ChatPageProps extends PageProps {
    project: Project;
    user: User;
    pusherConfig: BroadcastConfig;
    soundSettings: SoundSettings;
    // Publishing props
    baseDomain: string;
    canUseSubdomains: boolean;
    canCreateMoreSubdomains: boolean;
    canUsePrivateVisibility: boolean;
    suggestedSubdomain: string;
    subdomainUsage: {
        used: number;
        limit: number | null;
        unlimited: boolean;
        remaining: number;
    };
    // Storage & Database props
    firebase?: FirebaseSettings;
    storage?: StorageSettings;
    projectFiles?: AttachedFile[];
    // Build credits
    buildCredits: BuildCreditsInfo;
}

type ViewMode = 'preview' | 'inspect' | 'code' | 'design' | 'settings';

const VIEW_MODES: ViewMode[] = ['preview', 'inspect', 'code', 'design', 'settings'];

function getInitialViewMode(): ViewMode {
    if (typeof window === 'undefined') return 'preview';
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && VIEW_MODES.includes(tab as ViewMode)) {
        return tab as ViewMode;
    }
    return 'preview';
}

export default function Chat({
    project,
    user: _user,
    pusherConfig,
    soundSettings,
    baseDomain,
    canUseSubdomains,
    canCreateMoreSubdomains,
    canUsePrivateVisibility,
    suggestedSubdomain,
    subdomainUsage,
    firebase,
    storage,
    projectFiles: initialProjectFiles,
    buildCredits,
}: ChatPageProps) {
    const { t } = useTranslation();

    // Get unread notification count from shared props
    const { unreadNotificationCount } = usePage<PageProps & { unreadNotificationCount: number }>().props;

    // Notification state
    const {
        notifications,
        unreadCount,
        isLoading: isLoadingNotifications,
        addNotification,
        markAsRead,
        markAllAsRead,
    } = useNotifications(unreadNotificationCount);

    // Subscribe to user channel for real-time notification updates
    useUserChannel({
        userId: _user.id,
        broadcastConfig: pusherConfig,
        enabled: !!pusherConfig?.key,
        onNotification: (notification: UserNotification) => {
            addNotification(notification);
            // Show toast for important notifications (but not build_complete/failed since we're on chat page)
            if (notification.type === 'credits_low') {
                toast(notification.title, {
                    description: notification.message,
                });
            }
        },
        onCreditsUpdated: (updated) => {
            updateCredits({
                remaining: updated.remaining,
                monthlyLimit: updated.monthlyLimit,
                isUnlimited: updated.isUnlimited,
                usingOwnKey: updated.usingOwnKey,
            });
        },
    });
    const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

    // Sync viewMode to URL
    useEffect(() => {
        const url = new URL(window.location.href);
        if (viewMode === 'preview') {
            url.searchParams.delete('tab');
        } else {
            url.searchParams.set('tab', viewMode);
        }
        window.history.replaceState({}, '', url.toString());
    }, [viewMode]);

    const [prompt, setPrompt] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);
    const [previewRefreshTrigger, setPreviewRefreshTrigger] = useState(() => Date.now());
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const initialSent = useRef(false);
    const [thinkingStartTime, setThinkingStartTime] = useState<number | null>(null);
    const [thinkingDuration, setThinkingDuration] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const lastAssistantMessageCount = useRef<number>(0);
    const [failedMessages, setFailedMessages] = useState<Array<{message: string; timestamp: number}>>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [publishModalOpen, setPublishModalOpen] = useState(false);

    // File attachment state for @mentions and uploads
    const [localProjectFiles, setLocalProjectFiles] = useState<AttachedFile[]>(initialProjectFiles ?? []);
    const [uploadedFiles, setUploadedFiles] = useState<AttachedFile[]>([]);

    const handleFileUploaded = useCallback((file: AttachedFile) => {
        setLocalProjectFiles(prev => [file, ...prev]);
        setUploadedFiles(prev => [...prev, file]);
    }, []);

    const handleRemoveUploadedFile = useCallback((fileId: number) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    }, []);

    // Handle files dropped onto the chat input — upload via axios and add as badges
    const handleFilesDropped = useCallback(async (files: File[]) => {
        if (!storage?.enabled || !project.id) return;
        const formData = new FormData();
        for (const file of files) {
            formData.set('file', file);
            try {
                const response = await axios.post(`/project/${project.id}/files`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const serverFile = response.data.file;
                const attached: AttachedFile = {
                    id: serverFile.id,
                    filename: serverFile.original_filename,
                    mime_type: serverFile.mime_type,
                    size: serverFile.size,
                    human_size: serverFile.human_size,
                    is_image: serverFile.is_image,
                    url: serverFile.url,
                };
                handleFileUploaded(attached);
            } catch {
                // Upload errors are handled server-side; skip failed files
            }
        }
    }, [storage?.enabled, project.id, handleFileUploaded]);

    // Element selection state for inspect mode
    const [selectedElement, setSelectedElement] = useState<ElementMention | null>(null);
    const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);

    // Theme designer state
    const [isSavingTheme, setIsSavingTheme] = useState(false);
    const [appliedTheme, setAppliedTheme] = useState(project.theme_preset);
    const [captureThumbnailTrigger, setCaptureThumbnailTrigger] = useState(0);

    // Theme preview callback - passed to InspectPreview which has the iframe ref
    const applyThemeToPreview = useCallback((_presetId: string) => {
        // Theme application is handled internally by InspectPreview
        // This callback is kept for the ThemeDesigner onThemeSelect prop
    }, []);

    // Sound effects for chat events
    const { playSound } = useChatSounds({ settings: soundSettings });

    // Build credits tracking with refresh capability
    const { credits, isRefreshing: isRefreshingCredits, update: updateCredits } = useBuildCredits(buildCredits);

    // Play sound when project is opened
    const hasPlayedOpenSound = useRef(false);
    useEffect(() => {
        if (!hasPlayedOpenSound.current) {
            playSound('open');
            hasPlayedOpenSound.current = true;
        }
    }, [playSound]);

    // Scroll support for suggestions - convert vertical wheel to horizontal scroll
    const suggestionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = suggestionsRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        // Use non-passive listener to allow preventDefault
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [suggestions]);

    const handleComplete = useCallback((event: CompleteEvent) => {
        playSound('complete');
        if (event.files_changed) {
            toast.success(t('Build complete! Files have been updated.'));
        } else {
            toast.success(t('Build complete!'));
        }
    }, [playSound, t]);

    const handleError = useCallback((error: string) => {
        playSound('error');
        toast.error(error);
    }, [playSound]);

    const handleMessage = useCallback(() => {
        playSound('message');
    }, [playSound]);

    const handleAction = useCallback(() => {
        playSound('action');
    }, [playSound]);

    const handleBuildComplete = useCallback((_previewUrl: string) => {
        setPreviewRefreshTrigger(Date.now());
        playSound('build');
    }, [playSound]);

    const errorSanitizer = useCallback(
        (rawError: string) => sanitizeBuilderError(rawError, t),
        [t]
    );

    const {
        messages,
        progress,
        isLoading,
        sendMessage,
        cancelBuild,
        triggerBuild,
        isBuildingPreview,
    } = useBuilderChat(project.id, {
        pusherConfig,
        initialHistory: project.conversation_history,
        initialPreviewUrl: project.preview_url,
        // Pass initial reconnection state from server
        initialSessionId: project.build_session_id,
        initialCanReconnect: project.can_reconnect ?? false,
        onComplete: handleComplete,
        onError: handleError,
        onMessage: handleMessage,
        onAction: handleAction,
        onBuildComplete: handleBuildComplete,
        errorSanitizer,
    });

    // Track if initial scroll has been done
    const initialScrollDone = useRef(false);

    // Clear initial loading state after first render
    useEffect(() => {
        const timer = setTimeout(() => setInitialLoading(false), 100);
        return () => clearTimeout(timer);
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (!initialScrollDone.current && messages.length > 0) {
            // Initial load: use instant scroll with a small delay to ensure content is rendered
            const timer = setTimeout(() => {
                scrollEndRef.current?.scrollIntoView({ behavior: 'instant' });
                initialScrollDone.current = true;
            }, 100);
            return () => clearTimeout(timer);
        } else if (initialScrollDone.current) {
            // Subsequent updates: use smooth scroll
            scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, progress, failedMessages]);

    // Scroll to bottom when suggestions panel appears (to prevent covering last message)
    const prevSuggestionsVisible = useRef(false);
    useEffect(() => {
        const isVisible = isLoadingSuggestions || (suggestions.length > 0 && !isLoading);
        if (isVisible && !prevSuggestionsVisible.current) {
            // Small delay to let the suggestions render and layout adjust
            const timer = setTimeout(() => {
                scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
            prevSuggestionsVisible.current = isVisible;
            return () => clearTimeout(timer);
        }
        prevSuggestionsVisible.current = isVisible;
    }, [suggestions, isLoadingSuggestions, isLoading]);

    // Calculate thinking duration when build completes
    useEffect(() => {
        if (progress.status === 'completed' && thinkingStartTime) {
            const duration = Math.round((Date.now() - thinkingStartTime) / 1000);
            setThinkingDuration(duration);
            setThinkingStartTime(null);
        }
    }, [progress.status, thinkingStartTime]);

    // Send initial message from project prompt (only for new projects with no history)
    useEffect(() => {
        if (project.initial_prompt && !initialSent.current && !project.has_history) {
            initialSent.current = true;
            playSound('send');
            setThinkingStartTime(Date.now());
            setThinkingDuration(null);
            sendMessage(project.initial_prompt);
        }
    }, [project.initial_prompt, project.has_history, sendMessage, playSound]);

    // Auto-rebuild preview for projects with history but no preview
    const autoRebuildTriggered = useRef(false);
    useEffect(() => {
        if (project.has_history && !project.preview_url && project.build_status !== 'building' && !autoRebuildTriggered.current) {
            autoRebuildTriggered.current = true;
            triggerBuild();
        }
    }, [project.has_history, project.preview_url, project.build_status, triggerBuild]);

    // Fetch AI suggestions
    const fetchSuggestions = useCallback(async () => {
        setIsLoadingSuggestions(true);
        try {
            const response = await axios.get(`/project/${project.id}/suggestions`);
            if (response.data.suggestions) {
                setSuggestions(response.data.suggestions);
            }
        } catch {
            // Silently fail - suggestions are optional
            setSuggestions([]);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [project.id]);

    // Track if initial page load is complete
    const isInitialLoad = useRef(true);

    // Fetch suggestions when a new assistant message arrives (deferred on initial load)
    useEffect(() => {
        const assistantMessages = messages.filter(m => m.type === 'assistant');
        const currentCount = assistantMessages.length;

        // Skip if no assistant messages or count hasn't changed
        if (currentCount === 0 || currentCount === lastAssistantMessageCount.current || isLoading) {
            return;
        }

        lastAssistantMessageCount.current = currentCount;

        // Defer suggestions fetch on initial load to not block page render
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            // Use requestIdleCallback or setTimeout to fetch after page is interactive
            const timeoutId = setTimeout(() => {
                fetchSuggestions();
            }, 1000); // 1 second delay for initial load
            return () => clearTimeout(timeoutId);
        }

        // For subsequent messages, fetch immediately
        fetchSuggestions();
    }, [messages, isLoading, fetchSuggestions]);

    // Fill input when suggestion is clicked
    const handleSuggestionClick = (suggestion: string) => {
        setPrompt(suggestion);
        setSuggestions([]);
    };

    const handleSubmit = async (e: React.FormEvent, fileData?: { fileIds: number[]; attachedFiles: AttachedFile[] }) => {
        e.preventDefault();
        if ((!prompt.trim() && !selectedElement && !fileData?.fileIds.length) || isLoading) return;

        const msg = prompt.trim();
        const elementContext = selectedElement ? {
            tagName: selectedElement.tagName,
            selector: selectedElement.selector,
            textPreview: selectedElement.textPreview,
        } : undefined;

        setPrompt('');
        setSelectedElement(null); // Clear selected element after sending
        setUploadedFiles([]); // Clear uploaded file badges after sending
        setSuggestions([]); // Clear suggestions when sending

        // Check if builder is online before sending
        try {
            const healthResponse = await axios.get(`/builder/projects/${project.id}/health`);
            if (!healthResponse.data.online) {
                // Builder offline - add to failed messages (local state only, disappears on reload)
                setFailedMessages(prev => [...prev, { message: msg, timestamp: Date.now() }]);
                return;
            }
        } catch {
            // Builder unreachable - add to failed messages (local state only, disappears on reload)
            setFailedMessages(prev => [...prev, { message: msg, timestamp: Date.now() }]);
            return;
        }

        // Builder online - proceed with sending
        playSound('send');
        setThinkingStartTime(Date.now());
        setThinkingDuration(null);
        await sendMessage(msg, {
            elementContext,
            fileIds: fileData?.fileIds,
            attachedFiles: fileData?.attachedFiles,
        });
    };

    // Element selection handler for inspect mode
    const handleElementSelect = useCallback((element: ElementMention) => {
        setSelectedElement(element);
    }, []);

    // Handler for inline edits from inspect mode
    const handleElementEdit = useCallback((edit: PendingEdit) => {
        setPendingEdits(prev => {
            // Replace if editing same element and field
            const existingIndex = prev.findIndex(
                e => e.element.cssSelector === edit.element.cssSelector && e.field === edit.field
            );
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = edit;
                return updated;
            }
            return [...prev, edit];
        });
    }, []);

    // Save all pending edits to AI
    const handleSaveAllEdits = useCallback(async () => {
        if (pendingEdits.length === 0) return;

        const editLines = pendingEdits.map((edit, i) => {
            if (edit.field === 'text') {
                return `${i + 1}. <${edit.element.tagName}${edit.element.cssSelector}>: "${edit.originalValue}" → "${edit.newValue}"`;
            }
            return `${i + 1}. <${edit.element.tagName}> ${edit.field}: "${edit.originalValue}" → "${edit.newValue}"`;
        }).join('\n');

        const message = `[BATCH_EDIT] Update multiple elements:\n${editLines}`;
        await sendMessage(message);
        setPendingEdits([]);
    }, [pendingEdits, sendMessage]);

    // Discard all pending edits
    const handleDiscardAllEdits = useCallback(() => {
        setPendingEdits([]);
    }, []);

    // Remove a single pending edit
    const handleRemoveEdit = useCallback((id: string) => {
        setPendingEdits(prev => prev.filter(e => e.id !== id));
    }, []);

    const currentAction = progress.actions.length > 0
        ? progress.actions[progress.actions.length - 1]
        : null;

    // Get status text for header
    const getStatusText = () => {
        if (progress.status === 'connecting') return t('Connecting...');
        if (progress.status === 'running') {
            if (currentAction) {
                return `${currentAction.action}: ${currentAction.target || ''}`.slice(0, 30);
            }
            return t('Building...');
        }
        if (isLoading) return t('AI working...');
        return t('Ready');
    };

    return (
        <>
            <Head title={project.name} />
            <Toaster />

            <div className="h-screen flex bg-background text-foreground">
                {/* Start: Chat Column - Full width on mobile, fixed width on larger screens */}
                <div className="w-full md:w-[420px] shrink-0 md:border-e flex flex-col">
                    {/* Chat Header */}
                    <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-background">
                        <div className="min-w-0 flex-1">
                            {/* Desktop: switch to settings view */}
                            <button
                                onClick={() => setViewMode('settings')}
                                className="hover:underline text-start hidden md:block w-full min-w-0"
                            >
                                <h1 className="text-sm font-semibold truncate">
                                    {project.name}
                                </h1>
                            </button>
                            {/* Mobile: navigate to settings page */}
                            <Link
                                href={`/project/${project.id}/settings`}
                                className="hover:underline md:hidden block w-full min-w-0"
                            >
                                <h1 className="text-sm font-semibold truncate">
                                    {project.name}
                                </h1>
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">
                                {isLoading ? (
                                    <span className="flex items-center gap-1.5">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        {getStatusText()}
                                    </span>
                                ) : (
                                    getStatusText()
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Mobile only: navigate to settings page (desktop has Settings tab in preview panel) */}
                            <Button variant="ghost" size="icon" asChild className="md:hidden">
                                <Link href={`/project/${project.id}/settings`}>
                                    <Settings className="h-4 w-4" />
                                </Link>
                            </Button>
                            <NotificationBell
                                notifications={notifications}
                                unreadCount={unreadCount}
                                onMarkAsRead={markAsRead}
                                onMarkAllAsRead={markAllAsRead}
                                isLoading={isLoadingNotifications}
                            />
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="/create">
                                    <Home className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-4 space-y-4">
                            {initialLoading && messages.length === 0 ? (
                                <MessageListSkeleton count={3} />
                            ) : messages.length === 0 && !isLoading ? (
                                <div className="text-center py-12">
                                    <div className="w-12 h-12 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
                                        <span className="text-primary-foreground text-xl">{'\u2728'}</span>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert">
                                        <h2 className="text-lg font-semibold mb-2">
                                            {t('What do you want to build?')}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {t("Describe your website and I'll create it for you")}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    // Show thinking duration for assistant messages
                                    // Use saved thinkingDuration from history, or current session's calculated duration for last message
                                    const isLastAssistant = msg.type === 'assistant' && index === messages.length - 1;
                                    const displayDuration = msg.thinkingDuration ?? (isLastAssistant && !isLoading ? thinkingDuration : null);
                                    const showThinkingDuration = msg.type === 'assistant' && displayDuration !== null && displayDuration !== undefined;

                                    return (
                                        <div key={msg.id}>
                                            {showThinkingDuration && (
                                                <div className="prose prose-xs dark:prose-invert flex items-center gap-2 text-muted-foreground text-sm mb-2 ms-11">
                                                    <span>{'\uD83D\uDCAD'}</span>
                                                    <span>{t('Thought for :duration s', { duration: displayDuration })}</span>
                                                </div>
                                            )}
                                            <MessageBubble message={msg} />
                                        </div>
                                    );
                                })
                            )}

                            {/* Failed message indicator (local state only) */}
                            {failedMessages.map((failed) => (
                                <div key={failed.timestamp} className="flex flex-col items-end gap-1 animate-fade-in">
                                    <div className="max-w-[85%] px-4 py-2 rounded-2xl ltr:rounded-br-md rtl:rounded-bl-md bg-primary text-primary-foreground">
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                            {failed.message}
                                        </p>
                                    </div>
                                    <p className="text-xs text-destructive me-2">
                                        {t('Builder offline, message not sent')}
                                    </p>
                                </div>
                            ))}

                            {/* AI Working Indicator */}
                            {isLoading && (
                                <div className="sticky bottom-0 z-10 flex justify-center py-2 bg-gradient-to-t from-background via-background/80 to-transparent">
                                    <div className="flex items-center gap-2 animate-fade-in rounded-full bg-muted/60 backdrop-blur-sm border border-border/50 px-3 py-1.5 shadow-sm">
                                        <Brain className="w-4 h-4 animate-rainbow-icon" />
                                        <span className="text-sm font-medium animate-rainbow">{t('Thinking...')}</span>
                                        {currentAction && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {`${currentAction.action}: ${currentAction.target || ''}`.slice(0, 40)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div ref={scrollEndRef} />
                        </div>
                    </ScrollArea>

                    {/* Floating suggestions - pinned to bottom of messages */}
                    {(isLoadingSuggestions || (suggestions.length > 0 && !isLoading)) && (
                        <div className="relative w-full bg-background py-2">
                            {isLoadingSuggestions ? (
                                <div className="flex gap-2 px-4">
                                    <Skeleton className="h-6 w-28 rounded-full shrink-0" />
                                    <Skeleton className="h-6 w-36 rounded-full shrink-0" />
                                    <Skeleton className="h-6 w-24 rounded-full shrink-0" />
                                </div>
                            ) : (
                                <>
                                    <div
                                        ref={suggestionsRef}
                                        className="flex w-full select-none flex-nowrap gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide"
                                    >
                                        {suggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleSuggestionClick(suggestion)}
                                                className="px-2.5 py-1 text-xs bg-primary hover:bg-primary/90 rounded-full text-primary-foreground transition-colors whitespace-nowrap flex-none"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Fade effect on end edge - sibling of scroll container */}
                                    <div className="pointer-events-none absolute end-0 top-0 h-full w-16 ltr:bg-gradient-to-l rtl:bg-gradient-to-r from-background to-transparent" />
                                </>
                            )}
                        </div>
                    )}

                    {/* Input */}
                    <div className="pt-2 px-4 pb-4 border-t bg-background">
                        <div className="pb-1 flex items-center justify-between">
                            <BuildCreditsIndicator {...credits} isRefreshing={isRefreshingCredits} />
                            <div className="flex items-center gap-2">
                                <ThemeToggle />
                                <LanguageSelector />
                            </div>
                        </div>
                        <ChatInputWithMentions
                            value={prompt}
                            onChange={setPrompt}
                            onSubmit={handleSubmit}
                            disabled={isLoading}
                            selectedElement={selectedElement}
                            onClearElement={() => setSelectedElement(null)}
                            placeholder={t('Describe what you want to build...')}
                            isLoading={isLoading}
                            onCancel={cancelBuild}
                            storageEnabled={storage?.enabled ?? false}
                            projectId={project.id}
                            maxFileSizeMb={storage?.maxFileSizeMb ?? 10}
                            allowedTypes={storage?.allowedTypes ?? null}
                            projectFiles={localProjectFiles}
                            uploadedFiles={uploadedFiles}
                            onFileUploaded={handleFileUploaded}
                            onRemoveUploadedFile={handleRemoveUploadedFile}
                            onFilesDropped={handleFilesDropped}
                        />
                    </div>
                </div>

                {/* Right: Preview/Code Column - Hidden on mobile */}
                <div className="hidden md:flex flex-1 flex-col overflow-hidden">
                    {/* Preview Header */}
                    <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-background">
                        {/* View toggle */}
                        <div className="flex items-center border rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                                    viewMode === 'preview'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <Eye className="h-4 w-4" />
                                {t('Preview')}
                            </button>
                            <div className="w-px h-6 bg-border" />
                            <button
                                onClick={() => setViewMode('inspect')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                                    viewMode === 'inspect'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <MousePointerClick className="h-4 w-4" />
                                {t('Inspect')}
                            </button>
                            <div className="w-px h-6 bg-border" />
                            <button
                                onClick={() => setViewMode('design')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                                    viewMode === 'design'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <Palette className="h-4 w-4" />
                                {t('Design')}
                            </button>
                            <div className="w-px h-6 bg-border" />
                            <button
                                onClick={() => setViewMode('code')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                                    viewMode === 'code'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <Code className="h-4 w-4" />
                                {t('Code')}
                            </button>
                            <div className="w-px h-6 bg-border" />
                            <button
                                onClick={() => setViewMode('settings')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                                    viewMode === 'settings'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <Settings className="h-4 w-4" />
                                {t('Settings')}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Preview actions */}
                            {viewMode === 'preview' && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            playSound('build');
                                            await triggerBuild();
                                            setPreviewRefreshTrigger(Date.now());
                                        }}
                                        disabled={isBuildingPreview}
                                        className="h-8"
                                    >
                                        {isBuildingPreview ? (
                                            <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                                        ) : (
                                            <Hammer className="h-4 w-4 me-1.5" />
                                        )}
                                        {t('Rebuild')}
                                    </Button>
                                    {progress.previewUrl && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(project.subdomain ? `https://${project.subdomain}.${baseDomain}` : `/app/${project.id}`, '_blank')}
                                                className="h-8"
                                            >
                                                <ExternalLink className="h-4 w-4 me-1.5" />
                                                {t('Open')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPublishModalOpen(true)}
                                                className="h-8"
                                            >
                                                <Globe className="h-4 w-4 me-1.5" />
                                                {project.subdomain ? t('Published') : t('Publish')}
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                        {viewMode === 'settings' ? (
                            <ProjectSettingsPanel
                                project={project}
                                baseDomain={baseDomain}
                                canUseSubdomains={canUseSubdomains}
                                canCreateMoreSubdomains={canCreateMoreSubdomains}
                                canUsePrivateVisibility={canUsePrivateVisibility}
                                subdomainUsage={subdomainUsage}
                                suggestedSubdomain={suggestedSubdomain}
                                firebase={firebase}
                                storage={storage}
                            />
                        ) : viewMode === 'code' ? (
                            <div className="flex h-full">
                                {/* File Tree */}
                                <div className="w-56 shrink-0 border-e">
                                    <FileTree
                                        projectId={project.id}
                                        onFileSelect={setSelectedFile}
                                        selectedFile={selectedFile}
                                        refreshTrigger={fileRefreshTrigger}
                                    />
                                </div>
                                {/* Code Editor */}
                                <div className="flex-1 overflow-hidden">
                                    <CodeEditor
                                        projectId={project.id}
                                        selectedFile={selectedFile}
                                        onSave={() => setFileRefreshTrigger(tf => tf + 1)}
                                    />
                                </div>
                            </div>
                        ) : (
                            // Single unified preview for preview/inspect/design modes
                            <InspectPreview
                                projectId={project.id}
                                mode={viewMode as 'preview' | 'inspect' | 'design'}
                                previewUrl={progress.previewUrl}
                                refreshTrigger={previewRefreshTrigger}
                                isBuilding={isBuildingPreview}
                                captureThumbnailTrigger={captureThumbnailTrigger}
                                onElementSelect={handleElementSelect}
                                onElementEdit={handleElementEdit}
                                pendingEdits={pendingEdits}
                                onSaveAllEdits={handleSaveAllEdits}
                                onDiscardAllEdits={handleDiscardAllEdits}
                                onRemoveEdit={handleRemoveEdit}
                                onThemeSelect={applyThemeToPreview}
                                isSavingTheme={isSavingTheme}
                                currentTheme={appliedTheme}
                                themeDesignerSlot={
                                    <ThemeDesigner
                                        currentTheme={appliedTheme}
                                        onThemeSelect={applyThemeToPreview}
                                        onApply={async (presetId) => {
                                            setIsSavingTheme(true);
                                            playSound('build');
                                            try {
                                                const response = await axios.put(`/project/${project.id}/theme`, {
                                                    theme_preset: presetId,
                                                });
                                                if (response.data.success) {
                                                    playSound('complete');
                                                    setAppliedTheme(presetId);
                                                    if (response.data.warning) {
                                                        toast.warning(response.data.warning);
                                                    } else {
                                                        toast.success(t('Theme applied successfully'));
                                                    }
                                                    setPreviewRefreshTrigger(Date.now());
                                                    // Trigger thumbnail capture after preview refreshes
                                                    setCaptureThumbnailTrigger(Date.now());
                                                }
                                            } catch {
                                                playSound('error');
                                                toast.error(t('Failed to apply theme'));
                                            } finally {
                                                setIsSavingTheme(false);
                                            }
                                        }}
                                        isSaving={isSavingTheme}
                                    />
                                }
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Publish Modal */}
            <PublishModal
                open={publishModalOpen}
                onOpenChange={setPublishModalOpen}
                project={project}
                baseDomain={baseDomain}
                canUseSubdomains={canUseSubdomains}
                canCreateMoreSubdomains={canCreateMoreSubdomains}
                canUsePrivateVisibility={canUsePrivateVisibility}
                suggestedSubdomain={suggestedSubdomain}
                onPublished={(url) => {
                    toast.success(t('Published to :url', { url }));
                }}
            />
        </>
    );
}


