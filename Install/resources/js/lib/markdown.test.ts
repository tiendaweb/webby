import { describe, it, expect } from 'vitest';
import { containsMarkdown } from './markdown';

describe('containsMarkdown', () => {
    it('returns false for empty string', () => {
        expect(containsMarkdown('')).toBe(false);
    });

    it('returns false for plain text', () => {
        expect(containsMarkdown('Hello world')).toBe(false);
    });

    it('returns true for headers (###)', () => {
        expect(containsMarkdown('## Title')).toBe(true);
    });

    it('returns true for bold (**text**)', () => {
        expect(containsMarkdown('**bold**')).toBe(true);
    });

    it('returns true for italic (*text*)', () => {
        expect(containsMarkdown('*italic*')).toBe(true);
    });

    it('returns true for lists (- item)', () => {
        expect(containsMarkdown('- Item 1')).toBe(true);
    });

    it('returns true for code blocks (```)', () => {
        expect(containsMarkdown('```code```')).toBe(true);
    });

    it('returns true for links [text](url)', () => {
        expect(containsMarkdown('[link](https://example.com)')).toBe(true);
    });

    it('returns true for inline code (`code`)', () => {
        expect(containsMarkdown('`code`')).toBe(true);
    });

    it('returns true for numbered lists (1.)', () => {
        expect(containsMarkdown('1. First item')).toBe(true);
    });

    it('handles multiline content', () => {
        expect(containsMarkdown('Plain text\n## Header\nMore text')).toBe(true);
    });

    it('returns false for asterisk without space (not markdown list)', () => {
        expect(containsMarkdown('this*is*not')).toBe(false);
    });

    it('returns true for blockquotes (> text)', () => {
        expect(containsMarkdown('> Quote text')).toBe(true);
    });
});
