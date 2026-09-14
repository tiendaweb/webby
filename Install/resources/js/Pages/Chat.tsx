import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
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
import { Home, Eye, Code, Loader2, Hammer, ExternalLink, Brain, Settings, Globe, MousePointerClick, Palette, Pencil, PanelLeftClose, PanelLeftOpen, History, Rows3, StickyNote, MessageSquare, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import PublishModal from '@/components/Project/PublishModal';
import { ProjectSettingsPanel } from '@/components/Project/ProjectSettingsPanel';
import { BlankProjectPanel } from '@/components/Project/BlankProjectPanel';
import { ProjectHistoryPanel } from '@/components/Project/ProjectHistoryPanel';
import { ProjectStructurePanel } from '@/components/Project/ProjectStructurePanel';
import { ProjectsDialog } from '@/components/Project/ProjectsDialog';
import { InspectPreview } from '@/components/Preview/InspectPreview';
import { ChatInputWithMentions } from '@/components/Chat/ChatInputWithMentions';
import { BuildCreditsIndicator } from '@/components/Chat/BuildCreditsIndicator';
import { ThemeDesigner } from '@/components/Design/ThemeDesigner';
import { useBuildCredits, BuildCreditsInfo } from '@/hooks/useBuildCredits';
import { buildPublishedUrl } from '@/lib/publishedUrl';
import type { ElementMention, PendingEdit, VisualEditResponse } from '@/types/inspector';
import type { AttachedFile } from '@/types/chat';

interface Project {
    id: string;
    name: string;
    type: 'ai' | 'blank';
    initial_prompt: string | null;
    has_history: boolean;
    conversation_history: Array<{
        // "note" / "note_result" are the connector lane: messages addressed
        // to an MCP assistant instead of the AI builder, and its answers.
        role: 'user' | 'assistant' | 'action' | 'note' | 'note_result';
        content: string;
        timestamp: string;
        category?: string;
        thinking_duration?: number;
        files?: Array<{ id: number; filename: string; mime_type: string }>;
        note_id?: string;
        status?: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';
        source?: string | null;
        data?: Record<string, unknown> | null;
    }>;
    preview_url: string | null;
    has_active_session: boolean;
    has_builder?: boolean;
    ai_provider_available?: boolean;
    can_use_ai_builder?: boolean;
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
    // Storage props
    firebase?: FirebaseSettings;
    storage?: StorageSettings;
    projectFiles?: AttachedFile[];
    // Build credits
    buildCredits: BuildCreditsInfo;
}

type ViewMode = 'preview' | 'inspect' | 'structure' | 'code' | 'design' | 'history' | 'settings';

const VIEW_MODES: ViewMode[] = ['preview', 'inspect', 'structure', 'code', 'design', 'history', 'settings'];

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
    const [isChatCollapsed, setIsChatCollapsed] = useState(true);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [projectName, setProjectName] = useState(project.name);

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
    /**
     * Which lane the composer sends to. "ai" is the existing behaviour and
     * the default — nothing about it changes. "note" stores the message for
     * an MCP connector to pick up, and never reaches the AI builder.
     */
    const [composerMode, setComposerMode] = useState<'ai' | 'note'>(
        project.can_use_ai_builder === true ? 'ai' : 'note'
    );
    /**
     * Which of the two columns a phone is showing. Desktop shows both side
     * by side and ignores this; below md they take turns, because the work
     * panel used to be display:none on mobile and there was simply no way
     * to reach the editor from a phone.
     */
    const [mobilePane, setMobilePane] = useState<'chat' | 'work'>('chat');
    const [isSavingNote, setIsSavingNote] = useState(false);
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

    const handleVisualProjectFileUploaded = useCallback((file: AttachedFile) => {
        setLocalProjectFiles(prev => [file, ...prev]);
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

    // Build credits tracking with refresh capability (only for AI projects)
    const canUseAi = project.can_use_ai_builder === true;
    const showBlankProjectPanelInConversation = project.type === 'blank' && canUseAi;
    const showBlankProjectPanelInComposer = project.type === 'blank' && !showBlankProjectPanelInConversation;
    const { credits, isRefreshing: isRefreshingCredits, update: updateCredits } = useBuildCredits(
        canUseAi ? buildCredits : null
    );

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
            toast.success(t('Workspace updated. Files have been changed.'));
        } else {
            toast.success(t('Workspace updated.'));
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
        applyNotes,
    } = useBuilderChat(project.id, {
        pusherConfig,
        initialHistory: project.conversation_history,
        initialPreviewUrl: project.preview_url,
        initialSessionId: canUseAi ? project.build_session_id : null,
        initialCanReconnect: canUseAi ? (project.can_reconnect ?? false) : false,
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
    // Auto-send initial prompt for AI projects only
    useEffect(() => {
        if (project.type === 'ai' && project.initial_prompt && !initialSent.current && !project.has_history) {
            initialSent.current = true;
            playSound('send');
            setThinkingStartTime(Date.now());
            setThinkingDuration(null);
            sendMessage(project.initial_prompt);
        }
    }, [project.type, project.initial_prompt, project.has_history, sendMessage, playSound]);

    // Auto-rebuild preview for AI projects with history but no preview
    const autoRebuildTriggered = useRef(false);
    useEffect(() => {
        if (project.type === 'ai' && project.has_history && !project.preview_url && project.build_status === 'completed' && !autoRebuildTriggered.current) {
            autoRebuildTriggered.current = true;
            triggerBuild();
        }
    }, [project.type, project.has_history, project.preview_url, project.build_status, triggerBuild]);

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

    // Fetch suggestions when a new assistant message arrives (deferred on initial load) - AI projects only
    useEffect(() => {
        if (!canUseAi) return;

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
    }, [canUseAi, messages, isLoading, fetchSuggestions]);

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

    /**
     * Store the composer's contents as a note instead of sending it to the
     * builder. Deliberately does not touch build credits, the builder
     * health check, or the session — a note is inert until a connector
     * picks it up.
     */
    const handleNoteSubmit = async (e: React.FormEvent, fileData?: { fileIds: number[]; attachedFiles: AttachedFile[] }) => {
        e.preventDefault();

        const content = prompt.trim();

        if (!content || isSavingNote) return;

        setIsSavingNote(true);

        try {
            const response = await axios.post(`/project/${project.id}/notes`, {
                content,
                files: fileData?.attachedFiles?.map(file => ({
                    id: file.id,
                    filename: file.filename,
                    mime_type: file.mime_type,
                })),
            });

            const note = response.data?.note;

            if (note) {
                applyNotes([{
                    note_id: note.note_id,
                    content: note.content,
                    status: note.status ?? 'pending',
                    created_at: note.timestamp ?? null,
                    results: [],
                }]);
            }

            setPrompt('');
            setUploadedFiles([]);
            toast.success(t('Note saved. A connector can pick it up — the AI builder was not called.'));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string; message?: string } } };
            toast.error(err.response?.data?.error ?? err.response?.data?.message ?? t('Could not save the note.'));
        } finally {
            setIsSavingNote(false);
        }
    };

    // Any note still waiting on a connector means the answer can arrive at
    // any moment, so the page polls until the queue is empty.
    const hasOpenNotes = messages.some(
        msg => msg.type === 'note' && (msg.noteStatus === 'pending' || msg.noteStatus === 'in_progress')
    );

    useEffect(() => {
        if (!hasOpenNotes) return;

        let cancelled = false;

        const poll = async () => {
            if (document.hidden) return;

            try {
                const response = await axios.get(`/project/${project.id}/notes`);

                if (!cancelled && Array.isArray(response.data?.notes)) {
                    applyNotes(response.data.notes);
                }
            } catch {
                // A failed poll is not worth surfacing; the next one retries.
            }
        };

        const interval = setInterval(poll, 10000);
        poll();

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [hasOpenNotes, project.id, applyNotes]);

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

    // Save all pending visual edits directly to source code
    const handleSaveAllEdits = useCallback(async () => {
        if (pendingEdits.length === 0) return;

        for (const edit of pendingEdits) {
            const response = await axios.post<VisualEditResponse>(`/project/${project.id}/visual-edits`, {
                selector: edit.element.cssSelector,
                tagName: edit.element.tagName,
                field: edit.field,
                originalValue: edit.originalValue,
                newValue: edit.newValue,
            });

            if (response.data.needs_source_choice) {
                throw new Error(response.data.message || t('Choose the source file from the visual edit modal.'));
            }

            if (!response.data.success) {
                throw new Error(response.data.error || response.data.message || t('Failed to save changes'));
            }

            if (response.data.warning) {
                toast.warning(response.data.warning);
            }
        }

        setPendingEdits([]);
        setFileRefreshTrigger(value => value + 1);
        setPreviewRefreshTrigger(Date.now());
    }, [pendingEdits, project.id, t]);

    const handleVisualEditSaved = useCallback((_response: VisualEditResponse) => {
        setFileRefreshTrigger(value => value + 1);
        setPreviewRefreshTrigger(Date.now());
    }, []);

    const handleSourceChanged = useCallback(() => {
        setFileRefreshTrigger(value => value + 1);
        setPreviewRefreshTrigger(Date.now());
    }, []);

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
    const openRenameDialog = () => {
        setRenameValue(projectName);
        setRenameDialogOpen(true);
    };

    const submitRename = (e: FormEvent) => {
        e.preventDefault();
        if (renameValue.trim() === '') return;
        setIsRenaming(true);
        router.put(`/projects/${project.id}/rename`, { name: renameValue.trim() }, {
            preserveState: true,
            onSuccess: () => {
                setProjectName(renameValue.trim());
                setRenameDialogOpen(false);
                toast.success(t('Project renamed'));
            },
            onError: () => toast.error(t('Failed to rename project')),
            onFinish: () => setIsRenaming(false),
        });
    };

    const getStatusText = () => {
        if (progress.status === 'connecting') return t('Connecting...');
        if (progress.status === 'running') {
            if (currentAction) {
                return `${currentAction.action}: ${currentAction.target || ''}`.slice(0, 30);
            }
            return t('Updating preview...');
        }
        if (isLoading) return t('Assistant working...');
        return t('Ready');
    };

    return (
        <>
            <Head title={project.name} />
            <Toaster />

            {/* On md+ this is the familiar two-column row. On a phone it becomes
                a column: the panes take turns inside the wrapper below, and the
                bar at the bottom switches between them. The wrapper is
                display:contents on md+, so the two columns stay direct flex
                children of the row and the desktop layout is untouched. */}
            <div className="h-screen flex flex-col md:flex-row bg-background text-foreground">
                <div className="flex min-h-0 min-w-0 flex-1 md:contents">
                {/* Start: Chat Column - Full width on mobile, fixed width on larger screens */}
                <div
                    className={`w-full shrink-0 md:border-e md:flex flex-col transition-[width] duration-200 ${
                        mobilePane === 'chat' ? 'flex' : 'hidden'
                    } ${isChatCollapsed ? 'md:w-14' : 'md:w-[420px]'}`}
                >
                    {isChatCollapsed && (
                        <div className="hidden h-full min-h-0 flex-col items-center overflow-y-auto bg-background md:flex">
                            <div className="flex h-14 shrink-0 items-center justify-center border-b">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsChatCollapsed(false)}
                                    title={t('Expand chat panel')}
                                >
                                    <PanelLeftOpen className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex flex-1 flex-col items-center gap-1 py-2">
                                <Button
                                    variant={viewMode === 'preview' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('preview')}
                                    title={t('Preview')}
                                    className="h-9 w-9"
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'inspect' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('inspect')}
                                    title={t('Inspect')}
                                    className="h-9 w-9"
                                >
                                    <MousePointerClick className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'design' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('design')}
                                    title={t('Design')}
                                    className="h-9 w-9"
                                >
                                    <Palette className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'code' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('code')}
                                    title={t('Code')}
                                    className="h-9 w-9"
                                >
                                    <Code className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'settings' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('settings')}
                                    title={t('Settings')}
                                    className="h-9 w-9"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>

                                {viewMode === 'preview' && (
                                    <>
                                        <div className="my-1 h-px w-8 bg-border" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={async () => {
                                                playSound('build');
                                                await triggerBuild();
                                                setPreviewRefreshTrigger(Date.now());
                                            }}
                                            disabled={isBuildingPreview}
                                            title={t('Sync Preview')}
                                            className="h-9 w-9"
                                        >
                                            {isBuildingPreview ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Hammer className="h-4 w-4" />
                                            )}
                                        </Button>
                                        {progress.previewUrl && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => window.open(buildPublishedUrl(project.subdomain, baseDomain) || `/app/${project.id}`, '_blank')}
                                                    title={t('Open')}
                                                    className="h-9 w-9"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setPublishModalOpen(true)}
                                                    title={project.subdomain ? t('Published') : t('Publish')}
                                                    className="h-9 w-9"
                                                >
                                                    <Globe className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="flex shrink-0 flex-col items-center gap-1 border-t py-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={openRenameDialog}
                                    title={t('Rename project')}
                                    className="h-9 w-9"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <ThemeToggle />
                                <LanguageSelector align="start" />
                                <NotificationBell
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    onMarkAsRead={markAsRead}
                                    onMarkAllAsRead={markAllAsRead}
                                    isLoading={isLoadingNotifications}
                                    align="start"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setProjectsDialogOpen(true)}
                                    title={t('Projects')}
                                >
                                    <Home className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Chat Header */}
                    <div className={`h-14 px-4 border-b flex items-center justify-between shrink-0 bg-background ${isChatCollapsed ? 'md:hidden' : ''}`}>
                        <div className="min-w-0 flex-1 flex items-center gap-1">
                            <div className="min-w-0 flex-1">
                                {/* Abre los ajustes dentro de la misma pantalla, en las dos
                                    anchuras. En el móvil hay que traer además el panel de
                                    trabajo al frente, porque ahí las dos columnas se turnan. */}
                                <button
                                    onClick={() => { setViewMode('settings'); setMobilePane('work'); }}
                                    className="hover:underline text-start block w-full min-w-0"
                                >
                                    <h1 className="text-sm font-semibold truncate">
                                        {projectName}
                                    </h1>
                                </button>
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
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-6 w-6"
                                onClick={openRenameDialog}
                                title={t('Rename project')}
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="hidden md:inline-flex"
                                onClick={() => setIsChatCollapsed(true)}
                                title={t('Collapse chat panel')}
                            >
                                <PanelLeftClose className="h-4 w-4" />
                            </Button>
                            {/* Sólo en móvil: en escritorio los ajustes ya están en el
                                panel de trabajo. Lleva al mismo lugar que la pestaña
                                Ajustes de la barra de abajo — antes cada una abría algo
                                distinto. */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => { setViewMode('settings'); setMobilePane('work'); }}
                                title={t('Settings')}
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                            <NotificationBell
                                notifications={notifications}
                                unreadCount={unreadCount}
                                onMarkAsRead={markAsRead}
                                onMarkAllAsRead={markAllAsRead}
                                isLoading={isLoadingNotifications}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProjectsDialogOpen(true)}
                                title={t('Projects')}
                            >
                                <Home className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className={`flex min-h-0 flex-1 flex-col ${isChatCollapsed ? 'md:hidden' : ''}`}>
                    {/* Messages */}
                    {canUseAi && (
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-4 space-y-4">
                            {showBlankProjectPanelInConversation && (
                                <div className="animate-fade-in">
                                    <BlankProjectPanel
                                        projectId={project.id}
                                        previewUrl={project.preview_url}
                                        subdomain={project.subdomain}
                                        baseDomain={baseDomain}
                                    />
                                </div>
                            )}

                            {initialLoading && messages.length === 0 && !showBlankProjectPanelInConversation ? (
                                <MessageListSkeleton count={3} />
                            ) : messages.length === 0 && !isLoading && !showBlankProjectPanelInConversation ? (
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
                                        {t('Assistant offline, message not sent')}
                                    </p>
                                </div>
                            ))}

                            {/* Assistant working indicator */}
                            {canUseAi && isLoading && (
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
                    )}

                    {/* Floating suggestions - pinned to bottom of messages */}
                    {canUseAi && (isLoadingSuggestions || (suggestions.length > 0 && !isLoading)) && (
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
                        <div className="pb-1 flex flex-wrap items-center gap-2 justify-between">
                            {canUseAi && composerMode === 'ai' && (
                                <BuildCreditsIndicator {...credits} isRefreshing={isRefreshingCredits} />
                            )}
                            {composerMode === 'note' && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                                    <StickyNote className="h-3.5 w-3.5" />
                                    {project.ai_provider_available === false
                                        ? t('No AI provider is configured. Send saves the prompt for a connector.')
                                        : t('Saved for the connectors — the AI builder is not called')}
                                </span>
                            )}
                            <div className="flex-1" />
                            <div className="flex items-center gap-2">
                                {/* Lane switch. The AI side is the default and
                                    behaves exactly as before; the note side is
                                    purely additive. */}
                                {canUseAi && (
                                    <div className="flex items-center rounded-lg border p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setComposerMode('ai')}
                                            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                                composerMode === 'ai'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            title={t('Send to the AI builder')}
                                        >
                                            <Brain className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">{t('AI')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setComposerMode('note')}
                                            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                                composerMode === 'note'
                                                    ? 'bg-amber-500 text-white'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                            title={t('Save as a note for the connectors')}
                                        >
                                            <StickyNote className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">{t('Note')}</span>
                                        </button>
                                    </div>
                                )}
                                <ThemeToggle />
                                <LanguageSelector />
                            </div>
                        </div>
                        {showBlankProjectPanelInComposer && (
                            <div>
                                <BlankProjectPanel
                                    projectId={project.id}
                                    previewUrl={project.preview_url}
                                    subdomain={project.subdomain}
                                    baseDomain={baseDomain}
                                />
                            </div>
                        )}
                        <ChatInputWithMentions
                                value={prompt}
                                onChange={setPrompt}
                                onSubmit={composerMode === 'note' ? handleNoteSubmit : handleSubmit}
                                disabled={composerMode === 'note' ? isSavingNote : isLoading}
                                selectedElement={selectedElement}
                                onClearElement={() => setSelectedElement(null)}
                                placeholder={
                                    composerMode === 'note'
                                        ? t('Leave a note for the connectors — what should they do?')
                                        : t('Describe what you want to build...')
                                }
                                isLoading={composerMode === 'note' ? isSavingNote : isLoading}
                                onCancel={composerMode === 'note' ? undefined : cancelBuild}
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
                </div>

                {/* Right: Preview/Code column. On a phone it takes the whole
                    screen when selected from the bottom bar; on md+ it sits
                    beside the chat as before. */}
                <div className={`${mobilePane === 'work' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden min-w-0`}>
                    {/* Preview Header */}
                    {/* `isChatCollapsed` es cosa del escritorio: es el raíl lateral, que
                        ya lleva el selector de vista y las acciones. En el móvil ese raíl
                        no existe y nada puede desplegarlo, así que dejar que ese estado
                        ocultara esta cabecera escondía para siempre publicar, abrir y
                        sincronizar. Acá abajo siempre se ve. */}
                    <div className={`h-14 px-4 border-b items-center justify-between shrink-0 bg-background flex ${isChatCollapsed ? 'md:hidden' : 'md:flex'}`}>
                        {/* View toggle */}
                        <div className="flex items-center border rounded-lg overflow-x-auto max-w-full [&>button]:shrink-0 [&>div]:shrink-0">
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
                                onClick={() => setViewMode('structure')}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all ${
                                    viewMode === 'structure'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <Rows3 className="h-4 w-4" />
                                {t('Structure')}
                            </button>
                            <div className="w-px h-6 bg-border" />
                            <button
                                onClick={() => setViewMode('design')}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all ${
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
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all ${
                                    viewMode === 'code'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <Code className="h-4 w-4" />
                                {t('Code')}
                            </button>
                            <button
                                onClick={() => setViewMode('history')}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all ${
                                    viewMode === 'history'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                <History className="h-4 w-4" />
                                {t('History')}
                            </button>
                            <div className="w-px h-6 bg-border" />
                            <button
                                onClick={() => setViewMode('settings')}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all ${
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
                                        {t('Sync Preview')}
                                    </Button>
                                    {progress.previewUrl && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(buildPublishedUrl(project.subdomain, baseDomain) || `/app/${project.id}`, '_blank')}
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
                        ) : viewMode === 'history' ? (
                            <ProjectHistoryPanel
                                projectId={project.id}
                                onRestored={handleSourceChanged}
                            />
                        ) : viewMode === 'structure' ? (
                            <div className="flex h-full">
                                <div className="w-80 shrink-0 border-e">
                                    <ProjectStructurePanel
                                        projectId={project.id}
                                        onSourceChanged={handleSourceChanged}
                                        onOpenCode={(path) => {
                                            setSelectedFile(path);
                                            setViewMode('code');
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <InspectPreview
                                        projectId={project.id}
                                        mode="preview"
                                        previewUrl={progress.previewUrl}
                                        refreshTrigger={previewRefreshTrigger}
                                        isBuilding={isBuildingPreview}
                                        captureThumbnailTrigger={captureThumbnailTrigger}
                                    />
                                </div>
                            </div>
                        ) : viewMode === 'code' ? (
                            /* Side by side on md+. On a phone a 224px tree next
                               to an editor leaves ~150px of code, so the two
                               take turns: the tree until a file is picked, then
                               the editor with a way back. */
                            <div className="flex h-full min-w-0">
                                {/* File Tree */}
                                <div
                                    className={`${selectedFile ? 'hidden' : 'block'} w-full shrink-0 border-e md:block md:w-56`}
                                >
                                    <FileTree
                                        projectId={project.id}
                                        onFileSelect={setSelectedFile}
                                        selectedFile={selectedFile}
                                        refreshTrigger={fileRefreshTrigger}
                                    />
                                </div>
                                {/* Code Editor */}
                                <div
                                    className={`${selectedFile ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col overflow-hidden md:flex`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFile(null)}
                                        className="flex shrink-0 items-center gap-1.5 border-b px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground md:hidden"
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5" />
                                        {t('Files')}
                                    </button>
                                    <div className="min-h-0 flex-1 overflow-hidden">
                                        <CodeEditor
                                            projectId={project.id}
                                            selectedFile={selectedFile}
                                            allowProtectedEdits={project.type === 'blank'}
                                            refreshTrigger={fileRefreshTrigger}
                                            onSave={() => setFileRefreshTrigger(tf => tf + 1)}
                                        />
                                    </div>
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
                                onVisualEditSaved={handleVisualEditSaved}
                                onProjectFileUploaded={handleVisualProjectFileUploaded}
                                onThemeSelect={applyThemeToPreview}
                                isSavingTheme={isSavingTheme}
                                currentTheme={appliedTheme}
                                themeDesignerSlot={
                                    <ThemeDesigner
                                        currentTheme={appliedTheme}
                                        onThemeSelect={applyThemeToPreview}
                                        projectId={project.id}
                                        onColorsChanged={handleSourceChanged}
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

                {/* Mobile-only pane switcher. Without it the work column is
                    unreachable from a phone — it used to be display:none. */}
                <nav className="flex shrink-0 border-t bg-background md:hidden">
                    {[
                        { key: 'chat' as const, label: t('Chat'), icon: MessageSquare, onPick: () => setMobilePane('chat') },
                        { key: 'preview' as const, label: t('Preview'), icon: Eye, onPick: () => { setViewMode('preview'); setMobilePane('work'); } },
                        { key: 'code' as const, label: t('Code'), icon: Code, onPick: () => { setViewMode('code'); setMobilePane('work'); } },
                        { key: 'settings' as const, label: t('Settings'), icon: Settings, onPick: () => { setViewMode('settings'); setMobilePane('work'); } },
                    ].map(item => {
                        const Icon = item.icon;
                        const active = item.key === 'chat'
                            ? mobilePane === 'chat'
                            : mobilePane === 'work' && viewMode === item.key;

                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={item.onPick}
                                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                                    active ? 'text-primary' : 'text-muted-foreground'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <ProjectsDialog
                open={projectsDialogOpen}
                onOpenChange={setProjectsDialogOpen}
                currentProjectId={project.id}
            />

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Rename project')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitRename} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="chat-project-name">{t('Project name')}</Label>
                            <Input
                                id="chat-project-name"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                autoFocus
                                maxLength={255}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRenameDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={isRenaming || renameValue.trim() === ''}>
                                {isRenaming ? t('Saving...') : t('Save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
