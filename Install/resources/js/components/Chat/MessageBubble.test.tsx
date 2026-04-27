import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '@/types/chat';

describe('MessageBubble', () => {
    it('renders user message content', () => {
        const message: ChatMessage = {
            id: '1',
            type: 'user',
            content: 'Hello, AI!',
            timestamp: new Date(),
        };

        render(<MessageBubble message={message} />);

        expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
    });

    it('renders assistant message content', () => {
        const message: ChatMessage = {
            id: '2',
            type: 'assistant',
            content: 'Hello! How can I help you?',
            timestamp: new Date(),
        };

        render(<MessageBubble message={message} />);

        expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    });

    it('shows AI avatar for assistant messages', () => {
        const message: ChatMessage = {
            id: '2',
            type: 'assistant',
            content: 'Test response',
            timestamp: new Date(),
        };

        render(<MessageBubble message={message} />);

        expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('does not show avatar for user messages', () => {
        const message: ChatMessage = {
            id: '1',
            type: 'user',
            content: 'Test message',
            timestamp: new Date(),
        };

        render(<MessageBubble message={message} />);

        expect(screen.queryByText('AI')).not.toBeInTheDocument();
    });

    it('preserves whitespace in message content', () => {
        const message: ChatMessage = {
            id: '1',
            type: 'user',
            content: 'Line 1\nLine 2\nLine 3',
            timestamp: new Date(),
        };

        render(<MessageBubble message={message} />);

        const textElement = screen.getByText(/Line 1/);
        expect(textElement).toHaveClass('whitespace-pre-wrap');
    });

    describe('Markdown Support', () => {
        it('renders markdown in assistant messages', () => {
            const message: ChatMessage = {
                id: '1',
                type: 'assistant',
                content: '## Header\nThis is **bold** text',
                timestamp: new Date(),
            };
            render(<MessageBubble message={message} />);
            expect(screen.getByText('Header')).toBeInTheDocument();
            expect(screen.getByText('bold')).toBeInTheDocument();
        });

        it('renders markdown in user messages', () => {
            const message: ChatMessage = {
                id: '2',
                type: 'user',
                content: '**Bold message**',
                timestamp: new Date(),
            };
            render(<MessageBubble message={message} />);
            expect(screen.getByText('Bold message')).toBeInTheDocument();
        });

        it('renders plain text without markdown as-is', () => {
            const message: ChatMessage = {
                id: '3',
                type: 'assistant',
                content: 'Just plain text, no markdown',
                timestamp: new Date(),
            };
            render(<MessageBubble message={message} />);
            expect(screen.getByText('Just plain text, no markdown')).toBeInTheDocument();
        });
    });
});
