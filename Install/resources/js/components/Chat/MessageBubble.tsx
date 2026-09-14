import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/Markdown/MarkdownRenderer';
import { Edit2, ArrowRight, Image, Paperclip, StickyNote, Plug, Clock, Loader2, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { translateBuilderMessage } from '@/lib/builderTranslations';

interface MessageBubbleProps {
    message: ChatMessage;
}

/**
 * Parse and render batch edit messages with nice styling.
 */
function BatchEditMessage({ content, t }: { content: string; t: (key: string, replacements?: Record<string, string | number>) => string }) {
    // Parse the batch edit message
    // Format: [BATCH_EDIT] Update multiple elements:\n1. <tagSelector>: "old" → "new"
    const lines = content.split('\n');
    const edits = lines.slice(1).map(line => {
        // Parse: 1. <h1.text-5xl>: "old" → "new"
        // Or: 1. <img> src: "old" → "new"
        const match = line.match(/^\d+\.\s*<([^>]+)>(?:\s*([^:]+))?:\s*"([^"]*)".*?"([^"]*)"$/);
        if (match) {
            return {
                selector: match[1],
                field: match[2]?.trim() || 'text',
                oldValue: match[3],
                newValue: match[4],
            };
        }
        return null;
    }).filter(Boolean);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/80">
                <Edit2 className="h-3.5 w-3.5" />
                <span>{t('Batch Edit')}</span>
                <span className="bg-primary-foreground/20 px-1.5 py-0.5 rounded text-[10px]">
                    {edits.length} {edits.length === 1 ? t('change') : t('changes')}
                </span>
            </div>
            <div className="space-y-1.5">
                {edits.map((edit, i) => (
                    <div key={i} className="bg-primary-foreground/10 rounded-lg px-3 py-2 text-xs">
                        <div className="flex items-center gap-1.5 text-primary-foreground/70 mb-1">
                            <code className="bg-primary-foreground/10 px-1.5 py-0.5 rounded text-[10px]">
                                {edit!.selector}
                            </code>
                            {edit!.field !== 'text' && (
                                <span className="text-primary-foreground/50">{edit!.field}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-primary-foreground/60 line-through truncate max-w-[120px]" title={edit!.oldValue}>
                                {edit!.oldValue.length > 20 ? edit!.oldValue.slice(0, 20) + '...' : edit!.oldValue}
                            </span>
                            <ArrowRight className="h-3 w-3 text-primary-foreground/50 shrink-0" />
                            <span className="text-primary-foreground font-medium truncate max-w-[120px]" title={edit!.newValue}>
                                {edit!.newValue.length > 20 ? edit!.newValue.slice(0, 20) + '...' : edit!.newValue}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getActivityIcon(activityType?: string): string {
    switch (activityType) {
        case 'creating':
            return '✨';
        case 'editing':
            return '✏️';
        case 'reading':
            return '📖';
        case 'exploring':
            return '🔍';
        case 'thinking':
            return '💭';
        case 'verifying':
            return '✅';
        case 'building':
            return '🔨';
        case 'compacting':
        case 'summarizing':
            return '✂️';
        default:
            return '⚡️';
    }
}

/**
 * Status chip for a connector note. Deliberately readable at a glance —
 * the owner's whole question about a note is "did anything happen yet".
 */
function NoteStatusBadge({ status, t }: { status?: string; t: (key: string) => string }) {
    const config: Record<string, { label: string; icon: typeof Clock; className: string }> = {
        pending: { label: t('waiting for a connector'), icon: Clock, className: 'text-amber-600 dark:text-amber-400' },
        in_progress: { label: t('a connector is on it'), icon: Loader2, className: 'text-blue-600 dark:text-blue-400' },
        done: { label: t('done'), icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
        failed: { label: t('failed'), icon: XCircle, className: 'text-destructive' },
        cancelled: { label: t('cancelled'), icon: Ban, className: 'text-muted-foreground' },
    };

    const entry = config[status ?? 'pending'] ?? config.pending;
    const Icon = entry.icon;

    return (
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', entry.className)}>
            <Icon className={cn('h-3 w-3', status === 'in_progress' && 'animate-spin')} />
            {entry.label}
        </span>
    );
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const { t } = useTranslation();
    const isUser = message.type === 'user';
    const isActivity = message.type === 'activity';

    // A note: written by the owner but addressed to a connector, not to the
    // AI builder. Sits on the owner's side of the thread, styled apart from
    // a normal message so it never reads as "I asked the AI to do this".
    if (message.type === 'note') {
        return (
            <div className="flex justify-end animate-fade-in">
                <div className="max-w-[85%] min-w-0 overflow-hidden rounded-2xl ltr:rounded-br-md rtl:rounded-bl-md border border-dashed border-amber-500/60 bg-amber-500/10 px-4 py-2 break-words">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                            <StickyNote className="h-3.5 w-3.5" />
                            {t('Note for connectors')}
                        </span>
                        <NoteStatusBadge status={message.noteStatus} t={t} />
                    </div>
                    {message.attachedFiles && message.attachedFiles.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                            {message.attachedFiles.map(file => (
                                <span key={file.id} className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium">
                                    {file.is_image ? <Image className="h-3 w-3 shrink-0" /> : <Paperclip className="h-3 w-3 shrink-0" />}
                                    <span className="max-w-[100px] truncate">{file.filename}</span>
                                </span>
                            ))}
                        </div>
                    )}
                    <MarkdownRenderer content={message.content} />
                </div>
            </div>
        );
    }

    // A connector's answer. Occupies the assistant slot on purpose: this is
    // the reply to the note, and it was written by whatever assistant did
    // the work rather than by the platform's builder.
    if (message.type === 'noteResult') {
        const failed = message.noteStatus === 'failed';

        return (
            <div className="flex justify-start gap-3 animate-fade-in">
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={cn('text-xs', failed ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-600 text-white')}>
                        <Plug className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>
                <div
                    className={cn(
                        'max-w-[85%] min-w-0 overflow-hidden rounded-2xl ltr:rounded-bl-md rtl:rounded-br-md border px-4 py-2 shadow-sm break-words',
                        failed ? 'border-destructive/40 bg-destructive/5' : 'border-emerald-600/30 bg-emerald-500/5'
                    )}
                >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {message.noteSource
                                ? t('Answered by the connector') + ' · ' + message.noteSource
                                : t('Answered by the connector')}
                        </span>
                        <NoteStatusBadge status={message.noteStatus} t={t} />
                    </div>
                    <MarkdownRenderer content={message.content} />
                    {message.noteData && Object.keys(message.noteData).length > 0 && (
                        <details className="mt-2">
                            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                                {t('Details')}
                            </summary>
                            <pre className="mt-1 overflow-x-auto rounded-md bg-muted/60 p-2 text-[11px]">
                                {JSON.stringify(message.noteData, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            </div>
        );
    }

    if (isUser) {
        const isBatchEdit = message.content.startsWith('[BATCH_EDIT]');

        return (
            <div className="flex justify-end animate-fade-in">
                <div
                    className={cn(
                        'max-w-[85%] min-w-0 overflow-hidden px-4 py-2 rounded-2xl ltr:rounded-br-md rtl:rounded-bl-md break-words',
                        'bg-primary text-primary-foreground'
                    )}
                >
                    {message.attachedFiles && message.attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {message.attachedFiles.map(file => (
                                <span key={file.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-foreground/15 rounded-md text-xs font-medium">
                                    {file.is_image ? <Image className="h-3 w-3 shrink-0" /> : <Paperclip className="h-3 w-3 shrink-0" />}
                                    <span className="truncate max-w-[100px]">{file.filename}</span>
                                </span>
                            ))}
                        </div>
                    )}
                    {isBatchEdit ? (
                        <BatchEditMessage content={message.content} t={t} />
                    ) : (
                        <MarkdownRenderer content={message.content} />
                    )}
                </div>
            </div>
        );
    }

    // Activity messages - show as compact AI action bubbles (like prototype)
    if (isActivity) {
        return (
            <div className="flex justify-start animate-fade-in">
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-1">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                        {getActivityIcon(message.activityType)}
                    </span>
                    <span className="italic">{translateBuilderMessage(message.content, t)}</span>
                </div>
            </div>
        );
    }

    // Assistant messages
    return (
        <div className="flex justify-start gap-3 animate-fade-in">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    AI
                </AvatarFallback>
            </Avatar>
            <div
                className={cn(
                    'max-w-[85%] min-w-0 overflow-hidden px-4 py-2 rounded-2xl ltr:rounded-bl-md rtl:rounded-br-md break-words',
                    'bg-card text-card-foreground border border-border shadow-sm'
                )}
            >
                <MarkdownRenderer content={message.content} />
            </div>
        </div>
    );
}
