import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';
import { containsMarkdown } from '@/lib/markdown';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

/**
 * Renders markdown or plain text with auto-detection
 * - Auto-detects markdown syntax
 * - Sanitizes HTML for XSS protection
 * - Uses shadcn/ui design tokens via prose classes
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    // If no markdown detected, render as plain text
    if (!containsMarkdown(content)) {
        return (
            <p className={cn('text-sm whitespace-pre-wrap break-words', className)}>
                {content}
            </p>
        );
    }

    return (
        <div className={cn(
            'prose prose-sm dark:prose-invert max-w-none break-words',
            'prose-headings:font-semibold prose-headings:text-foreground',
            'prose-p:text-muted-foreground prose-p:leading-relaxed',
            'prose-strong:text-foreground prose-strong:font-semibold',
            'prose-code:bg-muted prose-code:text-foreground prose-code:border prose-code:border-border prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-medium',
            'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:overflow-x-auto',
            'prose-pre:[&_code]:border-0 prose-pre:[&_code]:bg-transparent prose-pre:[&_code]:p-0 prose-pre:[&_code]:font-normal',
            'prose-table:block prose-table:overflow-x-auto',
            'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
            'prose-ul:text-muted-foreground prose-ol:text-muted-foreground',
            'prose-li:marker:text-muted-foreground',
            className
        )}>
            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
