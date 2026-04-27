/**
 * Detects if a string contains markdown syntax
 * @param content - The string to check
 * @returns true if the content contains markdown patterns
 */
export function containsMarkdown(content: string): boolean {
    if (!content || content.trim().length === 0) {
        return false;
    }

    // Regex patterns for common markdown syntax
    const patterns = [
        /^#{1,6}\s+/m,           // Headers: ##, ###, etc.
        /\*\*.*?\*\*/,           // Bold: **text**
        /(?:^|\s)\*[^*]+\*(?:\s|$)/m,  // Italic: *text* with word boundaries
        /```.*?```/s,            // Code blocks
        /`[^`]+`/,               // Inline code
        /^\s*[-*+]\s+/m,         // Unordered lists: -, *, +
        /^\s*\d+\.\s+/m,         // Ordered lists: 1., 2., etc.
        /\[.*?\]\(.*?\)/,        // Links: [text](url)
        /^\s*>\s+/m,             // Blockquotes: >
    ];

    return patterns.some(pattern => pattern.test(content));
}
