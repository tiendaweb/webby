import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
    it('renders plain text when no markdown detected', () => {
        render(<MarkdownRenderer content="Hello world" />);
        expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders markdown headers', () => {
        render(<MarkdownRenderer content="## Title" />);
        expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('renders markdown bold text', () => {
        render(<MarkdownRenderer content="This is **bold** text" />);
        expect(screen.getByText('bold')).toBeInTheDocument();
    });

    it('renders markdown lists', () => {
        const content = `* Item 1
* Item 2`;
        render(<MarkdownRenderer content={content} />);
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('sanitizes XSS attempts', () => {
        render(<MarkdownRenderer content="<script>alert('xss')</script>" />);
        expect(screen.queryByText('alert')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(
            <MarkdownRenderer content="Test" className="custom-class" />
        );
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('preserves whitespace in plain text', () => {
        render(<MarkdownRenderer content="Line 1\nLine 2" />);
        const text = screen.getByText(/Line 1/);
        expect(text).toHaveClass('whitespace-pre-wrap');
    });

    it('renders markdown links', () => {
        render(<MarkdownRenderer content="[Link text](https://example.com)" />);
        expect(screen.getByText('Link text')).toBeInTheDocument();
    });

    it('renders inline code', () => {
        render(<MarkdownRenderer content="This is `code` here" />);
        expect(screen.getByText('code')).toBeInTheDocument();
    });
});
