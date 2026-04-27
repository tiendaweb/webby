import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/Markdown/MarkdownRenderer';
import { Edit2, ArrowRight, Image, Paperclip } from 'lucide-react';
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

export function MessageBubble({ message }: MessageBubbleProps) {
    const { t } = useTranslation();
    const isUser = message.type === 'user';
    const isActivity = message.type === 'activity';

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
